import os
import re
import json
from supabase import create_client, Client

# 連線設定 (直接使用與前端相同的 Pub Key)
url: str = 'https://jyoaoepcrqxzrtdkldfg.supabase.co'
key: str = 'sb_publishable_IFSxZWya1imWZQzNwg90ZA_msTvVbsg'

def fetch_and_save_items():
    print("Connecting to Supabase...")
    supabase: Client = create_client(url, key)
    
    print("Fetching five_year_gifts data...")
    response = supabase.table('stocks').select('five_year_gifts').execute()
    
    all_gifts_raw = []
    def extract_items(text):
        if not text: return []
        # 去除年份標記如 (2024) 並清理空白
        return [re.sub(r'^\(\d{4}\)', '', i.strip()).strip() for i in str(text).split('\n') if i.strip()]

    for row in response.data:
        gift_text = row.get('five_year_gifts')
        if gift_text:
            all_gifts_raw.extend(extract_items(gift_text))

    # 去重並過濾無效品項
    unique_gifts = sorted(set(all_gifts_raw))
    valid_gifts = [g for g in unique_gifts if g not in ['無', '-', '未發放', '不發放'] and g]
    
    print(f"Total unique valid gifts found: {len(valid_gifts)}")
    
    # 轉換為 Item Node 格式
    item_nodes = []
    for idx, gift_name in enumerate(valid_gifts):
        item_nodes.append({
            "id": f"item_{idx:04d}",
            "name": gift_name,
            "type": "item",
            "attributes": {
                "base_value": None, # 待分配
                "receiving_cost": 20 # 預設實體成本
            }
        })
        
    # 儲存為 JSON
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw_items.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(item_nodes, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully saved to {output_path}")

if __name__ == '__main__':
    fetch_and_save_items()
