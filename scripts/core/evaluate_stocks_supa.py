import pandas as pd
import requests
import re
import time
import os
import json
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# Supabase Config
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyoaoepcrqxzrtdkldfg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
TABLE_NAME = "stocks"

# ── 設定路徑 ──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_DATA_DIR = os.path.join(_BASE_DIR, 'data')
# INPUT_FILE 為備用 Excel 路徑
INPUT_FILE  = os.path.join(_DATA_DIR, '2021-2025_推薦v2.xlsx')

# ============================================================
# 1. 讀取資料 (強制 Supabase)
# ============================================================
df = None

print(f"Fetching latest data from Supabase [{TABLE_NAME}]...")
if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY is missing. Cannot fetch data.")
    exit(1)

try:
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=*"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Range-Unit': 'items'
    }
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    supa_json = resp.json()
    
    if supa_json:
        df = pd.DataFrame(supa_json)
        # 欄位映射清單 (備份現有值以利計算)
        rename_map = {
            'stock_id': '股號', 'name': '公司', 'price': '最近股價',
            'gift': '上次紀念品', 'freq': '五年內發放次數',
            'five_year_gifts': '五年發放紀念品', 'cond': '去年條件',
            'last_issued': '最近一次發放',
            'cp': '舊版性價比', 'score': '舊版推薦評分',
            'five_year_total': '舊版五總估'
        }
        # 僅映射存在的欄位
        actual_rename = {k: v for k, v in rename_map.items() if k in df.columns}
        df = df.rename(columns=actual_rename)
        print(f"Successfully loaded {len(df)} rows from Supabase.")
    else:
        print("ERROR: Supabase returned empty data.")
        exit(1)
except Exception as se:
    print(f"CRITICAL ERROR: Failed to load data from Supabase: {se}")
    exit(1)

# 清理資料型別
df.columns = df.columns.astype(str)
if '股號' in df.columns: df['股號'] = df['股號'].astype(str).str.strip()
if '最近股價' in df.columns: df['最近股價'] = pd.to_numeric(df['最近股價'], errors='coerce').fillna(0.0)

