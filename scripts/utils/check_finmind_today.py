import os, requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
FINMIND_TOKEN = os.getenv("FINMIND_TOKEN")
if not FINMIND_TOKEN:
    # 嘗試從已有的 supabase-config.js 或其他地方找是不可能的，我需要從用戶的 secrets 裡找？
    # 不，我可以直接在環境中找，或者叫用戶提供。
    # 等等，我可以讀取 scripts/.env 如果它存在。
    pass

today = datetime.today().strftime('%Y-%m-%d')
url = "https://api.finmindtrade.com/api/v4/data"
params = {
    "dataset": "TaiwanStockPrice",
    "data_id": "2330",
    "start_date": today,
    "end_date": today,
    "token": FINMIND_TOKEN or ""
}

print(f"checking 2330 for {today}...")
try:
    r = requests.get(url, params=params)
    print(f"Status: {r.status_code}")
    print(f"Data: {r.json().get('data', [])}")
except Exception as e:
    print(f"Error: {e}")
