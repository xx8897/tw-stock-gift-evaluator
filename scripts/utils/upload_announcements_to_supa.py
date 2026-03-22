import pandas as pd
import requests
import time
import os
import sys
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://jyoaoepcrqxzrtdkldfg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
TABLE_NAME = "announcements"

# 設定檔案路徑
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(_BASE_DIR, '..', 'data', '20260322公告.xlsx')

def upload_announcements():
    if not SUPABASE_KEY:
        print("ERROR: SUPABASE_SERVICE_KEY 遺失，無法連線。")
        return

    if not os.path.exists(INPUT_FILE):
        print(f"ERROR: 找不到檔案 {INPUT_FILE}")
        return

    print(f"讀取資料: {INPUT_FILE}")
    df = pd.read_excel(INPUT_FILE)
    
    # 確保必要欄位存在
    required_cols = ['代號', '名稱', '股東會日期']
    for col in required_cols:
        if col not in df.columns:
            print(f"ERROR: 缺少必要欄位 '{col}'")
            return

    upsert_data = []
    current_ts = time.strftime('%Y-%m-%dT%H:%M:%S+08:00', time.localtime())

    print("處理資料轉換...")
    for index, row in df.iterrows():
        try:
            # 代號強制轉字串
            stock_id = str(row['代號']).strip()
            if not stock_id or stock_id == 'nan':
                continue
            
            # 轉換日期
            # 如果已經是 YYYY/MM/DD 或 datetime，轉為標準 YYYY-MM-DD
            meeting_date = pd.to_datetime(row['股東會日期']).strftime('%Y-%m-%d')
            
            last_buy_date = None
            if pd.notna(row.get('最後買進日')):
                last_buy_date = pd.to_datetime(row['最後買進日']).strftime('%Y-%m-%d')

            gift = str(row.get('股東會紀念品', '')).strip()
            if gift == 'nan':
                gift = ''

            meeting_type = str(row.get('性質', '')).strip()
            if meeting_type == 'nan':
                meeting_type = ''

            name = str(row['名稱']).strip()

            entry = {
                'stock_id': stock_id,
                'name': name,
                'last_buy_date': last_buy_date,
                'meeting_date': meeting_date,
                'meeting_type': meeting_type,
                'gift': gift,
                'updated_at': current_ts
            }
            upsert_data.append(entry)
            
        except Exception as e:
            print(f"處理第 {index+2} 列時發生錯誤: {e}")
            continue

    print(f"準備上傳 {len(upsert_data)} 筆紀錄到 Supabase...")

    # 每 100 筆為一批上傳
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' # 遇到 (stock_id, meeting_date) 相同時更新
    }
    
    batch_size = 100
    for i in range(0, len(upsert_data), batch_size):
        batch = upsert_data[i:i + batch_size]
        resp = requests.post(url, headers=headers, json=batch, timeout=30)
        
        if resp.status_code >= 400:
            print(f"上傳錯誤 (批次 {i//batch_size + 1}): {resp.status_code} - {resp.text}")
        else:
            print(f"已成功上傳批次 {i//batch_size + 1} ({len(batch)} 筆)")

    print("✅ 處理完成！")

if __name__ == "__main__":
    upload_announcements()
