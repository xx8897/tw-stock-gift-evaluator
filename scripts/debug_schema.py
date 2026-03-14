import requests
import os

# 模擬環境變數 (實際會從 .secret 或環境中取得)
SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5b2FvZXBjcnF4enJ0ZGtsZGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg2MjEwNiwiZXhwIjoyMDg4NDM4MTA2fQ.BFxnlPwH89UlJWbTj07lLm0rZgsMgnvCyxnfXTZ8Xhs"

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
