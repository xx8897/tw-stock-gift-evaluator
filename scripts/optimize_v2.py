import pandas as pd
import os

file_path = 'data/2021-2025_推薦v2.xlsx'

if not os.path.exists(file_path):
    print(f"Error: 找不到檔案 {file_path}")
    exit(1)

# 刪除清單
delete_list = [
    1701, 2358, 2443, 2758, 2888, 3202, 3627, 4132, 4150, 4172, 4195, 4590, 4712, 4945, 
    5262, 5863, 6288, 6403, 6404, 6457, 6473, 6483, 6495, 6514, 6543, 6549, 6562, 6586, 
    6595, 6618, 6621, 6645, 6648, 6786, 6787, 6793, 6797, 6798, 6810, 6815, 6876, 6886, 
    7516, 7566, 7719, 8119, 8487
]
delete_list_str = [str(x) for x in delete_list]

# 改名清單
rename_map = {
    "1463": "強盛新",
    "2327": "國巨*",
    "2353": "宏碁",
    "2636": "台驊控股",
    "2887": "台新新光金",
    "3441": "聯一光",
    "3521": "台鋼建設",
    "4950": "金耘國際",
    "5314": "世紀*",
    "6111": "光聚晶電",
    "6265": "方土昶",
    "6902": "GOGOLOOK",
    "7780": "大研生醫*",
    "8080": "泰霖",
    "8087": "麗升能源"
}

try:
    print(f"正在讀取 {file_path}...")
    df = pd.read_excel(file_path)
    
    # 確保 '股號' 是字串格式
    df['股號'] = df['股號'].astype(str).str.split('.').str[0] # 處理可能出現的 .0
    
    # 1. 刪除股票
    original_count = len(df)
    df = df[~df['股號'].isin(delete_list_str)]
    deleted_count = original_count - len(df)
    print(f"已刪除 {deleted_count} 檔股票。")

    # 2. 改名
    rename_count = 0
    for stock_id, new_name in rename_map.items():
        mask = (df['股號'] == stock_id)
        if mask.any():
            df.loc[mask, '公司'] = new_name
            rename_count += 1
    
    print(f"已更新 {rename_count} 檔股票名稱。")

    # 3. 儲存檔案
    df.to_excel(file_path, index=False)
    print(f"成功將優化後的資料儲存至 {file_path}")

except Exception as e:
    print(f"執行時發生錯誤: {e}")
