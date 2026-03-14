import pandas as pd
import requests
import re
import time
import os
import json
import math

# ── 使用腳本所在位置往上一層作為根目錄（因腳本放在 scripts/）──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, 'data')
os.makedirs(_DATA_DIR, exist_ok=True)

# INPUT_FILE  = os.path.join(_DATA_DIR, '2021-2025_推薦評分.xlsx')
# OUTPUT_FILE = os.path.join(_DATA_DIR, '2021-2025_推薦評分.xlsx')
INPUT_FILE  = os.path.join(_DATA_DIR, '2021-2025_推薦v2.xlsx')
OUTPUT_FILE = os.path.join(_DATA_DIR, '2021-2025_推薦v2.xlsx')

# ============================================================
# 1. 讀取原始資料 (從 Supabase)
# ============================================================

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
TABLE_NAME = 'stocks'

if not SUPABASE_KEY:
    print("WARNING: SUPABASE_SERVICE_KEY not set. Cannot fetch from or write to Supabase.")
    # 如果沒設定 KEY 為了避免整個腳本爛掉，嘗試退回讀取 Excel，但此腳本主要應由 GitHub Actions 執行
    df = pd.read_excel(INPUT_FILE)
else:
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=*"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                print(f"Loaded {len(data)} rows from Supabase")
                df = pd.DataFrame(data)
                # 將 Supabase 欄位對應回原本腳本用的中文欄位名稱
                rename_map = {
                    'stock_id': '股號', 'name': '公司', 'price': '最近股價',
                    'gift': '上次紀念品', 'freq': '五年內發放次數', 'cp': '舊版性價比',
                    'score': '舊版推薦評分', 'five_year_gifts': '五年發放紀念品',
                    'cond': '去年條件', 'gift_value': '紀念品預估價值',
                    'five_year_total': '五年紀念品總估值', 'last_issued': '最近一次發放'
                }
                df = df.rename(columns=rename_map)
            else:
                print("Supabase returned empty data, falling back to Excel.")
                df = pd.read_excel(INPUT_FILE)
        else:
            print(f"Failed to fetch from Supabase (Status: {resp.status_code}), falling back to Excel.")
            df = pd.read_excel(INPUT_FILE)
    except Exception as e:
        print(f"Supabase request error: {e}, falling back to Excel.")
        df = pd.read_excel(INPUT_FILE)

df.columns = df.columns.astype(str)

if '上次紀念品' in df.columns:
    df['上次紀念品'] = df['上次紀念品'].astype(str).replace('nan', '')
if '去年條件' in df.columns:
    df['去年條件'] = df['去年條件'].astype(str).replace('nan', '')
if '股號' in df.columns:
    df['股號'] = df['股號'].astype(str).str.strip()

print(f"Ready to evaluate {len(df)} rows")

# ============================================================
# 2. 從 OpenAPI 抓取最新收盤價 (上市 + 上櫃)
# ============================================================
def get_latest_market_data():
    """抓取全台股最新收盤價 (上市 + 上櫃)"""
    print("正在從 OpenAPI 抓取全台股最新收盤價...")
    
    # --- 1. 抓取上市 (TWSE) ---
    try:
        twse_url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
        twse_data = requests.get(twse_url, timeout=30).json()
        df_twse = pd.DataFrame(twse_data)
        df_twse = df_twse[['Code', 'Name', 'ClosingPrice']].rename(columns={'ClosingPrice': 'Price'})
        print(f"  -> TWSE: 抓取到 {len(df_twse)} 筆")
    except Exception as e:
        print(f"  [Error] TWSE OpenAPI 失敗: {e}")
        df_twse = pd.DataFrame(columns=['Code', 'Name', 'Price'])

    # --- 2. 抓取上櫃 (TPEx) ---
    try:
        tpex_url = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
        tpex_data = requests.get(tpex_url, timeout=30).json()
        df_tpex = pd.DataFrame(tpex_data)
        df_tpex = df_tpex[['SecCode', 'SecName', 'Close']].rename(columns={
            'SecCode': 'Code', 
            'SecName': 'Name', 
            'Close': 'Price'
        })
        print(f"  -> TPEx: 抓取到 {len(df_tpex)} 筆")
    except Exception as e:
        print(f"  [Error] TPEx OpenAPI 失敗: {e}")
        df_tpex = pd.DataFrame(columns=['Code', 'Name', 'Price'])

    # --- 3. 合併與清理 ---
    df_all = pd.concat([df_twse, df_tpex], ignore_index=True)
    
    # 轉為數字型態，處理千分位
    df_all['Price'] = pd.to_numeric(df_all['Price'].astype(str).str.replace(',', ''), errors='coerce')
    
    # 轉成 Dictionary { 'Code': Price }
    price_dict = df_all.set_index('Code')['Price'].to_dict()
    return price_dict

