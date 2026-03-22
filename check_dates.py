import pandas as pd
df = pd.read_excel(r'c:\Users\xx8897\codespace\antigravity\台股文件\data\20260322公告.xlsx')
print("Columns:", df.columns.tolist())
print(df[['最後買進日', '股東會日']].head(5))
