import pandas as pd
import os

def format_dates(file_path):
    if not os.path.exists(file_path):
        print(f"錯誤：找不到檔案 {file_path}")
        return

    print(f"正在處裡檔案：{file_path}")
    df = pd.read_excel(file_path)
    
    # 定義需要格式化的欄位
    date_cols = ['最後買進日', '股東會日期']
    
    for col in date_cols:
        if col in df.columns:
            # 先確保是 datetime 格式
            df[col] = pd.to_datetime(df[col], errors='coerce')
            # 格式化為字串 YYYY/MM/DD
            df[col] = df[col].dt.strftime('%Y/%m/%d')
            print(f"欄位 '{col}' 格式化完成。")
        else:
            print(f"找不到欄位 '{col}'。現有欄位：{df.columns.tolist()}")
            
    df.to_excel(file_path, index=False)
    print(f"檔案已儲存：{file_path}")

if __name__ == "__main__":
    target = r'c:\Users\xx8897\codespace\antigravity\台股文件\data\20260322公告.xlsx'
    format_dates(target)