price_dict = get_latest_market_data()
print(f"Total unique prices fetched: {len(price_dict)}")

# ============================================================
# 3. 紀念品估值邏輯
# ============================================================
def estimate_gift_value(gift_name):
    """
    紀念品估值模型 v2 — 參考市場行情的分類估值
    優先順序：精確金額 > 特殊高價品 > 分類關鍵字 > 預設值
    """
    if not gift_name or gift_name in ['無', '-', '未發放', '不發放', 'nan', '']:
        return 0
    
    gift = str(gift_name).strip()
    
    # ─── 第一層：直接抓取金額 ───
    # 「XX元」「$XX」
    m = re.search(r'(\d[\d,]*)元', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'\$\s*(\d[\d,]*)', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    # 「抵用券 XXX」
    m = re.search(r'抵用券.*?(\d[\d,]*)', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    # 「禮物卡」「商品卡」「提貨券」（金額已在前面被抓走，這裡是沒標金額的）
    if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券']):
        return 100  # 未標金額的卡券，保守估 100

    # ─── 第二層：特殊高價神股（市場實際調查） ───
    # 大魯閣：零股股東可獲 800元消費抵用券 + 8張買1送1券
    #         整包二手轉售約 800~1000 元，零股實際可用價值約 800 元
    if '大魯閣' in gift:
        return 800
    # 王品：零股股東大禮包含 200元紙本券 + 12張APP每月200元電子券 + 2張購物網200元券
    #       面額 3000 元，但電子券有消費門檻1000元才折200，二手整包轉售約 400 元
    if '王品' in gift:
        return 400
    # 六福村：贈送1張主題樂園門票，門票市價 1199 元
    if '六福村' in gift or '六福' in gift:
        return 1199
    # 佐登妮絲：城堡免費入園優惠（含本人最多10位親友），最高價值 2000 元
    #           但對個人實際使用而言，單人入園門票約 300 元
    if '佐登妮絲' in gift:
        return 300

def get_yahoo_price(symbol):
    """Yahoo Finance 備援機制 (針對 API 較不穩定的週末或節假日)"""
    for suffix in ['.TW', '.TWO']:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}{suffix}?interval=1d&range=1d"
        headers = {'User-Agent': 'Mozilla/5.0'}
        try:
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                data = r.json()
                price = data['chart']['result'][0]['meta']['regularMarketPrice']
                return float(price)
        except:
            pass
    return None

    # ─── 第三層：細分類估值（市場行情） ───
    
    # 【食品/調味料類】 市價 30~80 元
    food_keywords = ['火鍋', '鍋燒', '湯麵', '拌麵', '泡麵', '麵線', '乾麵',
                     '醬油', '醋', '油膏', '辣椒醬', '甘醬', '沾醬', '調味',
                     '米粉', '冬粉', '米果', '餅乾', '蛋捲', '堅果', '果乾',
                     '茶葉', '茶包', '咖啡', '即溶', '沖泡', '飲品',
                     '果凍', '布丁', '巧克力', '糖果', '零食',
                     '酸白菜', '泡菜', '罐頭', '肉鬆', '肉醬',
                     '牛軋糖', '鳳梨酥', '太陽餅', '麻糬', '方塊酥',
                     '料理包', '調理包', '即食', '沖泡包']
    if any(k in gift for k in food_keywords):
        return 50
    
    # 【食用油類】 市價 80~200 元
    if any(k in gift for k in ['橄欖油', '葵花油', '葵花籽油', '苦茶油', '食用油', '沙拉油', '麻油', '香油', '籽油']):
        return 120
    
    # 【米/穀物類】 市價 40~80 元（通常是小包裝）
    if any(k in gift for k in ['低碳米', '白米', '有機米', '稻米', '香米', '糙米']):
        if '米' in gift and '洗米' not in gift:
            return 60
    if '米' == gift:
        return 60
    
    # 【洗劑/清潔類】 市價 30~80 元
    clean_keywords = ['洗衣', '洗碗', '洗潔', '清潔劑', '小蘇打', '漂白',
                      '柔軟精', '衣物', '地板清潔', '廚房清潔', '管家']
    if any(k in gift for k in clean_keywords):
        return 50
    
    # 【個人衛生/美容類】 市價 30~100 元
    hygiene_keywords = ['香皂', '肥皂', '手工皂', '洗手乳', '沐浴乳', '沐浴露',
                        '洗髮', '潤髮', '護髮', '洗面', '洗臉', '潔面',
                        '牙膏', '牙刷', '漱口水',
                        '面膜', '保養', '精華', '乳液', '面霜', '防曬',
                        '卸妝', '化妝', '美容', '染髮']
    if any(k in gift for k in hygiene_keywords):
        return 60
    
    # 【濕紙巾/紙類】 市價 20~50 元
    if any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '紙巾', '抽取式']):
        return 30
    
    # 【保健/營養品】 市價 50~200 元
    health_keywords = ['膠囊', '維生素', '維他命', 'B群', '葉黃素', '益生菌',
                       '保健', '營養', '人蔘', '靈芝', '雞精', '滴雞精',
                       '口腔噴霧', '防護噴霧', 'D3']
    if any(k in gift for k in health_keywords):
        return 100
    
    # 【不鏽鋼餐具/廚房用品】 市價 80~200 元
    kitchenware_keywords = ['不鏽鋼', '不銹鋼', '不?鋼',  # 不鏽鋼有時候亂碼
                            '餐具組', '筷子', '湯匙', '叉子',
                            '砧板', '刀具', '菜刀', '剪刀',
                            '保鮮盒', '玻璃盒', '保鮮', '便當盒']
    if any(k in gift for k in kitchenware_keywords):
        return 120
    
    # 【鍋具類（真正的鍋）】 市價 150~500 元
    # 注意排除「火鍋湯」「鍋燒麵」等食品（已在食品類先處理了）
    if any(k in gift for k in ['炒鍋', '湯鍋', '平底鍋', '陶鍋', '鑄鐵鍋', '不沾鍋', '燉鍋']):
        return 300
    if '鍋' in gift and not any(f in gift for f in ['火鍋', '鍋燒', '鍋貼']):
        return 200
    
    # 【杯/碗類】 市價 50~150 元
    if any(k in gift for k in ['保溫杯', '保溫瓶', '悶燒罐', '悶燒杯', '保溫壺']):
        return 150
    if any(k in gift for k in ['馬克杯', '咖啡杯', '水杯', '玻璃杯', '野營杯', '隨行杯']):
        return 80
    if '杯' in gift:
        return 80
    if '碗' in gift:
        return 60
    
    # 【袋/包/收納類】 市價 50~200 元
    if any(k in gift for k in ['保溫袋', '保冷袋', '野餐袋']):
        return 100
    if any(k in gift for k in ['後背包', '旅行袋', '行李袋', '收納箱']):
        return 200
    if any(k in gift for k in ['購物袋', '環保袋', '提袋', '手提袋', '麻袋', '黃麻']):
        return 50
    if any(k in gift for k in ['收納袋', '束口袋', '夾鏈袋', '保鮮袋', '收納包']):
        return 40
    if '袋' in gift or '包' in gift:
        return 60
    
    # 【毯/毛巾/紡織類】 市價 80~300 元
    if any(k in gift for k in ['蓋毯', '毛毯', '毯子', '法蘭絨', '被']):
        return 200
    if any(k in gift for k in ['浴巾', '大毛巾']):
        return 120
    if any(k in gift for k in ['毛巾', '擦手巾', '方巾', '運動巾']):
        return 60
    if any(k in gift for k in ['圍巾', '圍脖', '脖圍', '羊毛']):
        return 150
    if any(k in gift for k in ['襪', '口罩']):
        return 40
    
    # 【傘/戶外類】 市價 100~300 元
    if any(k in gift for k in ['雨傘', '摺疊傘', '自動傘', '晴雨傘']):
        return 150
    if '傘' in gift:
        return 120
    if any(k in gift for k in ['露營', '登山', '野營']):
        return 100
    if any(k in gift for k in ['外套', '夾克', '背心', '風衣']):
        return 250
    if any(k in gift for k in ['椅', '摺疊椅', '野餐']):
        return 200
    
    # 【3C/文具類】 市價 50~200 元
    if any(k in gift for k in ['隨身碟', 'USB', '充電', '行動電源']):
        return 150
    if any(k in gift for k in ['手電筒', 'LED', '照明']):
        return 80
    if any(k in gift for k in ['原子筆', '鋼筆', '筆記本', '文具']):
        return 30
    if any(k in gift for k in ['計算機', '溫度計', '量測']):
        return 60
    
    # 【膠帶/工具類】 市價 20~80 元
    if any(k in gift for k in ['膠帶', '工具組', '螺絲', '扳手']):
        return 60
    
    val = 40  # 其他未分類品項，保守估 40 元
    
    # 【聯名款加成】 修正係數 1.2 (20%)
    co_branding_keywords = ['聯名', '合作', 'Kitty', '史努比', 'Snoopy', '咖波', '迪士尼', 'Disney', '拉拉熊', '角落小夥伴', '卡娜赫拉']
    if any(k.lower() in gift.lower() for k in co_branding_keywords):
        val = int(val * 1.2)
        
    return val

