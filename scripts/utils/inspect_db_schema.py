import os
from dotenv import load_dotenv

# 載入 .env 檔案中的變數
load_dotenv()

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'application/openapi+json'
}

print("--- Inspecting Current DB Schema ---")
resp = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
if resp.status_code == 200:
    spec = resp.json()
    definitions = spec.get('definitions', {})
    print("Existing Tables/Views:", list(definitions.keys()))
    
    # Check user_stocks columns
    user_stocks = definitions.get('user_stocks', {}).get('properties', {})
    print("\nuser_stocks columns:", list(user_stocks.keys()))
    
    # Check top_stocks_30d columns
    top_stocks_30d = definitions.get('top_stocks_30d', {}).get('properties', {})
    print("top_stocks_30d columns:", list(top_stocks_30d.keys()))
else:
    print(f"Error: {resp.status_code} {resp.text}")