# ============================================================
# 2. 紀念品估值模型 v3.1 — 核心邏輯
# ============================================================
def estimate_gift_value(gift_name):
    if not gift_name or gift_name in ['無', '-', '未發放', '不發放', 'nan', '']:
        return 0
    is_top_level = not str(gift_name).startswith("__internal__")
    name_clean = str(gift_name).replace("__internal__", "").strip()
    delimiters = r'\+|\&|與|和|及'
    if re.search(delimiters, name_clean):
        parts = re.split(delimiters, name_clean)
        raw_total = sum(estimate_gift_value(f"__internal__{p.strip()}") for p in parts if p.strip())
        if is_top_level:
            is_voucher_only = all(any(k in p for k in ['禮券', '商品卡', '提貨券', '購物金', '兌換卷']) for p in parts)
            cost = 15 if is_voucher_only else 20
            return max(raw_total - cost, 0)
        return raw_total
    gift = name_clean
    m = re.search(r'(\d[\d,]*)元', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'\$\s*(\d[\d,]*)', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'抵用券.*?(\d[\d,]*)', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券']): return 100
    if '大魯閣' in gift: return 800
    if '王品' in gift: return 400
    if '六福' in gift: return 1199
    if '佐登妮絲' in gift: return 300
    if any(k in gift for k in ['電風扇', '循環扇', '捕蚊燈', '電熱毯']): val = 400
    elif any(k in gift for k in ['行動電源', '耳機', '藍芽']): val = 300
    elif any(k in gift for k in ['USB風扇', '手持扇', '體重計', '吸塵器']): val = 200
    elif any(k in gift for k in ['炒鍋', '平底鍋', '鑄鐵鍋']): val = 400
    elif any(k in gift for k in ['湯鍋', '燉鍋', '壓力鍋']): val = 300
    elif any(k in gift for k in ['雪平鍋', '奶鍋', '單把鍋']): val = 150
    elif any(k in gift for k in ['陶瓷', '骨瓷', '強化玻璃', '耐熱玻璃']):
        if any(k in gift for k in ['盤', '碟']): val = 100
        elif any(k in gift for k in ['碗', '盅']): val = 80
        else: val = 120
    elif any(k in gift for k in ['不鏽鋼', '不銹鋼', '304', '316']):
        if any(k in gift for k in ['保溫杯', '保溫瓶']): val = 200
        elif any(k in gift for k in ['便當盒', '隔熱碗']): val = 150
        else: val = 120
    elif any(k in gift for k in ['工具組', '工具套裝', '螺絲起子組']): val = 180
    elif any(k in gift for k in ['露營燈', '帳篷', '野餐墊']): val = 200
    elif any(k in gift for k in ['修容', '指甲剪']): val = 80
    elif any(k in gift for k in ['法蘭絨', '珊瑚絨', '毯']): val = 250
    elif any(k in gift for k in ['浴巾', '大毛巾']): val = 120
    elif any(k in gift for k in ['毛巾', '擦手巾', '運動巾']): val = 60
    elif '傘' in gift:
        if any(k in gift for k in ['自動', '抗UV', '折傘']): val = 200
        else: val = 150
    elif any(k in gift for k in ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油']): val = 120
    elif any(k in gift for k in ['米', '白米', '香米', '糙米']) and '洗米' not in gift: val = 70
    elif any(k in gift for k in ['火鍋', '鍋燒', '拌麵', '泡麵', '醬油', '罐頭', '咖啡', '零食']): val = 50
    elif any(k in gift for k in ['洗衣', '洗碗', '清潔劑', '皂', '洗髮', '牙膏']): val = 50
    elif any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '抽取式']): val = 30
    else: val = 40
    premium_brands = ['Kitty', 'Snoopy', '史努比', '迪士尼', 'Disney', 'LINE', '角落小夥伴', '卡娜赫拉', '拉拉熊', '小小兵', '皮克斯']
    if any(k.lower() in gift.lower() for k in premium_brands): val = int(val * 1.25)
    if is_top_level:
        is_voucher = any(k in gift for k in ['禮券', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券'])
        is_digital = any(k in gift for k in ['電子', '簡訊', 'APP', '點數', '虛擬'])
        if is_digital: cost = 0
        else: cost = 15 if is_voucher else 20
        val = max(val - cost, 0)
    return val

def estimate_5year_total(text):
    if pd.isna(text) or str(text).strip() in ['', 'nan']: return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        item = re.sub(r'^\(\d{4}\)', '', item.strip()).strip()
        if not item or item in ['無', '-', '未發放', '不發放']: continue
        total += estimate_gift_value(item)
    return total

# ============================================================
# 3. 執行評量計算
# ============================================================
print("Evaluating Model V4.2 calculations...")
df['新版五總估'] = df['五年發放紀念品'].apply(estimate_5year_total)

def calc_v4_cp(row):
    price, total_val, freq = row['最近股價'], row['新版五總估'], row['五年內發放次數']
    if price <= 0 or total_val <= 0: return 0.0
    w_freq = freq / 5.0
    cp = (total_val * w_freq) / price
    return round(cp, 2)

df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

def calc_v4_score(row):
    cp, freq, cond = row['新版性價比'], row['五年內發放次數'], str(row.get('去年條件', ''))
    is_convenient = not ('身分證' in cond or '本人' in cond)
    if cp >= 2.0 and freq >= 5 and is_convenient: return '5 星'
    elif cp >= 1.0 and freq >= 4 and is_convenient: return '4 星'
    elif cp >= 0.5 and freq >= 3: return '3 星'
    elif cp >= 0.1: return '2 星'
    else: return '1 星'

df['新版推薦評分'] = df.apply(calc_v4_score, axis=1)

# ============================================================
# 4. 更新至 Supabase
# ============================================================
print(f"Evaluation complete for {len(df)} stocks. Preparing sync...")

# 映射回 Supabase 欄位名稱 (完整欄位以避免 Not-Null 衝突)
# 如果欄位在 df 中被 rename 過，此處要映射回去
rev_rename = {
    '股號': 'stock_id',
    '公司': 'name',
    '最近股價': 'price',
    '上次紀念品': 'gift',
    '五年內發放次數': 'freq',
    '五年發放紀念品': 'five_year_gifts',
    '去年條件': 'cond',
    '最近一次發放': 'last_issued',
    '新版性價比': 'cp',
    '新版推薦評分': 'score',
    '新版五總估': 'five_year_total'
}

print("Syncing results back to Supabase (Full Batch Upsert)...")
upsert_data = []

current_ts = time.strftime('%Y-%m-%dT%H:%M:%S+08:00', time.localtime())

for _, row in df.iterrows():
    entry = {}
    # 遍歷映射，取出 DataFrame 中的值
    for df_col, db_col in rev_rename.items():
        if df_col in row:
            val = row[df_col]
            if pd.isna(val): 
                # 根據型別給預設值以防 Not-Null
                if db_col in ['price', 'cp', 'five_year_total']: val = 0.0
                elif db_col == 'freq': val = 0
                else: val = ""
            
            # 型別轉換
            if db_col in ['price', 'cp', 'five_year_total']: entry[db_col] = float(val)
            elif db_col == 'freq': entry[db_col] = int(val)
            else: entry[db_col] = str(val)
    
    # 強制加入更新時間
    entry['updated_at'] = current_ts
    upsert_data.append(entry)

try:
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    }
    
    batch_size = 100
    for i in range(0, len(upsert_data), batch_size):
        batch = upsert_data[i:i + batch_size]
        resp = requests.post(url, headers=headers, json=batch, timeout=60)
        if resp.status_code >= 400:
            print(f"ERROR Batch {i//batch_size + 1}: {resp.status_code} {resp.text}")
            resp.raise_for_status()
        print(f"Batch {i//batch_size + 1} synced ({len(batch)} items).")
        
    print("Successfully updated all records in Supabase (Full Row Sync).")
except Exception as e:
    print(f"CRITICAL ERROR during Supabase sync: {e}")

print("Process finished.")