# ============================================================
# 4. 計算推薦評分
# ============================================================
print("Calculating CP scores...")
df['最近股價'] = df['股號'].map(price_dict)

# 最後兜底：填 0.0
df['最近股價'] = df['最近股價'].fillna(0.0).round(2)

# 統計來源
yahoo_count = int(df['股號'].map(price_dict).notna().sum())
zero_stocks = df[df['最近股價'] == 0]['股號'].tolist()

if zero_stocks:
    print(f"  [INFO] Attempting to fix {len(zero_stocks)} zero prices via Yahoo Finance for Supabase sync...")
    for sid in zero_stocks:
        y_price = get_yahoo_price(sid)
        if y_price:
            df.loc[df['股號'] == sid, '最近股價'] = y_price
            price_dict[sid] = y_price

still_zero = int((df['最近股價'] == 0).sum())
print(f"  -> OpenAPI API: {yahoo_count}, Fixed via Yahoo: {len(zero_stocks) - still_zero}, Still zero: {still_zero}")

df['紀念品預估價值'] = df['上次紀念品'].apply(estimate_gift_value)

def calculate_cp_and_score(row):
    price = row['最近股價']
    val = row['紀念品預估價值']
    cond = row['去年條件']
    freq = row['五年內發放次數']
    
    if price <= 0:
        return pd.Series([0.0, '1 星 (無股價)'])
        
    if val == 0:
        return pd.Series([0.0, '1 星 (無發放)'])
        
    try:
        freq_val = float(freq)
        if pd.isna(freq_val): freq_val = 1.0
    except:
        freq_val = 1.0
        
    cp_val = float(round((val / price) * (freq_val / 5), 2))
    
    if cp_val >= 2.0:
         score = '5 星'
    elif cp_val >= 1.0:
         score = '4 星'
    elif cp_val >= 0.5:
         score = '3 星'
    elif cp_val >= 0.1:
         score = '2 星'
    else:
         score = '1 星'
         
    return pd.Series([cp_val, score])

