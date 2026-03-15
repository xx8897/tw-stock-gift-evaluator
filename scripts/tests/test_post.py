import os
from dotenv import load_dotenv

# 載入 .env 檔案中的變數
load_dotenv()

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print("--- Attempting Invalid POST to reveal columns ---")
# 提交一個顯然錯誤的欄位
resp = requests.post(f"{SUPABASE_URL}/rest/v1/stocks", headers=headers, data=json.dumps({"non_existent_column": "value"}))
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")
