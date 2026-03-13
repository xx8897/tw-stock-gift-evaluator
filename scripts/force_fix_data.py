import pandas as pd
import os

def force_sync():
    source_path = 'data/2021-2025.xlsx'
    dest_path = 'data/2021-2025_推薦評分.xlsx'
    
    print(f"Loading source: {source_path}")
    df_src = pd.read_excel(source_path)
    # 確保股號是字串且乾淨
    df_src['股號'] = df_src['股號'].astype(str).str.strip()
    
    print(f"Loading destination: {dest_path}")
    df_dest = pd.read_excel(dest_path)
    df_dest['股號'] = df_dest['股號'].astype(str).str.strip()
    
    # 建立映射表
    name_map = df_src.set_index('股號')['公司'].to_dict()
    gift_map = df_src.set_index('股號')['五年發放紀念品'].to_dict() 
    
    # 再次檢查源檔案欄位名，因為 log 顯示五年發放紀念品可能有名稱差異
    src_cols = df_src.columns.tolist()
    gift_col_src = next((c for c in src_cols if '五年發放紀念品' in c), None)
    
    if not gift_col_src:
        print(f"Error: Could not find gift column in source. Available: {src_cols}")
        return
    
    gift_map = df_src.set_index('股號')[gift_col_src].to_dict()
    
    print(f"Force updating {len(df_dest)} rows...")
    
    # 強制覆蓋
    df_dest['公司'] = df_dest['股號'].map(name_map).fillna(df_dest['公司'])
    df_dest['五年發放紀念品'] = df_dest['股號'].map(gift_map).fillna(df_dest['五年發放紀念品'])
    
    print(f"Saving to {dest_path}...")
    df_dest.to_excel(dest_path, index=False)
    print("Done!")

if __name__ == "__main__":
    force_sync()
