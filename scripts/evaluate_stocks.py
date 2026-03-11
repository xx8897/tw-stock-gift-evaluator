import pandas as pd
import requests
import re
import time
import os

# ── 使用腳本所在位置往上一層作為根目錄（因腳本放在 scripts/）──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, 'data')
os.makedirs(_DATA_DIR, exist_ok=True)

INPUT_FILE  = os.path.join(_DATA_DIR, '2021-2025_推薦評分.xlsx')
OUTPUT_FILE = os.path.join(_DATA_DIR, '2021-2025_推薦評分.xlsx')

# ============================================================
# 1. 讀取原始資料
# ============================================================
# 因為已經不需要原始檔案，我們直接讀取上一次評估過的結果作為下一次的基底
# 這樣就不用再依賴原始的 2021-2025.xlsx 檔案
df = pd.read_excel(INPUT_FILE)
df.columns = df.columns.astype(str)

if '上次紀念品' in df.columns:
    df['上次紀念品'] = df['上次紀念品'].astype(str).replace('nan', '')
if '去年條件' in df.columns:
    df['去年條件'] = df['去年條件'].astype(str).replace('nan', '')
if '股號' in df.columns:
    df['股號'] = df['股號'].astype(str).str.strip()

print(f"Loaded {len(df)} rows from {INPUT_FILE}")

# ============================================================
# 2. 從台灣證交所 (TWSE) + 櫃買中心 (TPEX) 抓最新股價
# ============================================================
def fetch_twse_prices():
    """從台灣證交所抓取所有上市股票的最新收盤價"""
    url = "https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=json"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        data = resp.json()
        prices = {}
        for row in data.get("data", []):
            # row: [代號, 名稱, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數]
            stock_id = str(row[0]).strip()
            try:
                close_price = float(row[7].replace(",", ""))
                prices[stock_id] = close_price
            except (ValueError, IndexError):
                pass
        return prices
    except Exception as e:
        print(f"  [WARN] TWSE API failed: {e}")
        return {}

def fetch_tpex_prices():
    """從櫃買中心抓取所有上櫃股票的最新收盤價"""
    url = "https://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&o=json"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        data = resp.json()
        prices = {}
        for row in data.get("aaData", []):
            # row: [代號, 名稱, 收盤, 漲跌, 開盤, 最高, 最低, 成交股數, ...]
            stock_id = str(row[0]).strip()
            try:
                close_str = str(row[2]).replace(",", "").strip()
                if close_str and close_str != "--":
                    close_price = float(close_str)
                    prices[stock_id] = close_price
            except (ValueError, IndexError):
                pass
        return prices
    except Exception as e:
        print(f"  [WARN] TPEX API failed: {e}")
        return {}

print("Fetching latest prices from TWSE (上市)...")
twse_prices = fetch_twse_prices()
print(f"  -> Got {len(twse_prices)} listed stock prices")

time.sleep(1)

print("Fetching latest prices from TPEX (上櫃)...")
tpex_prices = fetch_tpex_prices()
print(f"  -> Got {len(tpex_prices)} OTC stock prices")

# 合併兩個來源
price_dict = {}
price_dict.update(twse_prices)
price_dict.update(tpex_prices)
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
    
    return 40  # 其他未分類品項，保守估 40 元

# ============================================================
# 4. 計算推薦評分
# ============================================================
print("Calculating CP scores...")
df['最新股價'] = df['股號'].map(price_dict)

# Fallback: 用原始 Excel 的「股價」欄位補上
df['最新股價'] = df['最新股價'].fillna(pd.to_numeric(df['股價'], errors='coerce'))
# 最後兜底：填 0.0
df['最新股價'] = df['最新股價'].fillna(0.0).round(2)

# 統計來源
yahoo_count = df['股號'].map(price_dict).notna().sum()
fallback_count = len(df) - yahoo_count
still_zero = (df['最新股價'] == 0).sum()
print(f"  -> API matched: {yahoo_count}, Fallback to old price: {fallback_count - still_zero}, Still zero: {still_zero}")

df['紀念品預估價值'] = df['上次紀念品'].apply(estimate_gift_value)

def calculate_cp_and_score(row):
    price = row['最新股價']
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
        
    cp_val = round((val / price) * (freq_val / 5), 2)
    
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
    price = row['最新股價']
    total_val = row['五年紀念品總估值']
    freq = row['五年內發放次數']
    if price <= 0 or total_val == 0:
        return 0.0
    try:
        freq_val = float(freq)
        if pd.isna(freq_val): freq_val = 1.0
    except:
        freq_val = 1.0
    return round((total_val / price) * (freq_val / 5), 2)

df['新版性價比'] = df.apply(calc_new_cp, axis=1)

def calc_new_score(cp):
    if cp >= 2.0:
        return '5 星'
    elif cp >= 1.0:
        return '4 星'
    elif cp >= 0.5:
        return '3 星'
    elif cp >= 0.1:
        return '2 星'
    else:
        return '1 星'

df['新版推薦評分'] = df['新版性價比'].apply(calc_new_score)

# ============================================================
# 5. 確保輸出欄位與匯出
# ============================================================
final_columns = [
    '股號', '股價', '公司', '五年內發放次數', '最近一次發放', '上次紀念品',
    '最新股價', '紀念品預估價值', '性價比(CP值)', '推薦評分',
    '五年紀念品總估值', '新版性價比', '新版推薦評分',
    '去年條件', '五年發放紀念品'
]

for col in final_columns:
    if col not in df.columns:
        df[col] = ''
        
df = df[final_columns]
df = df.sort_values(by='新版性價比', ascending=False)

df.to_excel(OUTPUT_FILE, index=False)
print(f"Done! Evaluated {len(df)} total stocks and saved to {OUTPUT_FILE}")

# ============================================================
# 6. 另外產出篩選版：五年內發放次數 >= 5
# ============================================================
FILTERED_FILE = os.path.join(_DATA_DIR, '2021-2025_年年發放.xlsx')
freq_col = pd.to_numeric(df['五年內發放次數'], errors='coerce').fillna(0)
df_filtered = df[freq_col >= 5].copy()
df_filtered = df_filtered.drop(columns=['股價'], errors='ignore')
df_filtered = df_filtered.sort_values(by='新版性價比', ascending=False)
df_filtered.to_excel(FILTERED_FILE, index=False)
print(f"Filtered! {len(df_filtered)} stocks with 五年內發放次數>=5 saved to {FILTERED_FILE}")
