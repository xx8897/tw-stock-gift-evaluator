# 重構評估與分析報告：後端解耦與前端拆分

收到您的指示，我針對「1. 檢查 `valuation.py` 的抽離狀況」以及「2. 評估 `table.js` 的拆分」進行了深度的調查。以下是詳細的現狀評估與後續行動方案：

---

## 1. 後端 `valuation.py` 抽離現狀分析

### 🔎 目前狀況 (Current Status)
您說得沒錯，我們曾經建立過 `valuation.py`，**它確實存在且內部程式碼是完整的。**

我用工具掃描了整個 `scripts/` 資料夾，結果如下：
- ✅ `scripts/core/update_prices_finmind.py`：**成功使用了抽離的模組**（有寫 `from valuation import estimate_5year_total...`）。
- ❌ `scripts/core/evaluate_stocks.py`：**沒有使用！** 檔案內仍然保留著自己的一份從第 43 行到 137 行的 `estimate_gift_value()` 備份。
- ❌ `scripts/core/evaluate_stocks_supa.py`：**沒有使用！** 檔案內同樣保留著從第 74 行到 139 行的 `estimate_gift_value()` 備份。

### ⚠️ 評估與風險
這意味著我們上次的重構**只做了一半**（俗稱「拔出蘿蔔帶出泥」）。目前專案中存在 **3 份一模一樣的估價邏輯**。
這極度危險。因為 Python 的模組引入在不同層級的資料夾下有時會報錯 (`ModuleNotFoundError`)，上次可能因為改動 `evaluate_stocks.py` 時遇到 Python 路徑 (sys.path) 找不到 `valuation.py`，所以為了讓腳本能動，直接選擇把代碼貼上去了事。

### 🛠️ 重構計畫
這部份的重構**難度低，但效益極高**。
1. 在 `evaluate_stocks.py` 和 `evaluate_stocks_supa.py` 開頭加入正確的 `sys.path` 處理，確保能安全 import `valuation`。
2. 刪除這兩支檔案內共近 200 行的重複定義。
3. 修改程式中呼叫的地方，改為 `valuation.estimate_gift_value()`。
4. **驗證方式**：重新執行這兩支腳本，確認能無錯跑完，產生的 Excel/Supabase 更新結果不變。

---

## 2. 前端 `table.js` 巨型函數拆分分析

### 🔎 目前狀況 (Current Status)
`js/table.js` 中的 `applyFiltersAndSort()` 是一個典型的「巨集神(God) 函數」。
大約 60 行內塞滿了：
1. 搜尋比對 (Search)
2. 星級比對 (Stars)
3. 歷年頻率比對 (Annual)
4. 身分證條件過濾 (Exclude/Include ID)
5. 持股/關注狀態過濾 (Purchased/Interest)
6. 物品/禮券判斷引擎 (Ticket / Object Only - **包含一大串口袋名單字串 `'券', '劵', '卡', '門票'...`**)

### ⚠️ 評估與風險
前端拆分比後端去重**稍微複雜一點**，因為全域變數 `AppState` 被高度依賴。
如果只是隨便把邏輯切斷，可能會破壞原本「且 (AND)」的過濾交集關係。而且像 `giftText.includes('券')` 這種商業邏輯放在 UI 渲染用的 `table.js` 裡，未來如果想加「食品」過濾，這隻檔案會改不完。

### 🛠️ 重構計畫
這部份的重構需要**設計模式的輔助**，建議採用「功能型拆分（Functional Decomposition）」：

1. **抽離過濾函式庫**：
   在 `js/` 建立一個新檔案（例如 `filters.js` 或直接寫在 `table.js` 上方），裡面只有純函數 (Pure Functions)：
   - `matchSearch(row, query)`
   - `matchStars(row, selectedStars)`
   - `matchGiftType(row, isTicketOnly, isObjectOnly)` -> 把那一大串文字邏輯移到這
2. **重構主函數**：
   讓 `applyFiltersAndSort` 變成一個只負責**指揮**的乾淨函數：
   ```javascript
   AppState.filteredData = AppState.globalData.filter(row => {
       return matchSearch(row, query) &&
              matchStars(row, AppState.filters.stars) &&
              matchGiftType(row, AppState.filters.ticketOnly, AppState.filters.objectOnly) &&
              ...
   });
   ```
3. **驗證方式**：在網頁上隨便點選幾個篩選器（例如「顯示已持有」+「5星」+「搜尋：金」），確保出來的筆數跟重構前完全一模一樣。

---

## 結論

兩項都是非常有價值的重構。
- 處理 `valuation.py` 是為了解決系統**「隱藏的定時炸彈」**（資料不一致）。
- 拆分 `table.js` 是為了**「鋪平未來加新功能的道路」**。

請問您希望我先動手處理哪一個？（我都已經準備好對應的修改計畫了）
