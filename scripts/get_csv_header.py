import requests

SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5b2FvZXBjcnF4enJ0ZGtsZGZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjg2MjEwNiwiZXhwIjoyMDg4NDM4MTA2fQ.BFxnlPwH89UlJWbTj07lLm0rZgsMgnvCyxnfXTZ8Xhs"

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
