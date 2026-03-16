# 🛡️ 專案基礎防護與優化指南 (Base Security Plan)

本專案 (`tw-stock-gift-evaluator`) 是一個基於 GitHub Pages 託管的純靜態前端應用 (SPA)，並直接使用 Supabase 讀取資料。
考量到專案的核心價值在於「公開資料的優化整理與分享」，我們不需要採取嚴苛的反爬蟲機制阻止資料流通。我們的首要目標是：**「確保資料不被惡意破壞」**以及**「保持前端代碼的輕量純淨」**。

因此，為 Gemini Pro 規劃的安全性與優化實作方案如下：

---

## 🛑 第一項：清理前端無用代碼 (提升載入效能)

由於本專案已決定不使用 Cloudflare Turnstile 等前端人機驗證機制，我們應將殘留的程式碼清除，既能加速網頁載入，也能避免不必要的外部資源請求。

*   **實作標的**：`index.html`
*   **建議動作**：請搜尋並移除 `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>` 以及 `<head>` 區塊內任何與 Cloudflare 驗證相關的 Meta Tags 或是 `div` 容器。

---

## 🔒 第二項：阻擋低級爬蟲與防護寫入 (Supabase 強化)

雖然我們開放資料流通，但不代表要讓低級腳本（如簡單的 `curl` 或 Python `requests`）毫無節制地直接呼叫我們的 Supabase API，消耗免費額度。
同時，我們也必須確保 **Anon Key 只有唯讀權限**，嚴禁任何竄改。

### 1. 簡易的「防君子」自訂標頭驗證

針對「只會抓 API 網址去跑迴圈」的低級爬蟲，我們可以在前端請求加上一個「專屬通關密語 (Custom Header)」，並在 Supabase 資料庫端拒絕缺少這個通關密語的請求。

*   **前端修改 (`js/supabase-config.js` / `js/data.js`)**：在建立 Supabase Client 或呼叫 `.select()` 時，加上特定的自訂 Header，例如 `X-Client-App: TW-Stock-Gift-Evaluator`。
*   **後端驗證 (RLS Policy)**：在 Supabase 的存取規則中，加上檢查 Request Header 的條件。若請求沒有這個 Header，就視為爬蟲直接拒絕存取。

### 2. 資料庫唯讀鎖定 (RLS)

即使爬蟲破解了 Header 限制，我們也要確保它拿到的只是「唯讀權限」。

*   **防護目標**：保護 `stocks` 資料表不被惡意連線竄改。
*   **開放讀取**：允許任何人 (或是帶有上述 Header 的人) SELECT。
*   **禁止破壞**：包含匿名與登入者，皆不得透過 Anon Key 進行 INSERT / UPDATE / DELETE。

### Supabase RLS 基本設定 (Gemini 實作參考)

我們需要一組 Policy 來同時滿足「驗證 Header」與「唯讀」的雙重需求。

> ⚠️ 註記：我們在 GitHub Actions 中用來更新股價的腳本是使用 `Service Role Key`，這把無敵鑰匙會自動繞過 RLS，因此設定這條唯讀 Policy **完全不影響**我們的自動更新機制。

---

## 🚀 總結：給 Gemini Pro 的實作行動清單

您可以直接給予 Gemini Pro 以下指令來完成這次的基礎防護建置：

> **「Gemini Pro，為了優化我們的專案並加上基本的資料防護，請幫忙完成以下兩點：**
> 
> **1.** 幫我檢查專案的 `index.html`，並將其中無效的 `turnstile/v0/api.js` 等相關腳本與容器徹底移除，保持代碼乾淨。
> 
> **2.** 修改 `js/supabase-config.js`，在建立 `supabaseClient` 時，加入一個專屬的自訂 Header (`global.headers`: `{'x-app-source': 'tw-stock-gift'}`) 作為簡易的防爬蟲通關密語。
> 
> **3.** 提供一段完整的 Supabase RLS (Row Level Security) SQL 設定腳本。需求是：針對 `stocks` 表格，允許包含了特定 Header (`x-app-source`) 的匿名連線進行 `SELECT` 操作，但**嚴格禁止**任何透過 Anon Key 發起的 `INSERT`、`UPDATE` 與 `DELETE` 行為。請產出可以在 Supabase SQL Editor 直接執行的語法。」

---
> 💡 透過這兩項最基礎但最關鍵的優化，我們不僅確保了資料的絕對安全，也保持了專案輕盈、開放的初衷。
