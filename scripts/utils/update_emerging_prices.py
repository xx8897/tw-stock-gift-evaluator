"""
一次性腳本：查詢興櫃股票最新收盤價並寫回 Excel
"""
import os, requests, time, random
import pandas as pd
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.getenv('FINMIND_TOKEN')
FINMIND_URL = 'https://api.finmindtrade.com/api/v4/data'
QUERY_DATE = '2026-03-16'  # 最近交易日

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXCEL_PATH = os.path.join(BASE_DIR, 'data', '興櫃的資料.xlsx')

def fetch_close(stock_id):
    params = {
        'dataset': 'TaiwanStockPrice',
        'data_id': str(stock_id),
        'start_date': QUERY_DATE,
        'end_date': QUERY_DATE,
        'token': TOKEN,
    }
    r = requests.get(FINMIND_URL, params=params, timeout=15)
    r.raise_for_status()
    data = r.json().get('data', [])
    return float(data[-1]['close']) if data else None

df = pd.read_excel(EXCEL_PATH)
print(f"讀取 {len(df)} 筆興櫃資料，開始查詢 {QUERY_DATE} 收盤價...\n")

updated = 0
for i, row in df.iterrows():
    sid = str(row['股號']).strip()
    time.sleep(random.uniform(0.15, 0.25))
    price = fetch_close(sid)
    if price is not None:
        df.at[i, '最近股價'] = price
        print(f"  {sid} {row['公司']} → {price}")
        updated += 1
    else:
        print(f"  {sid} {row['公司']} → 無資料（保留原值 {row['最近股價']}）")

OUTPUT_PATH = os.path.join(BASE_DIR, 'data', '興櫃的資料_updated.xlsx')
df.to_excel(OUTPUT_PATH, index=False)
print(f"\n完成！共更新 {updated}/{len(df)} 支股票股價，已存至 {OUTPUT_PATH}")
