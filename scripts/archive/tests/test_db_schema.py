import os
import requests
from dotenv import load_dotenv

# 載入 .env 檔案中的變數
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyoaoepcrqxzrtdkldfg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'application/openapi+json'
}

print("--- Inspecting Current DB Schema ---")
try:
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers, timeout=10)
    if resp.status_code == 200:
        spec = resp.json()
        definitions = spec.get('definitions', {})
        print("Existing Tables/Views:", list(definitions.keys()))
        
        for table in ['stocks', 'user_stocks', 'top_stocks_30d']:
            if table in definitions:
                cols = definitions.get(table, {}).get('properties', {})
                print(f"\n[{table}] columns:", list(cols.keys()))
    else:
        print(f"Error: {resp.status_code} {resp.text}")
except Exception as e:
    print(f"Exception: {e}")
