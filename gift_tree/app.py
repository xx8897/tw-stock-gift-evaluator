import json
import os
import re
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TREE_FILE = os.path.join(BASE_DIR, 'tree.json')
RAW_ITEMS_FILE = os.path.join(BASE_DIR, 'raw_items.json')
OVERRIDES_FILE = os.path.join(BASE_DIR, 'item_overrides.json')

def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/api/tree', methods=['GET'])
def get_tree():
    tree_data = load_json(TREE_FILE)
    if not tree_data:
        tree_data = {
            "id": "root",
            "name": "🎁 股東會紀念品分類大樹",
            "type": "root",
            "rules": {"keywords": []},
            "attributes": {"base_value": 40, "receiving_cost": 20},
            "tags": [],
            "children": []
        }
    return jsonify(tree_data)

@app.route('/api/tree', methods=['POST'])
def save_tree():
    try:
        new_tree_data = request.json
        save_json(TREE_FILE, new_tree_data)
        return jsonify({"status": "success", "message": "Tree saved successfully."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/item_overrides', methods=['GET'])
def get_item_overrides():
    """取得所有手動覆蓋的底價: { item_id -> base_value }"""
    overrides = load_json(OVERRIDES_FILE) or {}
    return jsonify(overrides)

@app.route('/api/item_overrides', methods=['POST'])
def set_item_override():
    """設定單筆覆蓋底價: { item_id, base_value } or { item_id, clear: true }"""
    try:
        data = request.json
        item_id = str(data.get('item_id', ''))
        if not item_id:
            return jsonify({"status": "error", "message": "item_id required"}), 400
        overrides = load_json(OVERRIDES_FILE) or {}
        if data.get('clear'):
            overrides.pop(item_id, None)
        else:
            overrides[item_id] = data['base_value']
        save_json(OVERRIDES_FILE, overrides)
        return jsonify({"status": "success", "overrides": overrides})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/raw_items', methods=['GET'])
def get_raw_items():
    raw_items = load_json(RAW_ITEMS_FILE)
    if not raw_items:
        return jsonify([])
    return jsonify(raw_items)

def item_matches_node(item_name, node):
    """檢查物品名稱是否符合節點的規則。回傳 (is_match, captured_value)"""
    rules = node.get('rules', {})
    keywords_not = rules.get('keywords_not', [])
    keywords_or = rules.get('keywords', [])
    keywords_and = rules.get('keywords_and', [])
    regex_pattern = rules.get('regex', None)

    # NOT 邏輯：如果有任一排除關鍵字命中，直接判定不符合
    if keywords_not and any(k in item_name for k in keywords_not if k):
        return False, None

    # OR 邏輯：任一關鍵字命中
    if keywords_or and any(k in item_name for k in keywords_or if k):
        return True, None

    # AND 邏輯：所有關鍵字都必須包含
    if keywords_and and all(k in item_name for k in keywords_and if k):
        return True, None

    # 正規表示式匹配 (若有 capturing group 且捕獲到數字，會回傳 captured_value)
    if regex_pattern:
        try:
            match = re.search(regex_pattern, item_name)
            if match:
                captured_val = None
                # 嘗試找出第一個有值的捕捉群組，通常是留給面額的
                for group in match.groups():
                    if group:
                        try:
                            # 移除逗號後轉數字 (例如 "1,000" -> 1000)
                            captured_val = float(group.replace(',', ''))
                            break
                        except ValueError:
                            pass
                return True, captured_val
        except re.error:
            pass

    return False, None

def classify_item_dfs(item_name, node):
    """深度優先搜索：返回 (matched_id, captured_value)，若無匹配返回 (None, None)"""
    if node.get('type') == 'item':
        return None, None

    for child in node.get('children', []):
        if child.get('type') == 'item':
            continue
            
        is_match, captured_val = item_matches_node(item_name, child)
        if is_match:
            deeper_id, deeper_val = classify_item_dfs(item_name, child)
            if deeper_id:
                return deeper_id, deeper_val
            return child['id'], captured_val
        else:
            deeper_id, deeper_val = classify_item_dfs(item_name, child)
            if deeper_id:
                return deeper_id, deeper_val

    return None, None

def resolve_base_value(node_id, node_map):
    """沿著節點往上找，直到找到第一個非 null 的 base_value（繼承機制）"""
    node = node_map.get(node_id)
    while node:
        val = node.get('attributes', {}).get('base_value')
        if val is not None:
            return float(val)
        parent = node_map.get(node.get('_parent_id'))
        node = parent
    return 40.0  # 保底值

def resolve_value_multiplier(node_id, node_map):
    """沿著節點往上找，直到找到第一個非 null 的 value_multiplier，預設為 1.0"""
    node = node_map.get(node_id)
    while node:
        val = node.get('attributes', {}).get('value_multiplier')
        if val is not None:
            return float(val)
        parent = node_map.get(node.get('_parent_id'))
        node = parent
    return 1.0

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """批次模擬：把所有 raw_items 跑過分類樹，返回分類結果（含 resolved_base_value）"""
    try:
        tree = load_json(TREE_FILE)
        raw_items = load_json(RAW_ITEMS_FILE)

        if not tree or not raw_items:
            return jsonify({"status": "error", "message": "Tree or raw items not found"}), 400

        # 建立 id -> node map，並記錄 _parent_id 方便往上繼承
        node_map = {}
        def build_map(node, parent_id=None):
            node['_parent_id'] = parent_id
            node_map[node['id']] = node
            for child in node.get('children', []):
                build_map(child, node['id'])
        build_map(tree)

        results = {}      # node_id -> [{ item, resolved_base_value }, ...]
        unclassified = []
        overrides = load_json(OVERRIDES_FILE) or {}

        for item in raw_items:
            item_name = item['name']
            item_id = str(item['id'])
            matched_id, captured_val = classify_item_dfs(item_name, tree)

            if matched_id:
                if matched_id not in results:
                    results[matched_id] = []
                
                # 底價決定優先順序:
                # 1. 使用者手動寫死的 overrides (不會受 multiplier 影響，保持絕對寫死)
                # 2. 正則捕捉到的面額 captured_val * multiplier
                # 3. 沿樹繼承的 default base_value * multiplier
                
                multiplier = resolve_value_multiplier(matched_id, node_map)
                
                if item_id in overrides:
                    base_val = float(overrides[item_id])
                elif captured_val is not None:
                    base_val = captured_val * multiplier
                else:
                    base_val = resolve_base_value(matched_id, node_map) * multiplier
                    
                # 限制小數點，如果是整數就轉 int
                base_val = round(base_val, 1)
                if base_val.is_integer():
                    base_val = int(base_val)
                    
                results[matched_id].append({
                    "id": item['id'],
                    "name": item['name'],
                    "resolved_base_value": base_val,
                    "is_overridden": item_id in overrides,
                    "is_captured": (captured_val is not None) and (item_id not in overrides)
                })
            else:
                unclassified.append(item)

        classified_count = sum(len(v) for v in results.values())

        return jsonify({
            "status": "success",
            "classified": results,
            "unclassified": unclassified,
            "stats": {
                "total": len(raw_items),
                "classified_count": classified_count,
                "unclassified_count": len(unclassified)
            }
        })
    except Exception as e:
        import traceback
        return jsonify({"status": "error", "message": str(e), "trace": traceback.format_exc()}), 500

@app.route('/api/clear_items', methods=['POST'])
def clear_items():
    """清空：移除樹中所有 type='item' 的葉子節點，保留分類結構"""
    try:
        tree = load_json(TREE_FILE)
        if not tree:
            return jsonify({"status": "error", "message": "Tree not found"}), 400

        def remove_items(node):
            if 'children' in node:
                node['children'] = [c for c in node['children'] if c.get('type') != 'item']
                for child in node['children']:
                    remove_items(child)

        remove_items(tree)
        save_json(TREE_FILE, tree)
        return jsonify({"status": "success", "message": "All item nodes cleared."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    print("🚀 分類樹編輯器已啟動: 點擊網址前往 -> http://127.0.0.1:5001")
    app.run(host='127.0.0.1', port=5001, debug=True)
