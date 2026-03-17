import pandas as pd
import os

# 路徑設定
base_dir = r"c:\Users\xx8897\codespace\antigravity\台股文件"
data_dir = os.path.join(base_dir, "data")
total_list_path = os.path.join(data_dir, "股票總表2026.xlsx")
source_data_path = os.path.join(data_dir, "2021-2025.xlsx")
output_path = os.path.join(data_dir, "興櫃的資料.xlsx")

print("正在讀取股票總表...")
df_total = pd.read_excel(total_list_path)

# 篩選興櫃股票
# 標竿：市場別包含 '興櫃'
emerging_stocks = df_total[df_total['市場別'].str.contains('興櫃', na=False)]
emerging_ids = set(emerging_stocks['證券代號'].astype(str).str.strip())

print(f"找到 {len(emerging_ids)} 支興櫃股票。")

print("正在讀取原始資料表 (2021-2025)...")
# 因為原始表結構可能較亂（如沒有標題或標題在第 N 列），這裡先嘗試讀取
df_source = pd.read_excel(source_data_path)

# 偵測哪一個欄位包含股票代號
# 我們搜尋 columns 找出哪一欄的值出現在 emerging_ids 中最頻繁
id_col = None
max_overlap = -1

for col in df_source.columns:
    overlap = df_source[col].astype(str).str.strip().isin(emerging_ids).sum()
    if overlap > max_overlap:
        max_overlap = overlap
        id_col = col

if id_col is not None and max_overlap > 0:
    print(f"偵測到 ID 欄位為: '{id_col}'，符合件數: {max_overlap}")
    # 執行篩選
    df_filtered = df_source[df_source[id_col].astype(str).str.strip().isin(emerging_ids)]
    
    # 儲存結果
    print(f"正在將 {len(df_filtered)} 筆資料存入 {output_path}...")
    df_filtered.to_excel(output_path, index=False)
    print("完成！")
else:
    print("錯誤：無法在來源表中找到對應的興櫃股票代號。")
