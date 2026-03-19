import pandas as pd
import os
import json

# 由於本地環境可能缺少 playwright，我將邏輯改為：
# 1. 由 AI 代理執行瀏覽器抓取 DOM 
# 2. 將抓到的資料直接透過腳本過濾並產出 Excel

def save_to_excel(all_rows):
    target_path = r'c:\Users\xx8897\codespace\antigravity\台股文件\data\3月領取資格.xlsx'
    excluded = ["可零股，需特定方式領取", "不限股數皆可領取"]
    
    filtered_data = []
    for item in all_rows:
        sid = item.get("股號", "").strip()
        qual = item.get("領取資格", "").strip()
        
        if qual not in excluded and sid:
            filtered_data.append({"股號": sid, "領取資格": qual})
            
    if filtered_data:
        df = pd.DataFrame(filtered_data)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        df.to_excel(target_path, index=False)
        print(f"Excel created with {len(filtered_data)} rows at {target_path}")
    else:
        print("No matching rows after filtering.")

if __name__ == "__main__":
    # 此部分由主代理填入從 browser_subagent 拿到的完整 JSON 
    raw_json = """[RAW_DATA_PLACEHOLDER]"""
    if "[RAW_DATA_PLACEHOLDER]" not in raw_json:
        data = json.loads(raw_json)
        save_to_excel(data)
    else:
        print("Please provide data to the placeholder.")
