import json
import sys

def run():
    with open('gift_tree/tree.json', 'r', encoding='utf-8') as f:
        tree = json.load(f)

    # 建立 node id 對應與 parent 關係
    node_map = {}
    
    def build_map(node, parent_id=None):
        node['_parent_id'] = parent_id
        node_map[node['id']] = node
        for child in node.get('children', []):
            if child.get('type') != 'item':
                build_map(child, node['id'])
                
    build_map(tree)

    def has_positive_rules(node):
        rules = node.get('rules', {})
        if any(k for k in rules.get('keywords', []) if k): return True
        if any(k for k in rules.get('keywords_and', []) if k): return True
        if rules.get('regex'): return True
        return False

    def resolve_base_value(node):
        curr = node
        visited = set()
        while curr:
            if curr['id'] in visited:
                break
            visited.add(curr['id'])
            
            # 如果到了 root，不算(因為我們要檢查自己的線上是否有設定專屬base)
            if curr['id'] == 'root':
                break
                
            val = curr.get('attributes', {}).get('base_value')
            if val is not None and val != "":
                return True, val
                
            pid = curr.get('_parent_id')
            if not pid:
                break
            curr = node_map.get(pid)
        return False, None

    missing = []
    
    for node_id, node in node_map.items():
        if node['id'] == 'root':
            continue
            
        if has_positive_rules(node):
            has_base, val = resolve_base_value(node)
            if not has_base:
                # 組裝路徑
                path = []
                curr = node
                v2 = set()
                while curr:
                    if curr['id'] in v2: break
                    v2.add(curr['id'])
                    path.insert(0, curr['name'])
                    pid = curr.get('_parent_id')
                    curr = node_map.get(pid) if pid else None
                missing.append(' > '.join(path))

    print('\n--- 掃描結果：設定了搜尋規則，但未定義/繼承到 base_value 的分類節點 ---')
    if not missing:
        print('✅ 太棒了！所有設定了關鍵字/正則的分類，都有對應的 base_value。')
    else:
        for p in missing:
            print(f'- {p}')

if __name__ == '__main__':
    run()
