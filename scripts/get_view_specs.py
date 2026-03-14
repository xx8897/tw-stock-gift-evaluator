import requests
import json

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5b2FvZXBjcnF4enJ0ZGtsZGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg2MjEwNiwiZXhwIjoyMDg4NDM4MTA2fQ.BFxnlPwH89UlJWbTj07lLm0rZgsMgnvCyxnfXTZ8Xhs"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Accept': 'application/openapi+json'
}

print("--- Fetching View Definitions ---")
resp = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
if resp.status_code == 200:
    spec = resp.json()
    views = ['top_stocks_30d', 'top_owned_stocks', 'top_interest_stocks']
    for v in views:
        print(f"\n--- View: {v} ---")
        v_def = spec.get('definitions', {}).get(v, {})
        print(json.dumps(v_def, indent=2, ensure_ascii=False))
else:
    print(f"Error: {resp.status_code} {resp.text}")
