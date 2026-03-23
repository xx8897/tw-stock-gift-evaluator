import pandas as pd
import re
import os

def clean_gift_text(text):
    if not isinstance(text, str):
        return text
    
    # 移除「參考圖」及其變體（如「參考圖圖」、「圖參考圖」等）
    # 使用正則表達式匹配包含「參考」和「圖」的重複組合
    text = re.sub(r'[參考圖]+', lambda m: '' if '參考' in m.group() or '圖' in m.group() else m.group(), text)
    
    # 重新精細化：直接移除「參考圖」三個字，不論重複幾次
    text = text.replace('參考圖', '')
    
    # 移除多餘的符號（例如重複的空格、換行或不正常的標點）
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 修飾文句：如果剩下「圖」或「參考」單字，也一併移除
    text = text.replace('參考', '').replace('圖', '')
    
    # 處理常見的複製貼上殘留，例如 &nbsp; 或其 unicode (\xa0)
    text = text.replace('\xa0', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def process_excel(file_path):
    if not os.path.exists(file_path):
        print(f"錯誤：找不到檔案 {file_path}")
        return

    print(f"正在處理檔案：{file_path}")
    df = pd.read_excel(file_path)
    
    if '股東會紀念品' in df.columns:
        original_sample = df['股東會紀念品'].head(5).tolist()
        df['股東會紀念品'] = df['股東會紀念品'].apply(clean_gift_text)
        cleaned_sample = df['股東會紀念品'].head(5).tolist()
        
        print("「股東會紀念品」欄位清理完成。")
        for orig, clean in zip(original_sample, cleaned_sample):
            print(f"  原始: {orig} -> 清理後: {clean}")
    else:
        print("警告：找不到「股東會紀念品」欄位。")
        print(f"現有欄位：{df.columns.tolist()}")
        
    df.to_excel(file_path, index=False)
    print(f"檔案已儲存：{file_path}")

if __name__ == "__main__":
    target = r'c:\Users\xx8897\codespace\antigravity\台股文件\data\20260322公告.xlsx'
    process_excel(target)
