import os
import requests

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'text/csv'
}

print("--- Fetching Table Headers via CSV ---")
resp = requests.get(f"{SUPABASE_URL}/rest/v1/stocks?limit=1", headers=headers)
if resp.status_code == 200:
    print(resp.text.split('\n')[0])
else:
    print(f"Error: {resp.status_code} {resp.text}")
