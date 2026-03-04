# 🗺️ v3 / v4 Roadmap — 雲端同步與 AI 資料自動化

### 核心定義：極簡化的「整理與紀錄」
經過討論，v3 將捨棄不必要的複雜狀態（不分欄、不設年度重置），一切回歸最直覺的操作：**「紀錄我買了哪些零股，並能跨裝置同步與匯出。」** 
而針對資料來源不透明的痛點，在 v4 導入 LLM 自動化分析，大幅降低我們手動維護的成本。

---

## 🚀 v3：雲端持續化與匯出管理 (Current Focus)

**技術選型：Supabase**（Auth + PostgreSQL + Row Level Security）

### Phase 1：Supabase 雲端會員系統
- **註冊與登入**：Google OAuth / Email Magic Link。
- **UI 更新**：Header 區塊新增登入按鈕與使用者狀態圖示。
- **模組化**：新增 `auth.js` 處理 Supabase token 與 session。
- **資料庫設計 (PostgreSQL)**：只紀錄「誰」買了「哪一檔」，以及可選的「個人備註」。
  ```sql
  CREATE TABLE user_stocks (
    user_id     uuid REFERENCES auth.users NOT NULL,
    stock_id    text NOT NULL,
    note        text,
    created_at  timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, stock_id)
  );
  ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;
  ```

### Phase 2：無縫儲存與同步 (`sync.js`)
- **已登入**：直接讀寫 Supabase `user_stocks`，跨裝置即時同步個人的 🛒 購物車（已買入）清單。
- **未登入（遊客）**：維持現狀存在 `localStorage`，確保新訪客開箱即用。
- **首次綁定**：當遊客首次登入時，一鍵將 `localStorage` 已買入的紀錄上傳合併至雲端帳號。

### Phase 3：匯出代領清單
- **持有過濾器**：除了既有的篩選條件，主表新增 `[🔍 只顯示已持有]`。
- **一鍵匯出 CSV**：於控制列新增 `[📥 匯出清單]` 按鈕，直接下載針對代領業者友善格式的 `.csv` 檔案（股號、公司名、個人備註）。

---

## 🤖 v4：MOPS 爬蟲與 LLM 資料自動化擷取 (Future Plan)

為了解決「找不到紀念品資訊」與「人工維護成本過高」的問題，v4 將後端 Python 腳本全面升級，實作自動化資料獲取流程。

### 為什麼不爬 `股東e票通`？
- e票通需要憑證登入（自然人/券商憑證），無法寫自動爬蟲。
- e票通只包含議案，**不包含**實體紀念品發放資訊。

### v4 解決方案：MOPS + LLM 解析
台灣證券交易所的「公開資訊觀測站 (MOPS)」是法定公告大廳，但其「紀念品發放原則」欄位是由各家股務手打的「非結構化中文文字」。

**實作流程：**
1. **溫柔爬蟲 (Polite Scraper)**：
   撰寫 Python 爬蟲，每天固定排程（如透過 GitHub Actions）去 MOPS 抓取當日發布的「召開股東常會公告」。
2. **LLM 非結構化資訊萃取 (Data Extraction)**：
   將爬取到的中文發放原則送入 GPT / Gemini API。
   ```text
   Prompt Example: 
   "請分析以下文字：『除親自出席股東會者外，本公司將不予發放紀念品...』
   回傳 JSON: { 
     'has_souvenir': true, 
     'item': '無', 
     'value': 0, 
     'zero_shares_eligible': false 
   }"
   ```
3. **自動化更新**：
   LLM 解析回來的結構化 JSON，自動更新專案的 `StockData.xlsx` / `data.json`，讓前端永遠保持最新鮮的「高 CP 零股清單」，零人工維護成本！
