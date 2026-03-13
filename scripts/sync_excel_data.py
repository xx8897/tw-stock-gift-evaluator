import pandas as pd
import os

def sync_data():
    source_file = 'data/2021-2025.xlsx'
    dest_file = 'data/2021-2025_推薦評分.xlsx'
    
    print(f"Reading {source_file}...")
    df_src = pd.read_excel(source_file)
    
    print(f"Reading {dest_file}...")
    df_dest = pd.read_excel(dest_file)
    
    # 建立股號對應表，用於快速查詢正確的中文字內容
    # 欄位：股號 -> {公司, 五年發放紀念品}
    mapping = df_src.set_index('股號')[['公司', '五年發放紀念品']].to_dict('index')
    
    update_count = 0
    missing_ids = []
    
    print("Processing updates...")
    
    for idx, row in df_dest.iterrows():
        stock_id = row['股號']
        if stock_id in mapping:
            correct_info = mapping[stock_id]
            
            # 檢查是否有變動 (用於統計)
            changed = False
            if str(df_dest.at[idx, '公司']) != str(correct_info['公司']):
                df_dest.at[idx, '公司'] = correct_info['公司']
                changed = True
                
            if str(df_dest.at[idx, '五年發放紀念品']) != str(correct_info['五年發放紀念品']):
                df_dest.at[idx, '五年發放紀念品'] = correct_info['五年發放紀念品']
                changed = True
            
            if changed:
                update_count += 1
        else:
            missing_ids.append(stock_id)
            
    print(f"Saving updated data to {dest_file}...")
    df_dest.to_excel(dest_file, index=False)
    
    print("-" * 30)
    print(f"Processing Complete!")
    print(f"Total Rows in Dest: {len(df_dest)}")
    print(f"Actually Fixed Rows (Text Changes): {update_count}")
    if missing_ids:
        print(f"Warning: {len(missing_ids)} stock IDs not found in source file.")
        if len(missing_ids) < 10:
            print(f"Missing IDs: {missing_ids}")
    print("-" * 30)

if __name__ == "__main__":
    sync_data()
