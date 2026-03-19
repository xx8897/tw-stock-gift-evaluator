import requests
import os
from dotenv import load_dotenv

# 載入 .env 檔案中的變數
load_dotenv()

# 模擬環境變數 (實際會從 .secret 或環境中取得)
SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

# 查詢表格定義 (PostgREST 不直接支援 info_schema，但我們可以用 head 或 OPTIONS)
print("--- Checking table structure via OPTIONS ---")
resp = requests.options(f"{SUPABASE_URL}/rest/v1/stocks", headers=headers)
print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('Content-Type')}")
print(resp.text[:500])

print("\n--- Checking first row (even if empty) ---")
resp = requests.get(f"{SUPABASE_URL}/rest/v1/stocks?limit=1", headers=headers)
print(f"Status: {resp.status_code}")
print(f"Body: {resp.json() if resp.status_code == 200 else resp.text}")
