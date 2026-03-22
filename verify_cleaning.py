import pandas as pd
df = pd.read_excel(r'c:\Users\xx8897\codespace\antigravity\台股文件\data\20260322公告.xlsx')
with open('cleaned_preview.txt', 'w', encoding='utf-8') as f:
    for item in df['股東會紀念品'].dropna():
        f.write(f"{item}\n")
