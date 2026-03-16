import pandas as pd
import requests
import re
import time
import os
import json
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from valuation import estimate_gift_value, estimate_5year_total, calc_v4_cp, calc_v4_score

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
# 2. 紀念品估值模型（由 valuation.py 模組提供）
# ============================================================
# estimate_gift_value、estimate_5year_total 已由頂部 `from valuation import ...` 匯入，此處不再定義。

# ============================================================
# 3. 執行評量計算
# ============================================================
print("Evaluating Model V4.2 calculations...")
df['新版五總估'] = df['五年發放紀念品'].apply(estimate_5year_total)

# calc_v4_cp、calc_v4_score 已由頂部 `from valuation import ...` 匯入，此處不再定義。
df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

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
