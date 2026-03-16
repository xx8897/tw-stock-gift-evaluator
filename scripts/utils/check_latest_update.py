import os, requests
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
}

try:
    # 取得最近更新的 5 筆
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/stocks?select=stock_id,updated_at&order=updated_at.desc&limit=5", headers=headers)
    resp.raise_for_status()
    data = resp.json()
    
    print("Latest updates in Supabase:")
    for d in data:
        print(f"  {d['stock_id']}: {d.get('updated_at')}")
        
except Exception as e:
    print(f"Error: {e}")
