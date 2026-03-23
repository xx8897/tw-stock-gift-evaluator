import json
import re
import os

_TREE_CACHE = None
_TREE_NODE_MAP = None

def _load_tree():
    global _TREE_CACHE, _TREE_NODE_MAP
    if _TREE_CACHE is not None:
        return _TREE_CACHE, _TREE_NODE_MAP
        
    tree_path = os.path.join(os.path.dirname(__file__), '..', '..', 'gift_tree', 'tree.json')
    with open(tree_path, 'r', encoding='utf-8') as f:
        _TREE_CACHE = json.load(f)
        
    _TREE_NODE_MAP = {}
    def build_map(node, parent_id=None):
        node['_parent_id'] = parent_id
        _TREE_NODE_MAP[node['id']] = node
        for child in node.get('children', []):
            if child.get('type') != 'item':
                build_map(child, node['id'])
                
    build_map(_TREE_CACHE)
    return _TREE_CACHE, _TREE_NODE_MAP

def _item_matches(item_name, node):
    """
    回傳 (is_match, captured_value)。
    is_match: True | 'pass_through' | False
    captured_value: 若 regex 捕捉到數字則為 float，否則為 None
    """
    rules = node.get('rules', {})
    kw_not = [k for k in rules.get('keywords_not', []) if k]
    kw_or  = [k for k in rules.get('keywords', [])     if k]
    kw_and = [k for k in rules.get('keywords_and', []) if k]
    regex  = rules.get('regex')

    # NOT：只要命中就整個節點跳過
    if kw_not and any(k in item_name for k in kw_not):
        return False, None

    has_positive = bool(kw_or or kw_and or regex)

    if kw_or and any(k in item_name for k in kw_or):
        return True, None
        
    if kw_and and all(k in item_name for k in kw_and):
        return True, None
        
    if regex:
        try:
            m = re.search(regex, item_name, re.IGNORECASE)
            if m:
                cap = None
                for g in m.groups():
                    if g:
                        try:
                            cap = float(str(g).replace(',', ''))
                            break
                        except ValueError:
                            pass
                return True, cap
        except re.error:
            pass

    if not has_positive:
        return 'pass_through', None
        
    return False, None

def _dfs_classify(item_name, node):
    """
    DFS，回傳 (matched_node_id, captured_value)。
    """
    if node.get('type') == 'item':
        return None, None
        
    for child in node.get('children', []):
        if child.get('type') == 'item':
            continue
            
        is_match, cap = _item_matches(item_name, child)
        if is_match:
            # 嘗試深入找更精確的匹配
            deeper_id, deeper_cap = _dfs_classify(item_name, child)
            if deeper_id:
                return deeper_id, deeper_cap
                
            if is_match is True:
                return child['id'], cap
                
    return None, None

def _resolve_attr(node_id, node_map, attr_name, default_value):
    """向上繼承第一個非 null、非空字串的值"""
    node = node_map.get(node_id)
    visited = set()
    while node:
        if node['id'] in visited:
            break
        visited.add(node['id'])
        val = node.get('attributes', {}).get(attr_name)
        if val is not None and val != '':
            try:
                return float(val)
            except (ValueError, TypeError):
                pass
                
        parent_id = node.get('_parent_id')
        if parent_id is None:
            break
        node = node_map.get(parent_id)
        
    return default_value

def _collect_tags(node_id, node_map):
    """從匹配節點出發，往上收集所有祖先節點的 tags（聯集）"""
    all_tags = set()
    node = node_map.get(node_id)
    visited = set()
    while node:
        if node['id'] in visited:
            break
        visited.add(node['id'])
        for t in node.get('tags', []):
            if t:
                all_tags.add(t)
        parent_id = node.get('_parent_id')
        if parent_id is None:
            break
        node = node_map.get(parent_id)
    return all_tags

def _cost_from_tags(tags):
    """依 tags 決定代領成本。
    - 命中「票券」 → 15
    - 其他 → 20（保底）
    """
    if '票券' in tags:
        return 15
    return 20

