import json
import os
import sys

# 將當前目錄加入 path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_simulation():
    from app import load_json, TREE_FILE, RAW_ITEMS_FILE, OVERRIDES_FILE, classify_item_dfs, resolve_value_multiplier, resolve_base_value

    tree = load_json(TREE_FILE)
    raw_items = load_json(RAW_ITEMS_FILE)

    if not tree or not raw_items:
        print("❌ 找不到 tree.json 或 raw_items.json")
        return

    node_map = {}
    def build_map(node, parent_id=None):
        node['_parent_id'] = parent_id
        node_map[node['id']] = node
        for child in node.get('children', []):
            build_map(child, node['id'])
    build_map(tree)

    results = {}
    unclassified = []
    overrides = load_json(OVERRIDES_FILE) or {}

    for item in raw_items:
        item_name = item['name']
        item_id = str(item['id'])
        matched_id, captured_val = classify_item_dfs(item_name, tree)

        if matched_id:
            if matched_id not in results:
                results[matched_id] = []
            multiplier = resolve_value_multiplier(matched_id, node_map)
            
            if item_id in overrides:
                base_val = float(overrides[item_id])
            elif captured_val is not None:
                base_val = captured_val * multiplier
            else:
                base_val = resolve_base_value(matched_id, node_map) * multiplier
                
            base_val = round(base_val, 1)
            if base_val.is_integer():
                base_val = int(base_val)
                
            results[matched_id].append({
                "name": item['name'],
                "resolved_base_value": base_val
            })
        else:
            unclassified.append(item['name'])

    total = len(raw_items)
    classified_count = sum(len(v) for v in results.values())
    unclassified_count = len(unclassified)

    print("="*40)
    print("📊 V5 估值引擎分類模擬報告")
    print("="*40)
    print(f"總項目數: {total}")
    print(f"✅ 已分類: {classified_count} ({classified_count/total*100:.1f}%)")
    print(f"❓ 未分類: {unclassified_count} ({unclassified_count/total*100:.1f}%)")
    print("\n[各分類數量]")
    
    # 依數量排序輸出
    sorted_results = sorted(results.items(), key=lambda x: len(x[1]), reverse=True)
    for node_id, items in sorted_results:
        node_name = node_map.get(node_id, {}).get('name', node_id)
        print(f"- {node_name}: {len(items)} 件")

    print("\n[未分類前 20 件範例]")
    for g in unclassified[:20]:
        print(f"- {g}")

if __name__ == '__main__':
    run_simulation()
