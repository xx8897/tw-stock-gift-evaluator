import sys
import os
import json

# 加入 sys.path 以便 import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from scripts.core.valuation_v4_4 import estimate_gift_value as v4_estimate
from scripts.core.valuation_v5 import estimate_gift_value_v5 as v5_estimate

def verify():
    with open('gift_tree/raw_items.json', 'r', encoding='utf-8') as f:
        raw_items = json.load(f)
        
    gifts = set()
    for item in raw_items:
        name = item.get('name', '').strip()
        if name and name not in ['無', '-', '未發放', '不發放']:
            gifts.add(name)
                
    gifts = sorted(list(gifts))
    print(f"總驗證品項數：{len(gifts)}")
    
    diff_count = 0
    v5_unclassified = 0
    v4_unclassified = 0
    
    diff_samples = []
    
    for g in gifts:
        val4 = v4_estimate(g)
        val5 = v5_estimate(g)
        
        # 簡單判定未分類 (V4 預設 40-20=20 或 40；V5 預設 40-20=20 或 40)
        # 這裡為了單純，我們直接看最終給出的值是不是 20 或 40
        if val4 in [20, 40]: v4_unclassified += 1
        if val5 in [20, 40]: v5_unclassified += 1
        
        if val4 != val5:
            diff_count += 1
            if len(diff_samples) < 15:
                diff_samples.append((g, val4, val5))
                
    print(f"V4.4 潛在未分類量: {v4_unclassified}")
    print(f"V5 潛在未分類量: {v5_unclassified}")
    print(f"估值差異品項數: {diff_count} ({diff_count/len(gifts)*100:.1f}%)")
    
    print("\n--- 差異抽樣 (前 15 筆) ---")
    print(f"{'品名':<25} | {'V4.4':<6} | {'V5':<6}")
    print("-" * 45)
    for g, v4, v5 in diff_samples:
        print(f"{g:<25} | {v4:<6} | {v5:<6}")
        
if __name__ == '__main__':
    verify()
