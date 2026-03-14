import pandas as pd
import requests
import os
import json
import math

# 配置資訊
SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
TABLE_NAME = 'stocks'
INPUT_FILE = 'data/2021-2025_推薦v2.xlsx'

# 嘗試從環境變數或 .secret 檔案讀取 Key
def get_service_key():
    key = os.environ.get('SUPABASE_SERVICE_KEY', '')
    if not key and os.path.exists('.secret'):
        try:
            with open('.secret', 'r', encoding='utf-8') as f:
                for line in f:
                    if line.startswith('SUPABASE_SERVICE_KEY='):
                        return line.split('=', 1)[1].strip()
        except:
            pass
    return key

SUPABASE_KEY = get_service_key()

def safe_float(val):
    try:
        v = float(val)
        return None if math.isnan(v) else float(round(v, 4))
    except (TypeError, ValueError):
        return None

def safe_int(val):
    try:
        return int(val)
    except (TypeError, ValueError):
        return None

def safe_str(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ''
    return str(val).strip()

def upload_data():
    if not SUPABASE_KEY:
        print("❌ 錯誤: 未設定 SUPABASE_SERVICE_KEY 環境變數。")
        return

    if not os.path.exists(INPUT_FILE):
        print(f"❌ 錯誤: 找不到檔案 {INPUT_FILE}")
        return

    print(f"正在讀取本地修復後的資料: {INPUT_FILE}...")
    df = pd.read_excel(INPUT_FILE)
    
    # 確保股號格式正確
    df['股號'] = df['股號'].astype(str).str.split('.').str[0]

    # 資料清理與轉換
    records = []
    print("正在轉換資料格式...")
    for _, row in df.iterrows():
        try:
            records.append({
                'stock_id':        str(row.get('股號', '')).strip(),
                'name':            safe_str(row.get('公司')),
                'price':           safe_float(row.get('最近股價')),
                'gift':            safe_str(row.get('上次紀念品')),
                'freq':            safe_int(row.get('五年內發放次數')),
                'cp':              safe_float(row.get('新版性價比')),
                'score':           safe_str(row.get('新版推薦評分')),
                'five_year_gifts': safe_str(row.get('五年發放紀念品')),
                'cond':            safe_str(row.get('去年條件')),
                'five_year_total': safe_float(row.get('五年紀念品總估值')),
                'last_issued':     safe_str(row.get('最近一次發放')),
            })
        except Exception as e:
            print(f"解析股號 {row.get('股號')} 時出錯: {e}")

    # 分批上傳前，先清空舊資料 (因為有股票被刪除，不能只用 upsert)
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # 1. 刪除所有現有資料
    print("🧹 正在清理 Supabase 中的舊資料...")
    del_url = f'{SUPABASE_URL}/rest/v1/{TABLE_NAME}?stock_id=not.is.null'
    del_resp = requests.delete(del_url, headers=headers)
    if del_resp.status_code not in (200, 204):
        print(f"⚠️ 清理舊資料失敗: {del_resp.status_code} {del_resp.text}")
        print("停止上傳以避免資料混亂。")
        return

    # 2. 分批上傳新資料
    BATCH_SIZE = 100
    total = len(records)
    total_batches = math.ceil(total / BATCH_SIZE)
    
    # 加入 upsert 模式的 Prefer header (雖然已清空，但保留以防衝突)
    upload_headers = headers.copy()
    upload_headers['Prefer'] = 'resolution=merge-duplicates'
    
    url = f'{SUPABASE_URL}/rest/v1/{TABLE_NAME}?on_conflict=stock_id'
    
    print(f"🚀 開始上傳至 Supabase ({total} 筆資料)...")
    success_count = 0
    for i in range(total_batches):
        start_idx = i * BATCH_SIZE
        end_idx = min((i + 1) * BATCH_SIZE, total)
        batch = records[start_idx:end_idx]
        
        try:
            resp = requests.post(url, headers=upload_headers, data=json.dumps(batch))
            if resp.status_code in (200, 201):
                success_count += len(batch)
                print(f'   ✅ 批次 {i+1}/{total_batches} 上傳成功 ({len(batch)} 筆)')
            else:
                print(f'   ❌ 批次 {i+1}/{total_batches} 失敗: {resp.status_code} {resp.text[:200]}')
        except Exception as e:
            print(f'   ❌ 批次 {i+1}/{total_batches} 發生異常: {e}')

    print(f'\n✨ 同步完成！成功更新 Supabase {success_count}/{total} 筆資料。')

if __name__ == "__main__":
    upload_data()
