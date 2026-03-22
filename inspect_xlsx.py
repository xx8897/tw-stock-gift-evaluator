import pandas as pd
import sys

try:
    df = pd.read_excel(r'c:\Users\xx8897\codespace\antigravity\台股文件\data\20260322公告.xlsx')
    print("Columns:", df.columns.tolist())
    print("\nFirst 10 rows:")
    print(df.head(10).to_string())
except Exception as e:
    print(f"Error: {e}")
