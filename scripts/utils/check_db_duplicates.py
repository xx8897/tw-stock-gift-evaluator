import os, requests
from dotenv import load_dotenv

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

print(f"Checking Supabase: {SUPABASE_URL}")
try:
    # 取得所有 stock_id
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/stocks?select=stock_id", headers=headers)
    resp.raise_for_status()
    data = resp.json()
    
    total_count = len(data)
    unique_ids = set(d['stock_id'] for d in data if d.get('stock_id'))
    unique_count = len(unique_ids)
    
    print(f"Total rows in DB: {total_count}")
    print(f"Unique stock_ids: {unique_count}")
    
    if total_count != unique_count:
        print(f"Detected {total_count - unique_count} duplicate stock_id entries!")
        # 找出哪些是重複的
        from collections import Counter
        counts = Counter(d['stock_id'] for d in data)
        duplicates = {k: v for k, v in counts.items() if v > 1}
        print(f"Duplicate details: {duplicates}")
        
except Exception as e:
    print(f"Error: {e}")
