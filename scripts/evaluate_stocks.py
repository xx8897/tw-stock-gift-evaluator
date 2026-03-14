import pandas as pd
import requests
import re
import time
import os

# ── 使用腳本所在位置往上一層作為根目錄（因腳本放在 scripts/）──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_BASE_DIR, 'data')
os.makedirs(_DATA_DIR, exist_ok=True)

INPUT_FILE  = os.path.join(_DATA_DIR, '2021-2025_推薦v2.xlsx')
OUTPUT_FILE = os.path.join(_DATA_DIR, '2021-2025_推薦v2.xlsx')

# ============================================================
# 1. 讀取原始資料
# ============================================================
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
# 2. 股價與計算準備
# ============================================================
# 股價現在由獨立腳本 update_prices_v2.py 負責更新
if '最近股價' not in df.columns:
    df['最近股價'] = 0.0

# 確保數值型態
df['最近股價'] = pd.to_numeric(df['最近股價'], errors='coerce').fillna(0.0)

# ============================================================
# 3. 紀念品估值邏輯
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
        # 標記為內層計算，避免重複扣除代領費
        raw_total = sum(estimate_gift_value(f"__internal__{p.strip()}") for p in parts if p.strip())
        if is_top_level:
            # 判斷是否全為禮券類
            is_voucher_only = all(any(k in p for k in ['禮券', '商品卡', '提貨券', '購物金', '兌換卷']) for p in parts)
            cost = 15 if is_voucher_only else 20
            return max(raw_total - cost, 0)
        return raw_total

    gift = name_clean
    
    # ─── 第一層：直接抓取金額 ───
    m = re.search(r'(\d[\d,]*)元', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'\$\s*(\d[\d,]*)', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'抵用券.*?(\d[\d,]*)', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券']):
        return 100

    # ─── 第二層：特殊高價神股 ───
    if '大魯閣' in gift: return 800
    if '王品' in gift: return 400
    if '六福村' in gift or '六福' in gift: return 1199
    if '佐登妮絲' in gift: return 300

    # ─── 第三層：精細分類估值 ───
    
    # 【小家電類】 200~500 元
    if any(k in gift for k in ['電風扇', '循環扇', '捕蚊燈', '電熱毯']): return 400
    if any(k in gift for k in ['行動電源', '耳機', '藍芽']): return 300
    if any(k in gift for k in ['USB風扇', '手持扇', '體重計', '吸塵器']): return 200
    
    # 【鍋具類深度細分】
    if any(k in gift for k in ['炒鍋', '平底鍋', '鑄鐵鍋']): return 400
    if any(k in gift for k in ['湯鍋', '燉鍋', '壓力鍋']): return 300
    if any(k in gift for k in ['雪平鍋', '奶鍋', '單把鍋']): return 150
    
    # 【餐具材質細分】
    if any(k in gift for k in ['陶瓷', '骨瓷', '強化玻璃', '耐熱玻璃']):
        if any(k in gift for k in ['盤', '碟']): return 100
        if any(k in gift for k in ['碗', '盅']): return 80
        return 120 # 其它陶瓷品
    
    if any(k in gift for k in ['不鏽鋼', '不銹鋼', '304', '316']):
        if any(k in gift for k in ['保溫杯', '保溫瓶']): return 200
        if any(k in gift for k in ['便當盒', '隔熱碗']): return 150
        return 120 # 其它不鏽鋼件
    
    # 【五金工具/戶外】
    if any(k in gift for k in ['工具組', '工具套裝', '螺絲起子組']): return 180
    if any(k in gift for k in ['露營燈', '帳篷', '野餐墊']): return 200
    if any(k in gift for k in ['修容', '指甲剪']): return 80

    # 【紡織品深度細分】
    if any(k in gift for k in ['法蘭絨', '珊瑚絨', '毯']): return 250
    if any(k in gift for k in ['浴巾', '大毛巾']): return 120
    if any(k in gift for k in ['毛巾', '擦手巾', '運動巾']): return 60
    if '傘' in gift:
        if any(k in gift for k in ['自動', '抗UV', '折傘']): return 200
        return 150
        
    # 【食飲品類】
    if any(k in gift for k in ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油']): return 120
    if any(k in gift for k in ['米', '白米', '香米', '糙米']) and '洗米' not in gift: return 70 # 米價略漲
    if any(k in gift for k in ['火鍋', '鍋燒', '拌麵', '泡麵', '醬油', '罐頭', '咖啡', '零食']): return 50

    # 其他基礎生活類
    if any(k in gift for k in ['洗衣', '洗碗', '清潔劑', '皂', '洗髮', '牙膏']): return 50
    if any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '抽取式']): return 30

    # 【品牌/聯名加成】 1.25x
    val = 40
    premium_brands = ['Kitty', 'Snoopy', '史努比', '迪士尼', 'Disney', 'LINE', '角落小夥伴', '卡娜赫拉', '拉拉熊', '小小兵', '皮克斯']
    # 【保守扣除】若非複合品項且為頂層呼叫，在此判斷類別並扣除費
    if is_top_level:
        is_voucher = any(k in gift for k in ['禮券', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券'])
        cost = 15 if is_voucher else 20
        val = max(val - cost, 0)

    return val

# ============================================================
# 4. 計算評分 (含有保守估算說明)
# ============================================================
# 【評估說明】：五年紀念品總估值採用保守估算。
# 每次(每年)發放之價值皆已預先扣除「代領花費」(禮券類-15元，物品類-20元)。
# 此扣除僅為保守估算基準，並不代表實際之代領花費，僅供性價比(CP值)參考。
print("Calculating CP scores based on existing stock prices (Conservative V3.1)...")
df['紀念品預估價值'] = df['上次紀念品'].apply(estimate_gift_value)

def estimate_5year_total(text):
    if pd.isna(text) or str(text).strip() in ['', 'nan']: return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        item = re.sub(r'^\(\d{4}\)', '', item.strip()).strip()
        if not item or item in ['無', '-', '未發放', '不發放']: continue
        total += estimate_gift_value(item)
    return total

df['五年紀念品總估值'] = df['五年發放紀念品'].apply(estimate_5year_total)

def calc_new_cp(row):
    price = row['最近股價']
    total_val = row['五年紀念品總估值']
    freq = row['五年內發放次數']
    cond = str(row.get('去年條件', ''))
    
    if price <= 0 or total_val == 0: return 0.0
    try: freq_val = float(freq)
    except: freq_val = 1.0
    if pd.isna(freq_val): freq_val = 1.0
    
    cp = (total_val / price) * (freq_val / 5)
    if '身分證' in cond or '本人' in cond: cp *= 0.7
    return round(cp, 2)

df['新版性價比'] = df.apply(calc_new_cp, axis=1)

def calc_new_score(cp):
    if cp >= 1.5: return '5 星'
    elif cp >= 0.8: return '4 星'
    elif cp >= 0.4: return '3 星'
    elif cp >= 0.15: return '2 星'
    else: return '1 星'

df['新版推薦評分'] = df['新版性價比'].apply(calc_new_score)

# ============================================================
# 5. 排序與存檔
# ============================================================
if '股號' in df.columns:
    df['股號'] = pd.to_numeric(df['股號'], errors='coerce')
    df = df.sort_values(by='股號', ascending=True)

final_columns = [
    '股號', '公司', '五年內發放次數', '最近一次發放', '上次紀念品',
    '最近股價', '五年紀念品總估值', '新版性價比', '新版推薦評分',
    '去年條件', '五年發放紀念品'
]
df[final_columns].to_excel(OUTPUT_FILE, index=False)
print(f"Success! Evaluated {len(df)} stocks. Sorted by Stock ID. Saved to {OUTPUT_FILE}")
