import os

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'application/openapi+json'
}

print("--- Fetching OpenAPI Definitions ---")
resp = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
if resp.status_code == 200:
    spec = resp.json()
    stocks_def = spec.get('definitions', {}).get('stocks', {})
    print(json.dumps(stocks_def, indent=2, ensure_ascii=False))
else:
    print(f"Error: {resp.status_code} {resp.text}")
