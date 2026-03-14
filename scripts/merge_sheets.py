import pandas as pd
import os

file_path = r'data/股票總表2026.xlsx'

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

try:
    # 讀取現有的工作表
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names
    print(f"現有工作表: {sheet_names}")

    # 讀取資料
    df1 = pd.read_excel(file_path, sheet_name='工作表1')
    df2 = pd.read_excel(file_path, sheet_name='工作表2')

    # 合併資料
    df_total = pd.concat([df1, df2], ignore_index=True)
    print(f"合併完成，總共 {len(df_total)} 筆資料。")

    # 寫回檔案，包含原有的工作表跟新的總表
    with pd.ExcelWriter(file_path, engine='openpyxl', mode='a', if_sheet_exists='replace') as writer:
        df_total.to_excel(writer, sheet_name='總表', index=False)
    
    print("成功建立 '總表' 工作表。")

except Exception as e:
    print(f"執行時發生錯誤: {e}")
