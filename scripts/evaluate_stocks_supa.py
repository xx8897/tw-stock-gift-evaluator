import pandas as pd
import requests
import re
import time
import os
import json
from dotenv import load_dotenv

# 載入 .env 檔案中的變數
load_dotenv()

# ── 使用腳本所在位置往上一層作為根目錄（因腳本放在 scripts/）──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, 'data')

INPUT_FILE  = os.path.join(_DATA_DIR, '2021-2025_推薦v2.xlsx')

# ============================================================
# 1. 讀取原始資料 (從 Supabase 或 Excel 備援)
# ============================================================
SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')
TABLE_NAME = 'stocks'

if not SUPABASE_KEY:
    print("WARNING: SUPABASE_SERVICE_KEY not set. Falling back to Excel.")
    df = pd.read_excel(INPUT_FILE)
else:
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=*"
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200 and resp.json():
            print(f"Loaded {len(resp.json())} rows from Supabase")
            df = pd.DataFrame(resp.json())
            rename_map = {
                'stock_id': '股號', 'name': '公司', 'price': '最近股價',
                'gift': '上次紀念品', 'freq': '五年內發放次數', 'cp': '舊版性價比',
                'score': '舊版推薦評分', 'five_year_gifts': '五年發放紀念品',
                'cond': '去年條件',
                'five_year_total': '五年紀念品總估值', 'last_issued': '最近一次發放'
            }
            df = df.rename(columns=rename_map)
        else:
            df = pd.read_excel(INPUT_FILE)
    except:
        df = pd.read_excel(INPUT_FILE)

df.columns = df.columns.astype(str)
if '股號' in df.columns: df['股號'] = df['股號'].astype(str).str.strip()

# ============================================================
# 2. 估值模型 v3.1 核心計分函式
# ============================================================
def estimate_gift_value(gift_name):
    """
    紀念品估值模型 v3.1 — 高精細度保守版
    支援複合品項加總、更細緻的材質與品項分類。
    【保守策略】：禮券類扣除 15 元，物品類扣除 20 元 (預估代領花費)。
    """
    if not gift_name or gift_name in ['無', '-', '未發放', '不發放', 'nan', '']:
        return 0
    
    # ─── 0. 內層遞迴處理 (不在此層執行代領費扣除) ───
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
    
    # ─── 第一層：直接抓取金額 ───
    m = re.search(r'(\d[\d,]*)元', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'\$\s*(\d[\d,]*)', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'抵用券.*?(\d[\d,]*)', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券']): return 100

    # ─── 第二層：特殊高價神股 ───
    if '大魯閣' in gift: return 800
    if '王品' in gift: return 400
    if '六福' in gift: return 1199
    if '佐登妮絲' in gift: return 300

    # ─── 第三層：精細分類估值 ───
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
print("Evaluating V4.2 (Bug Fix & Digital Support)...")
if '最近股價' not in df.columns: df['最近股價'] = 0.0
df['最近股價'] = pd.to_numeric(df['最近股價'], errors='coerce').fillna(0.0)

df['五年紀念品總估值'] = df['五年發放紀念品'].apply(estimate_5year_total)

def calc_v4_cp(row):
    price, total_val, freq = row['最近股價'], row['五年紀念品總估值'], row['五年內發放次數']
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
# 4. 完成
# ============================================================
print(f"Evaluated {len(df)} rows. Model V3.1 applied (Vouchers-15, Items-20).")