def _classify_by_tree(item_name):
    tree, node_map = _load_tree()
    matched_id, captured_val = _dfs_classify(item_name, tree)
    
    if matched_id:
        base = _resolve_attr(matched_id, node_map, 'base_value', 40.0)
        mult = _resolve_attr(matched_id, node_map, 'value_multiplier', 1.0)
        
        # 依 tag 繼承來決定代領成本
        tags = _collect_tags(matched_id, node_map)
        cost = _cost_from_tags(tags)
        
        # 邊緣判定：如果 base_value == 0 代表要使用捕捉到的面額
        if base == 0:
            base = captured_val if captured_val is not None else 0.0
            
        return base, mult, cost, captured_val
        
    return 40.0, 1.0, 20.0, None

def estimate_gift_value_v5(gift_name):
    """
    對外接口：計算物品的最終價值，相容舊版組合品項邏輯。
    回傳：整數最終純額 (已扣除非數值代領成本)
    """
    if pd_isna(gift_name) or str(gift_name).strip() in ['無', '-', '未發放', '不發放', 'nan', '']:
        return 0
        
    is_top_level = not str(gift_name).startswith("__internal__")
    name_clean = str(gift_name).replace("__internal__", "").strip()
    
    # 組合品項分割
    delimiters = r'\+|\&|與|和|及'
    if re.search(delimiters, name_clean):
        parts = re.split(delimiters, name_clean)
        raw_total = sum(estimate_gift_value_v5(f"__internal__{p.strip()}") for p in parts if p.strip())
        if is_top_level:
            return max(int(raw_total) - 20, 0)
        return raw_total

    # 單一品項從樹上分類計算
    base_val, mult, cost, _ = _classify_by_tree(name_clean)
    final_val = max(0, int(base_val * mult) - (int(cost) if is_top_level else 0))
    
    return final_val

# Helper：判斷 NaN
def pd_isna(val):
    if val is None: return True
    if isinstance(val, float):
        import math
        return math.isnan(val)
    return False

def estimate_5year_total(text):
    if text is None or str(text).strip() in ['', 'nan', 'None']: return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        # 移除前面的年份標籤，例如 (2025) 或單純 2025，避免干擾 tree.json 的金額關鍵字 (如 20 匹配到 2025)
        item = re.sub(r'^\(?\d{4}\)?', '', item.strip()).strip()
        if not item or item in ['無', '-', '未發放', '不發放']: continue
        total += estimate_gift_value_v5(item)
    return total

def calc_v4_cp(row):
    price, total_val, freq = row.get('最近股價', 0), row.get('新版五總估', 0), row.get('五年內發放次數', 0)
    if price <= 0 or total_val <= 0: return 0.0
    w_freq = freq / 5.0
    cp = (total_val * w_freq) / price
    return round(cp, 2)

def calc_v4_score(row):
    """
    V5 星級評等邏輯：
    - 可零股領取 = 所有 1 星以上的基礎門檻
    - 不須身分證 + 連續五年 = 3 星以上的必要條件
    - CP 門檻決定最終星級

    星級對照：
      5 星: CP > 5 + 連續五年 + 不須身分證 + 可零股
      4 星: CP > 3 + 連續五年 + 不須身分證 + 可零股
      3 星: CP > 2 + 連續五年 + 不須身分證 + 可零股
      2 星: CP > 2 + 可零股（身分證/少發 ok）
      1 星: CP > 1 + 可零股
      0 星: 其餘（含不可零股）
    """
    cp   = row.get('新版性價比', 0)
    freq = row.get('五年內發放次數', 0)
    cond = str(row.get('去年條件', ''))

    # 特殊條件 → 0 星
    if '【特殊條件】' in cond:
        return '0 星'

    # 判斷領取便利性
    needs_id        = '身分證' in cond or '本人' in cond
    odd_lot_blocked = '1000股' in cond or '千股' in cond or '整股' in cond
    five_years      = int(freq) >= 5  # 連續五年發放

    # 不可零股 → 0 星
    if odd_lot_blocked:
        return '0 星'

    # 可零股 + 不須身分證 + 連續五年 才能進入高星 (3~5 星)
    if not needs_id and five_years:
        if cp > 5: return '5 星'
        if cp > 3: return '4 星'
        if cp > 2: return '3 星'

    # 無法進入高星但可零股：最高 2 星
    if cp > 2: return '2 星'
    if cp > 1: return '1 星'

    return '0 星'
