import os, requests, random, time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
FINMIND_TOKEN = os.getenv("FINMIND_TOKEN")
FINMIND_URL = "https://api.finmindtrade.com/api/v4/data"
today = datetime.today().strftime('%Y-%m-%d')

def fetch_close_price(stock_id):
    """查詢單支股票今日收盤價。無資料回傳 None。"""
    params = {
        "dataset": "TaiwanStockPrice",
        "data_id": stock_id,
        "start_date": today,
        "end_date": today,
        "token": FINMIND_TOKEN,
    }
    resp = requests.get(FINMIND_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json().get("data", [])
    if not data:
        return None
    return float(data[-1]["close"])  # 取最後一筆的 close 欄位

# ── Step 1: 哨兵偵測 ──
# 用台積電 (2330) 判斷今日是否為交易日
# 台積電不在我們的名單中，但 FinMind 必定有資料，適合作哨兵
canary_price = fetch_close_price("2330")
if canary_price is None:
    print(f"[{today}] 今天無交易資料（假日或收市前），腳本結束。")
    exit(0)
print(f"[哨兵] 台積電 (2330) 今日收盤：{canary_price} → 今天有開市 ✓")

# ── Step 2: 測試抓取 5 支股票 ──
test_stocks = ['2412', '0056', '2882', '1301', '2317']
for stock_id in test_stocks:
    time.sleep(random.uniform(0.1, 0.2))
    price = fetch_close_price(stock_id)
    if price is None:
        print(f"  {stock_id} → 無資料（跳過）")
    else:
        print(f"  {stock_id} → 收盤價 {price}")
