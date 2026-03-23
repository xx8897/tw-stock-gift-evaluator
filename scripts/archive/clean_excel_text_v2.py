import pandas as pd
import re
import os

def clean_gift_text_safe(text):
    if not isinstance(text, str):
        return text
    
    # 1. 移除 「參考圖」及其連帶的贅字（如「參考圖圖」、「圖參考圖」）
    # 使用更精準的匹配
    text = re.sub(r'(參考圖|圖參考|參考|圖)+', lambda m: '' if '參考圖' in m.group() or m.group() in ['參考圖', '參考', '圖'] else m.group(), text)
    
    # 實際上，使用者說的是「把『參考圖』三個字也寫進去了」
    # 所以我們先針對「參考圖」進行替換
    text = text.replace('參考圖', '')
    
    # 2. 移除多餘的空白與網頁殘留字元
    text = text.replace('\xa0', ' ')
    text = re.sub(r'\s+', ' ', text).strip()
    
    # 3. 檢查文句合理性（針對結尾不自然的括號或斷句進行修飾）
    # 例如：移除結尾的「(將以)」或「將以)」等多餘斷句
    text = re.sub(r'\(?屆時如不足,?將以\)?$', '', text)
    text = re.sub(r'\(?將以\)?$', '', text)
    
    # 4. 移除結尾的孤立標點
    text = text.strip(' ,，。( )')
    
    return text

def process_excel(file_path):
    df = pd.read_excel(file_path)
    
    if '股東會紀念品' in df.columns:
        df['股東會紀念品'] = df['股東會紀念品'].apply(clean_gift_text_safe)
        
    df.to_excel(file_path, index=False)
    print(f"安全版清理完成並儲存：{file_path}")

if __name__ == "__main__":
    target = r'c:\Users\xx8897\codespace\antigravity\台股文件\data\20260322公告.xlsx'
    process_excel(target)
