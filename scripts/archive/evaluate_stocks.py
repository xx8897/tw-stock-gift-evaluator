import pandas as pd
import requests
import re
import time
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from valuation import estimate_gift_value, estimate_5year_total, calc_v4_cp, calc_v4_score

# ── 使用腳本所在位置往上一層作為根目錄（因腳本放在 scripts/）──
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
# 3. 紀念品估值邏輯（由 valuation.py 模組提供）
# ============================================================
# estimate_gift_value 已由頂部 `from valuation import ...` 匯入，此處不再定義。

# ============================================================
# 4. 計算評分 (含有保守估算說明)
# ============================================================
# 【評估說明】：五年紀念品總估值採用保守估算。
# 每次(每年)發放之價值皆已預先扣除「代領花費」(禮券類-15元，物品類-20元)。
# 電子類券(電子/點數/APP) 則不扣除代領費，因不須委託代領。
print("Calculating CP scores based on V4.2 Model (Bug Fix & Digital Support)...")
df['紀念品預估價值'] = df['上次紀念品'].apply(estimate_gift_value)

# estimate_5year_total 已由頂部 `from valuation import ...` 匯入，此處不再定義。
df['新版五總估'] = df['五年發放紀念品'].apply(estimate_5year_total)

# calc_v4_cp、calc_v4_score 已由頂部 `from valuation import ...` 匯入，此處不再定義。
df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

df['新版推薦評分'] = df.apply(calc_v4_score, axis=1)

# ============================================================
# 5. 排序與存檔
# ============================================================
if '股號' in df.columns:
    df['股號'] = pd.to_numeric(df['股號'], errors='coerce')
    df = df.sort_values(by='股號', ascending=True)

final_columns = [
    '股號', '公司', '五年內發放次數', '最近一次發放', '上次紀念品',
    '最近股價', '新版五總估', '新版性價比', '新版推薦評分',
    '去年條件', '五年發放紀念品'
]
df[final_columns].to_excel(OUTPUT_FILE, index=False)
print(f"Success! Evaluated {len(df)} stocks. Sorted by Stock ID. Saved to {OUTPUT_FILE}")
