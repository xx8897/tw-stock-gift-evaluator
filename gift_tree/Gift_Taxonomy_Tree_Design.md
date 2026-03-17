# 🌳 禮品估值引擎 V5 終極架構設計 (Taxonomy Tree & Pipeline)

本文件描述了 `tw-stock-gift-evaluator` 專案中，最新的「V5 估值引擎」的架構藍圖。這套設計揚棄了過去將「分類邏輯」與「價值計算」混雜在一起的 `if-else` 面條程式碼，轉而採用**「知識圖譜分類樹 (Taxonomy Tree)」**結合**「資料處理管線 (Data Processing Pipeline)」**的先進架構。

---

## 1. 架構的創新性：為何這個設計很有趣？

傳統的分類法樹（Taxonomy Tree）通常只用於靜態分類（例如：生物學界門綱目科屬種、電商網站商品目錄）。
**但我們這個架構的核心趣味與強大之處在於：這顆樹不僅給定「最終葉節點」，還沿路賦予了商品「動態標籤 (Tags)」，並結合了後置的資料處理層。**

這讓我們的系統從一個單純的「目錄字典」升級成了一個小型的**「規則推論引擎 (Rule Inference Engine)」**：
1. **降維打擊**：面對每年五花八門、上千件新奇古怪的贈品，我們不再需要窮舉所有組合。
2. **精準控場**：如果一個「包含『體驗』的『王品』『牛排餐券』」，我們只需要讓它走過正確的路徑，沾上 `[high_value_ticket, voucher, food, experience_penalty]` 這些標籤，結算引擎閉著眼睛都能精準算出它的最終價值，不會發生規則互相覆蓋的靈異現象。

---

## 2. 核心運作流程 (Data Pipeline)

未來的 `valuation.py` 將轉變為一個流水線處理器，分三階段進行：

### 階段一：擷取層 (Extraction Layer)
*   接收原始商品字串（例如：`2024年王品集團股東大禮包`）。
*   先進行基礎清理（如去除去除 `(2024)` 等前綴）。

### 階段二：標籤搜索樹 (Taxonomy Search Tree)
*   字串被送入我們視覺化設計好的 `tree.json`。
*   **命中規則**：字串與樹中各節點的 `keywords` 或 `regex` 比對，找到最深層的匹配節點（例如：落在「王品」特賞區）。
*   **獲取屬性**：該節點直接輸出 `base_value` (如 400)。
*   **標籤繼承 (Tag Inheritance)**：這是最關鍵的一步。該商品會繼承它一路上所有經過節點的 `tags`。例如：
    *   經過根節點 -> 獲得 `tags: []`
    *   經過「特賞與票券類」節點 -> 獲得 `tags: ["is_voucher", "need_receive_cost"]`
    *   到達「王品」特賞節點 -> 獲得 `tags: ["is_voucher", "need_receive_cost", "safe_brand"]`

### 階段三：資料處理結算層 (Post-Processing Layer)
*   商品帶著 `base_value = 400` 以及滿滿的標籤來到這層。
*   這是我們**全域獎懲與代領費規則**大顯身手的地方。
*   規則撰寫將變得極為優雅與直觀：
    ```python
    # 決定領取成本
    cost = 15 if "is_voucher" in tags else 20
    if "is_digital_app" in tags:
        cost = 0

    # 決定實用性懲罰 (0.3x)
    utility = 1.0
    if ("has_experience_keyword" in tags) or ("high_risk_utility" in tags):
        if "safe_brand" not in tags: # 豁免安全品牌
            utility = 0.3
            
    # 最終結算
    final_value = (base_value * utility) - cost
    ```

---

## 3. 資料結構實作 (JSON Schema)

為了讓前後端都能輕易理解並編輯這個分類樹，我們將結構具象化為 JSON。

### 節點定義 (TreeNode)
```json
{
  "id": "node_ticket_001",
  "name": "🎫 票券與高價特賞",
  "type": "category",
  "rules": {
    "keywords": ["券", "卡", "門票", "兌換"],
    "regex": null
  },
  "attributes": {
    "base_value": null  // 若不寫死，交由子節點定義
  },
  "tags": ["is_voucher", "need_receive_cost"], // 【標籤】核心：此類別的所有子孫都會擁抱這些標籤
  "children": [
    {
      "id": "node_ticket_wangpin",
      "name": "王品集團特賞",
      "type": "category",
      "rules": {"keywords": ["王品"]},
      "attributes": {"base_value": 400},
      "tags": ["safe_brand"], // 子分類自己的標籤
      "children": [
        // 葉子節點 (具體的歷年贈品) 會被掛載在這裡
      ]
    }
  ]
}
```

---

## 4. 開發實作藍圖 (Roadmap)

### Phase 1: 資料準備 (✅ 已完成)
*   腳本 `fetch_raw_items.py` 已從 Supabase `stocks` 表格撈取了所有 1300+ 筆獨特的五年發放紀念品。
*   已將這些資料轉換為最基礎的葉節點，並儲存於 `gift_tree/raw_items.json` 中。

### Phase 2: 分類樹視覺化編輯器 (Frontend Editor)
開發一個輕便的內部網頁工具，協助人工建立龐大的 JSON 樹。
*   **後端 (Python Flask)**：提供 `GET /api/tree` 讀取樹與 `POST /api/tree` 寫入樹的超級輕量服務。
*   **前端 (HTML/JS + Sortable.js/jsTree)**：
    *   左側：從 `raw_items.json` 載入所有未分類的原始紀念品。
    *   右側：可無限建立節點、子節點。支援設定節點的 `keywords`、`base_value` 與 `tags`。
    *   拖曳 (Drag & Drop)：支援把左側的商品直接拉進右側任一個分類底下。
    *   儲存：將右側的大樹儲存回 `tree.json`。

### Phase 3: 批次模擬執行與集合檢視 (Batch Simulation UI)
在編輯器裡面加上一個「▶️ 模擬執行 (Run Simulation)」按鈕：
*   **點擊執行**：編輯器會將左側所有的 `raw_items`（即這 1300+ 個商品），全部餵進右方的分類樹中跑一遍。
*   **集合展開檢視**：執行完畢後，呈現一個「模擬結果」的新畫面（或是直接覆蓋原有的樹）。
    *   在每一個分類節點（如：`航空特賞`）旁邊會顯示命中數量 `(共 15 件)`。
    *   您點擊展開這個結點，裡面會列出所有被分類進來的葉子（如：`2024星宇航空大禮包`、`華航飛機杯`），以及它們最終被推導出的 `base_value` 與持有的 `tags`。
    *   **未分類區**：那些無法被任何關鍵字抓住的商品，會全部擠在未分類集合。您可以直接一覽無遺，去發想新的分類關鍵字，或是直接把那片葉子手動拖進某個分類裡定稿。
*   此功能讓開發者就像檢閱軍隊一樣，一鍵透視所有 1000 多個商品目前被分佈在哪些節點，能在視覺介面上瘋狂調教規則直至完美無瑕。

### Phase 4: 正式整合至 Backend
*   改寫 `scripts/core/valuation.py`，廢棄原有的海量 `if-else`。
*   載入 `tree.json` 作為大腦，完成真正的 V5 估值引擎重構，讓每日 GitHub Actions 的抓取直接使用新模型。
