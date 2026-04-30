---
title: "從 if-else 地獄到知識樹"
subtitle: "V4 到 V5 的範式轉移"
document_type: narrative
version: 2.0
language: zh-TW
before: "V4: 500+ 行 if-else 鏈，每季改代碼"
after: "V5: 200 行 DFS + 1,680 行 JSON，改估價不需要改代碼"
key_insight: "把會變的東西從代碼裡移出去，變成資料"
related_documents:
  - 02_TREE_DEEP_DIVE.md
  - 07_BUILDER_HACKS.md
  - 08_REAL_LESSONS.md
tags: [paradigm-shift, if-else-to-tree, V4-to-V5, knowledge-engine]
---

# 從 if-else 地獄到知識樹

> 這個專案最值得講的故事不是功能，不是架構，是一個決定：把 500 行 if-else 變成 1,680 行 JSON 和 200 行 DFS。

## V4 是什麼樣子

V4 的估價邏輯長這樣：

```python
# valuation.py (已歸檔到 scripts/archive/)

def estimate_gift_value(gift_name):
    if '全聯' in gift_name and '禮券' in gift_name:
        if '100' in gift_name or '壹佰' in gift_name:
            return 100
        elif '200' in gift_name or '貳佰' in gift_name:
            return 200
        elif '500' in gift_name or '伍佰' in gift_name:
            return 500
        else:
            return 100  # 預設全聯禮券值 100
    elif '7-11' in gift_name or '7-11' in gift_name:
        if '100' in gift_name:
            return 100
        elif '200' in gift_name:
            return 200
        else:
            return 60
    elif '星巴克' in gift_name:
        return 150
    elif '不鏽鋼' in gift_name:
        if '碗' in gift_name:
            return 80
        elif '保溫瓶' in gift_name or '保溫杯' in gift_name:
            return 120
        elif '鍋' in gift_name:
            return 200
        else:
            return 60  # 不鏽鋼其他
    elif '卡' in gift_name:
        if '卡套' not in gift_name and '馬克杯' not in gift_name:
            # 卡但不包含卡套和馬克杯
            ...
    # ... 幾百行
```

這樣做有三個致命問題：

### 問題一：排序敏感

`'卡' in gift_name` 會匹配到「卡套」、「馬克杯」裡的「卡」。你需要額外的 `not in` 排除條件。排除清單越長，越容易漏。

### 問題二：每季改代碼

新的紀念品出現，就要加新的 if-else。改代碼 → 測試 → 部署，這是一個開發者才能做的流程。

### 問題三：無法擴展

當類別從 5 個長到 9 個，當每個類別有 10+ 個子類別，當每個子類別有面額變體和排除條件——代碼變成一團無法理解的麵條。

## V5 做了什麼

V5 把知識和演算法完全分開：

```
tree.json（知識）    valuation_v5.py（演算法）
    1,680 行               200 行
    
    9 大類別               DFS 搜尋
    每個節點有：           屬性繼承
      keywords             標籤穿透
      keywords_and         複合禮物拆分
      keywords_not         
      regex                
      base_value           
      value_multiplier     
      tags                 
```

代碼不包含任何商品知識。它只做三件事：搜尋、繼承、計算。

### 搜尋

DFS（深度優先搜尋）從根節點開始，對每個子節點：

1. 先檢查 `keywords_not`（排除優先）— 如果名字包含「卡套」，不匹配
2. 再檢查 `keywords`（OR 匹配）— 任一關鍵詞出現就匹配
3. 再檢查 `keywords_and`（AND 匹配）— 所有關鍵詞都出現才匹配
4. 最後檢查 `regex`（正則匹配）— 可以捕捉面額數字

如果匹配，繼續往更深層搜尋。如果走到最深還沒匹配，使用最近的匹配節點。

### 繼承

一個節點可以不設 `base_value`，它會向上找父節點、祖父節點，直到找到第一個有值的。例如「星巴克隨行杯」節點沒有設 `base_value`，它會繼承「☕ 飲品/咖啡」類別的 `base_value: 80`。

`value_multiplier` 也是繼承的。「保健品專區」設了 `0.5`，所有子類別的估值自動減半。

### 計算

```
最終估值 = max(0, int(base_value × value_multiplier) - receiving_cost)
```

其中 `receiving_cost` 由標籤決定：有「票券」標籤的代領成本是 15 元，其他是 20 元。

## 差異對照

| | V4 | V5 |
|---|---|---|
| 商品知識在哪 | if-else 鏈裡（代碼） | tree.json 裡（資料） |
| 新增類別 | 改代碼、測試、部署 | 改 JSON、重啟 |
| 排序問題 | 有，前面匹配了後面就不到 | 沒有，DFS 找最深匹配 |
| 排除邏輯 | 散落在每個 if 裡 | 統一在 `keywords_not` |
| 面額判斷 | 每個面額一個 if | `regex: (\d[\d,]*)元` 一行搞定 |
| 誰能維護 | 只有工程師 | 任何人（用視覺編輯器） |
| 代碼行數 | 500+ | 200（演算法）+ 1,680（資料） |

## 視覺編輯器

V5 的另一個創新：一個 Flask 視覺編輯器（`gift_tree/app.py`），讓非工程師可以：

1. 拖曳 raw items 到樹節點
2. 新增類別節點、設定 keywords 和屬性
3. 點擊「Run Simulation」— 把 1,300+ 個實際紀念品跑過分類樹，看哪些落對了、哪些未分類
4. 為單一項目設定覆寫值（`item_overrides.json`）
5. Ctrl+Z/Y 復原/重做（debounced history stack）

這個編輯器的存在，讓 tree.json 的維護從「開源代碼修改」變成了「業務人員的日常工作」。

## 中間產物：generate_default_tree.py

V5 不是憑空產生的。`scripts/archive/generate_default_tree.py` 是一個遷移腳本，它把 V4 的硬編碼字典轉換成 V5 的初始樹結構。舊的類別變成樹節點，舊的關鍵詞列表變成節點的 `keywords`。

這個腳本證明了 V5 是 V4 的超集——所有 V4 能估價的東西，V5 也能估價，而且更多。

## 為什麼這個故事值得講

因為它回答了一個通用的問題：**當你的業務邏輯變得比代碼更複雜時，你應該怎麼辦？**

答案是：把業務邏輯從代碼裡搬出去，變成資料。代碼只做搜尋和計算，不包含任何業務知識。這個模式不是新的——規則引擎、決策表、配置驅動開發都是同樣的思想。但 V5 把它做到了極致：**1,680 行的商品知識，200 行的通用演算法，零行硬編碼估價邏輯。**

這個比例是 V5 的核心價值。