df[['性價比(CP值)', '推薦評分']] = df.apply(calculate_cp_and_score, axis=1)

# ============================================================
# 4b. 新版性價比：以五年紀念品總估值計算
# ============================================================
def estimate_5year_total(text):
    """將「五年發放紀念品」欄位拆成每年的品項，分別估值後加總"""
    if pd.isna(text) or str(text).strip() in ['', 'nan']:
        return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        item = item.strip()
        if not item:
            continue
        # 去除年份前綴，例如 "(2025)多功能雙面蓋毯" → "多功能雙面蓋毯"
        item = re.sub(r'^\(\d{4}\)', '', item).strip()
        # 跳過不發放/未發放的年份
        if not item or item in ['無', '-', '未發放', '不發放']:
            continue
        total += estimate_gift_value(item)
    return total

df['五年紀念品總估值'] = df['五年發放紀念品'].apply(estimate_5year_total)

def calc_new_cp(row):
    price = row['最近股價']
    total_val = row['五年紀念品總估值']
    freq = row['五年內發放次數']
    cond = str(row.get('去年條件', ''))
    
    if price <= 0 or total_val == 0:
        return 0.0
        
    try:
        freq_val = float(freq)
        if pd.isna(freq_val): freq_val = 1.0
    except:
        freq_val = 1.0
    
    # 1. 基礎性價比 * 穩定性比例 (freq/5)
    cp = (total_val / price) * (freq_val / 5)
    
    # 2. 身分證門檻懲罰 (扣除 30% -> 乘以 0.7)
    if '身分證' in cond or '本人' in cond:
        cp *= 0.7
        
    return round(cp, 2)

