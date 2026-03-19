import os
import sys
import time
import argparse
import pandas as pd
import requests
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 載入環境變數
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
TABLE_NAME = "stocks"

def main():
    parser = argparse.ArgumentParser(description="Update special stock conditions to Supabase")
    parser.add_argument("--execute", action="store_true", help="Actual update to Supabase. If not set, run in dry-run mode.")
    args = parser.parse_args()

    is_dry_run = not args.execute

    print(f"--- 啟動更新特殊條件作業 ({'Dry Run 模擬執行' if is_dry_run else '正式更新'}) ---")

    if not SUPABASE_KEY or not SUPABASE_URL:
        print("錯誤：找不到 Supabase 環境變數")
        return

    # 1. 讀取 Excel
    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    excel_path = os.path.join(_BASE_DIR, 'data', '特殊領取資格彙整.xlsx')
    
    if not os.path.exists(excel_path):
        print(f"找不到檔案：{excel_path}")
        return
        
    print(f"讀取 Excel 資料: {excel_path}")
    df_excel = pd.read_excel(excel_path)
    # 確保欄位型別
    if '股票代號' not in df_excel.columns or '領取資格' not in df_excel.columns:
        print(f"錯誤：Excel 找不到必要的 '股票代號' 或 '領取資格' 欄位。現有欄位: {df_excel.columns.tolist()}")
        return
        
    df_excel['股票代號'] = df_excel['股票代號'].astype(str).str.strip()
    
    # 過濾掉 nan 或為空的領取資格
    valid_records = []
    for _, row in df_excel.iterrows():
        stock_id = row['股票代號']
        special_cond = str(row['領取資格']).strip()
        
        # 跳過 numpy.nan 等無效字串
        if pd.isna(row['領取資格']) or special_cond == 'nan' or not special_cond:
            continue
            
        valid_records.append((stock_id, special_cond))
            
    print(f"Excel 中共有 {len(valid_records)} 筆有效的特殊條件記錄。")

    # 2. 獲取 Supabase 上的股票資料
    print("從 Supabase 拉取現有的股票 cond 欄位資料...")
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    
    # 取得現有資料 (因為只有1千多筆所以一次全抓)
    url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=stock_id,cond"
    resp = requests.get(url, headers=headers, timeout=30)
    if resp.status_code >= 400:
        print(f"獲取 Supabase 資料失敗: {resp.text}")
        return
        
    supa_data = resp.json()
    supa_dict = {str(item['stock_id']).strip(): str(item.get('cond') or "").strip() for item in supa_data}
    print(f"成功拉取 {len(supa_dict)} 筆 Supabase 股票記錄。")

    # 3. 比對與組裝新字串
    update_targets = []
    
    for stock_id, special_cond in valid_records:
        if stock_id not in supa_dict:
            print(f"  [警告] 股票 {stock_id} 在 Supabase 中找不到，跳過。")
            continue
            
        current_cond = supa_dict[stock_id]
        
        # 若是 current_cond 本身為 'nan' 也清空
        if current_cond.lower() == 'nan':
            current_cond = ""

        # 判斷是否需要附加
        if special_cond in current_cond:
            # 已經包含此條件
            continue
            
        # 組裝新的條件字串
        if not current_cond:
            new_cond = f"【特殊條件】: {special_cond}"
        else:
            new_cond = f"{current_cond}\n【特殊條件】: {special_cond}"
            
        update_targets.append({
            'stock_id': stock_id,
            'old_cond': current_cond,
            'new_cond': new_cond
        })

    print(f"比對完成：共有 {len(update_targets)} 筆記錄需要更新。")
    
    if is_dry_run:
        print("\n--- Dry Run 預覽前 5 筆變更 ---")
        for target in update_targets[:5]:
            print(f"股票代號: {target['stock_id']}")
            if target['old_cond']:
                print(f"變更前:\n{target['old_cond']}")
            else:
                print(f"變更前: (空)")
            print(f"變更後:\n{target['new_cond']}")
            print("-" * 30)
        print("這只是模擬執行，請加上 --execute 參數來寫入資料庫。")
        return

    # 4. 實際更新到 Supabase
    if update_targets:
        print("\n開始寫入變更至 Supabase...")
        patch_headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
        
        success_count = 0
        current_ts = time.strftime('%Y-%m-%dT%H:%M:%S+08:00', time.localtime())
        
        for idx, target in enumerate(update_targets, 1):
            stock_id = target['stock_id']
            new_cond = target['new_cond']
            
            patch_url = f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?stock_id=eq.{stock_id}"
            payload = {
                'cond': new_cond,
                'updated_at': current_ts
            }
            
            try:
                r = requests.patch(patch_url, headers=patch_headers, json=payload, timeout=10)
                r.raise_for_status()
                success_count += 1
                if idx % 10 == 0 or idx == len(update_targets):
                    print(f"  已更新 {idx} / {len(update_targets)} 筆...")
            except Exception as e:
                print(f"  [錯誤] 更新股票 {stock_id} 失敗: {e}")
                
        print(f"更新完成！成功更新 {success_count} / {len(update_targets)} 筆。")
    else:
        print("沒有需要更新的資料。")

if __name__ == "__main__":
    main()
