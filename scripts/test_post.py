import requests
import json

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5b2FvZXBjcnF4enJ0ZGtsZGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg2MjEwNiwiZXhwIjoyMDg4NDM4MTA2fQ.BFxnlPwH89UlJWbTj07lLm0rZgsMgnvCyxnfXTZ8Xhs"

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
