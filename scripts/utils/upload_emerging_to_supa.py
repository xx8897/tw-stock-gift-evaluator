"""
一次性腳本：將興櫃股票資料 Upsert 至 Supabase stocks Table
"""
import os, requests, time
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyoaoepcrqxzrtdkldfg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
TABLE_NAME = "stocks"

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY 未設定")
    exit(1)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXCEL_PATH = os.path.join(BASE_DIR, 'data', '興櫃的資料_updated.xlsx')

# 欄位映射：Excel -> Supabase
COLUMN_MAP = {
    '股號':         'stock_id',
    '公司':         'name',
    '最近股價':     'price',
    '上次紀念品':   'gift',
    '五年內發放次數': 'freq',
    '五年發放紀念品': 'five_year_gifts',
    '去年條件':     'cond',
    '最近一次發放': 'last_issued',
    '新版性價比':   'cp',
    '新版推薦評分': 'score',
    '新版五總估':   'five_year_total',
}

df = pd.read_excel(EXCEL_PATH)
print(f"讀取 {len(df)} 筆興櫃資料，準備 Upsert 至 Supabase [{TABLE_NAME}]...\n")

from datetime import datetime, timedelta
current_ts = (datetime.utcnow() + timedelta(hours=8)).strftime('%Y-%m-%dT%H:%M:%S+08:00')

upsert_data = []
for _, row in df.iterrows():
    entry = {}
    for excel_col, db_col in COLUMN_MAP.items():
        if excel_col not in row:
            continue
        val = row[excel_col]
        # 處理 NaN / NaT
        if pd.isna(val) or str(val) == 'NaT':
            if db_col in ['price', 'cp', 'five_year_total']: val = 0.0
            elif db_col == 'freq': val = 0
            else: val = ''
        # 型別轉換
        if db_col in ['price', 'cp', 'five_year_total']:
            entry[db_col] = float(val)
        elif db_col == 'freq':
            entry[db_col] = int(float(val))
        else:
            entry[db_col] = str(val).strip()

    entry['updated_at'] = current_ts
    upsert_data.append(entry)
    print(f"  準備: {entry.get('stock_id')} {entry.get('name')} | 股價={entry.get('price')} | cp={entry.get('cp')}")

print(f"\n共 {len(upsert_data)} 筆，執行 Upsert...")

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}

BATCH_SIZE = 50
for i in range(0, len(upsert_data), BATCH_SIZE):
    batch = upsert_data[i:i + BATCH_SIZE]
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
        headers=headers,
        json=batch,
        timeout=60
    )
    if resp.status_code >= 400:
        print(f"ERROR Batch {i//BATCH_SIZE + 1}: {resp.status_code} {resp.text}")
        exit(1)
    print(f"  Batch {i//BATCH_SIZE + 1} 完成（{len(batch)} 筆）")

print(f"\n成功上傳 {len(upsert_data)} 筆興櫃股票資料至 Supabase！")