df['新版性價比'] = df.apply(calc_new_cp, axis=1)

def calc_new_score(cp):
    if cp >= 1.5:
        return '5 星'
    elif cp >= 0.8:
        return '4 星'
    elif cp >= 0.4:
        return '3 星'
    elif cp >= 0.1:
        return '2 星'
    else:
        return '1 星'

df['新版推薦評分'] = df['新版性價比'].apply(calc_new_score)

# ============================================================
# 5. 確保輸出欄位並將結果回寫至 Supabase
# ============================================================
final_columns = [
    '股號', '公司', '五年內發放次數', '最近一次發放', '上次紀念品',
    '最近股價', 
    '五年紀念品總估值', '新版性價比', '新版推薦評分',
    '去年條件', '五年發放紀念品'
]

for col in final_columns:
    if col not in df.columns:
        df[col] = ''
        
df = df[final_columns]
df = df.sort_values(by='新版性價比', ascending=False)
print(f"Evaluated {len(df)} total stocks")

# 我們不再輸出 Excel，直接把結果 upsert 回 Supabase
def safe_float(val):
    try:
        v = float(val)
        return None if math.isnan(v) else float(round(v, 4))
    except (TypeError, ValueError):
        return None

def safe_int(val):
    try:
        return int(val)
    except (TypeError, ValueError):
        return None

def safe_str(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ''
    return str(val).strip()

if SUPABASE_KEY:
    print("\n🚀 開始將更新結果 Upsert 至 Supabase ...\n")
    records = []
    for _, row in df.iterrows():
        try:
            records.append({
                'stock_id':        str(row.get('股號', '')).strip(),
                'name':            safe_str(row.get('公司')),
                'price':           safe_float(row.get('最近股價')),
                'gift':            safe_str(row.get('上次紀念品')),
                'freq':            safe_int(row.get('五年內發放次數')),
                'cp':              safe_float(row.get('新版性價比')),
                'score':           safe_str(row.get('新版推薦評分')),
                'five_year_gifts': safe_str(row.get('五年發放紀念品')),
                'cond':            safe_str(row.get('去年條件')),
                # v2 不再需要紀念品預估價值，統一設為 None
                'gift_value':      None,
                'five_year_total': safe_float(row.get('五年紀念品總估值')),
                'last_issued':     safe_str(row.get('最近一次發放')),
            })
        except Exception as e:
            print(f"Error parse row {row.get('股號')}: {e}")
            pass

    BATCH_SIZE = 100
    total = len(records)
    total_batches = math.ceil(total / BATCH_SIZE)
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    
    url = f'{SUPABASE_URL}/rest/v1/{TABLE_NAME}?on_conflict=stock_id'
    
    success_count = 0
    for i in range(total_batches):
        start_idx = int(i * BATCH_SIZE)
        end_idx = int((i + 1) * BATCH_SIZE)
        batch = records[start_idx : end_idx]
        resp = requests.post(url, headers=headers, data=json.dumps(batch))
        if resp.status_code in (200, 201):
            success_count = int(success_count + len(batch))
            print(f'   ✅ 批次 {i+1}/{total_batches} 上傳成功 ({len(batch)} 筆)')
        else:
            print(f'   ❌ 批次 {i+1}/{total_batches} 失敗: {resp.status_code} {resp.text[:300]}')

    print(f'\n✨ 完成！成功更新 Supabase {success_count}/{total} 筆。 (不會產生本地 Excel 檔案)')
    
else:
    print("No Supabase key found to upload data.")
