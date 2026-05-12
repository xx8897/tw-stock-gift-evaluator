# 🌳 gift_tree — V5 估值引擎核心模組

> 這不是一個分類器；這是一棵**可被人類維護的知識樹**，讓估值規則從程式碼中徹底解放。

---

## 設計哲學

傳統的紀念品估值方案通常仰賴**硬編碼的 if-else 邏輯**，每次新增品類或調整估值就必須修改程式。V5 的核心突破在於：

> **將「知識」與「演算法」徹底解耦。**

`tree.json` 是唯一需要修改的地方，`valuation_v5.py` 只負責遍歷。

---

## 架構概覽

```
gift_tree/
├── tree.json              # 分類規則大腦（唯一需要人工維護的檔案）
├── app.py                 # 視覺化編輯器後端（Flask REST API）
├── static/                # 編輯器前端介面（Tree UI）
├── raw_items.json         # 從 Supabase 抓取的原始紀念品清單
├── item_overrides.json    # 人工底價覆蓋層（優先級最高）
├── fetch_raw_items.py     # Supabase 資料同步腳本
├── generate_default_tree.py  # 從 V4 字典反向生成 V5 初始樹
└── print_simulation.py    # CLI 分類結果模擬報表
```

---

## 核心演算法：DFS 分類 + 三層估值決策

### 分類：深度優先搜尋（DFS）

每件紀念品的名稱會從根節點開始，遞迴往下匹配，直到找到**最精細的葉節點**為止。

每個節點支援三種匹配規則，並可組合使用：

| 規則類型 | 欄位 | 語義 |
|---|---|---|
| OR 關鍵字 | `keywords` | 任一命中即符合 |
| AND 關鍵字 | `keywords_and` | 全部命中才符合 |
| 排除關鍵字 | `keywords_not` | 命中則直接排除 |
| 正規表示式 | `regex` | 支援 Capture Group，可直接抓取面額數字 |

節點若無正向規則，視為**透通資料夾 (`pass_through`)**，允許搜尋繼續深入其子節點。

### 估值：三層優先級決策

底價的決定遵循嚴格的優先順序，確保靈活度與精確度並存：

```
優先級 1（最高）: item_overrides.json → 人工寫死，不受任何乘數影響
優先級 2        : regex 捕捉到的面額 × value_multiplier
優先級 3（保底）: 節點繼承 base_value × value_multiplier
```

`base_value` 與 `value_multiplier` 均支援**向上繼承**——若子節點未定義，則沿樹往上尋找第一個有值的祖先節點。根節點設有 `base_value: 40` 作為全域保底值。

---

## 本機視覺化編輯器

`app.py` 提供一個本機 Flask 伺服器（預設 `http://127.0.0.1:5001`），讓使用者透過瀏覽器介面直接拖拉、新增、編輯節點規則，並即時執行分類模擬，無需手動編輯 JSON。

```bash
# 啟動編輯器
python gift_tree/app.py

# 執行 CLI 分類報告（快速驗證當前規則覆蓋率）
python gift_tree/print_simulation.py
```

---

## 為什麼這樣設計？

| 舊版 V4（if-else） | V5（知識樹） |
|---|---|
| 新增品類 → 修改 Python | 新增品類 → 只需編輯 tree.json |
| 規則散落在程式碼各處 | 規則集中、可視化、可版控 |
| 難以量化覆蓋率 | 每次 `print_simulation.py` 即可驗證 |
| 無法動態繼承估值 | 樹狀繼承 + Multiplier 動態計算 |

> 這個模組的設計模式，本質上是一套領域特定的**規則引擎（Rule Engine）**，只是以輕量 JSON 取代了傳統的規則資料庫。
