import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyoaoepcrqxzrtdkldfg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

url = f"{SUPABASE_URL}/rest/v1/{os.getenv('TABLE_NAME', 'stocks')}?select=*&limit=1"
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}'
}

print("--- Fetching one row from 'stocks' ---")
resp = requests.get(url, headers=headers)
if resp.status_code == 200:
    data = resp.json()
    if data:
        print(json.dumps(data[0], indent=2))
    else:
        print("Table is empty.")
else:
    print(f"Error: {resp.status_code} {resp.text}")
