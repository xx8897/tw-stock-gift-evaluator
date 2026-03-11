"""
scripts/upload_stocks.py
將 data/2021-2025_推薦評分.xlsx 的所有資料 upsert 到 Supabase stocks 資料表。

本機執行：
    set SUPABASE_SERVICE_KEY=你的service_role_key
    python scripts/upload_stocks.py

GitHub Actions 執行時 key 由 Repository Secret 自動注入，無需手動設定。
"""

import os
import openpyxl
import requests
import json
import math

# ── 設定 ──────────────────────────────────────────────────────────────
SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'

# ⚠️  service_role key 從環境變數讀取，絕不寫死在程式碼裡
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '')
if not SUPABASE_KEY:
    raise RuntimeError(
        '請設定環境變數 SUPABASE_SERVICE_KEY。\n'
        '本機：set SUPABASE_SERVICE_KEY=你的service_role_key\n'
        'GitHub Actions：在 repo Settings → Secrets 新增 SUPABASE_SERVICE_KEY'
    )

# 腳本從 repo 根目錄執行，所以路徑相對於根目錄
EXCEL_PATH = 'data/2021-2025_推薦評分.xlsx'
TABLE_NAME = 'stocks'
BATCH_SIZE = 100

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'  # upsert
}

def safe_float(val):
    try:
        v = float(val)
        return None if math.isnan(v) else round(v, 4)
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

def load_excel():
    print(f'📂 讀取 {EXCEL_PATH} ...')
    wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True)
    ws = wb.active

    rows_iter = ws.iter_rows(values_only=True)
    headers = [str(h) for h in next(rows_iter)]
    print(f'   欄位: {headers}')

    records = []
    for row in rows_iter:
        d = dict(zip(headers, row))
        stock_id = safe_str(d.get('股號'))
        if not stock_id:
            continue

        record = {
            'stock_id':        stock_id,
            'name':            safe_str(d.get('公司')),
            'price':           safe_float(d.get('最新股價')),
            'gift':            safe_str(d.get('上次紀念品')),
            'freq':            safe_int(d.get('五年內發放次數')),
            'cp':              safe_float(d.get('新版性價比')),
            'score':           safe_str(d.get('新版推薦評分')),
            'five_year_gifts': safe_str(d.get('五年發放紀念品')),
            'cond':            safe_str(d.get('去年條件')),
            'gift_value':      safe_float(d.get('紀念品預估價值')),
            'five_year_total': safe_float(d.get('五年紀念品總估值')),
            'last_issued':     safe_str(d.get('最近一次發放')),
        }
        records.append(record)

    wb.close()
    print(f'   共讀取 {len(records)} 筆')
    return records

def upload_batch(batch, batch_num, total_batches):
    url = f'{SUPABASE_URL}/rest/v1/{TABLE_NAME}'
    resp = requests.post(url, headers=HEADERS, data=json.dumps(batch))
    if resp.status_code in (200, 201):
        print(f'   ✅ 批次 {batch_num}/{total_batches} 上傳成功 ({len(batch)} 筆)')
        return True
    else:
        print(f'   ❌ 批次 {batch_num}/{total_batches} 失敗: {resp.status_code} {resp.text[:300]}')
        return False

def main():
    records = load_excel()
    total = len(records)
    total_batches = math.ceil(total / BATCH_SIZE)
    print(f'\n🚀 開始上傳，共 {total} 筆，分 {total_batches} 批（每批 {BATCH_SIZE} 筆）...\n')

    success = 0
    for i in range(total_batches):
        batch = records[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
        ok = upload_batch(batch, i + 1, total_batches)
        if ok:
            success += len(batch)

    print(f'\n✨ 完成！成功上傳 {success}/{total} 筆')
    if success < total:
        exit(1)  # 讓 GitHub Actions 標記為失敗

if __name__ == '__main__':
    main()
