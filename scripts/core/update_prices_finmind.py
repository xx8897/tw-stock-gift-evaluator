import os, requests, random, time, sys
from datetime import datetime
from dotenv import load_dotenv

# 引入同目錄的估值模組
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from valuation import estimate_5year_total, calc_v4_cp, calc_v4_score

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
FINMIND_TOKEN = os.getenv("FINMIND_TOKEN")
FINMIND_URL = "https://api.finmindtrade.com/api/v4/data"
TABLE_NAME = "stocks"
BATCH_LIMIT = 200

# ── 環境變數驗證 ──
for var, val in [("SUPABASE_URL", SUPABASE_URL), ("SUPABASE_SERVICE_KEY", SUPABASE_KEY), ("FINMIND_TOKEN", FINMIND_TOKEN)]:
    if not val:
        print(f"ERROR: 環境變數 {var} 未設定，請檢查 .env 或 GitHub Secrets。")
        exit(1)

today = datetime.today().strftime('%Y-%m-%d')

supa_read_headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}
supa_write_headers = {
    **supa_read_headers,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates'
}

def fetch_close(stock_id):  # 不加型別提示以相容 Python 3.8+
    """查詢 FinMind 今日收盤價，無資料回傳 None。"""
    params = {"dataset": "TaiwanStockPrice", "data_id": stock_id,
              "start_date": today, "end_date": today, "token": FINMIND_TOKEN}
    r = requests.get(FINMIND_URL, params=params, timeout=15)
    r.raise_for_status()
    data = r.json().get("data", [])
    return float(data[-1]["close"]) if data else None

# ── Step 1: 哨兵偵測 ──
canary = fetch_close("2330")
if canary is None:
    print(f"[{today}] 無交易資料，今天可能是假日，腳本安全結束。")
    exit(0)
print(f"[哨兵] 台積電 2330 今日收盤 {canary}，確認今日有開市。")

# ── Step 2: 從 Supabase 取 updated_at 最舊的 200 支 ──
# Supabase 查詢語法：?select=*&order=updated_at.asc&limit=200
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
    headers=supa_read_headers,
    params={"select": "*", "order": "updated_at.asc", "limit": BATCH_LIMIT},
    timeout=30
)
resp.raise_for_status()
stocks = resp.json()
print(f"共取得 {len(stocks)} 支股票待更新。")

# ── Step 3: 逐支查詢 FinMind，重算估值，組 upsert payload ──
# 處理時區問題：GitHub Actions 是 UTC，需轉換為台灣時間 (+08:00)
from datetime import timedelta
tw_time = datetime.utcnow() + timedelta(hours=8)
current_ts = tw_time.strftime('%Y-%m-%dT%H:%M:%S+08:00')
upsert_batch = []

for stock in stocks:
    stock_id = stock.get("stock_id", "")
    time.sleep(random.uniform(0.1, 0.2))  # 安全間隔

    new_price = fetch_close(stock_id)
    if new_price is None:
        print(f"  {stock_id} → 無收盤資料，跳過。")
        continue

    # 用現有 gift/freq/cond 重新估值
    row = {
        '最近股價': new_price,
        '五年發放紀念品': stock.get('five_year_gifts', ''),
        '五年內發放次數': stock.get('freq', 0),
        '去年條件': stock.get('cond', ''),
    }
    row['新版五總估'] = estimate_5year_total(row['五年發放紀念品'])
    row['新版性價比'] = calc_v4_cp(row)
    row['新版推薦評分'] = calc_v4_score(row)

    # 組裝 UPSERT 資料：保留所有原始欄位，僅更新變動部分
    payload = {**stock}  # 複製原始資料
    payload.update({
        'price': float(new_price),
        'five_year_total': float(row['新版五總估']),
        'cp': float(row['新版性價比']),
        'score': str(row['新版推薦評分']),
        'updated_at': current_ts,
    })
    upsert_batch.append(payload)
    print(f"  {stock_id} → {new_price} | cp={row['新版性價比']} | {row['新版推薦評分']}")

# ── Step 4: Upsert 回 Supabase（stock_id 為 Key，merge duplicates）──
if not upsert_batch:
    print("本次無任何資料需要更新，結束。")
    exit(0)

resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
    headers=supa_write_headers,
    json=upsert_batch,
    timeout=60
)
if resp.status_code >= 400:
    print(f"UPSERT 失敗: {resp.status_code} {resp.text}")
    exit(1)
print(f"✓ 成功寫入 {len(upsert_batch)} 筆資料至 Supabase。")
