# CSS `!important` 淨化計畫

本文件包含兩個部分：**現況分析報告** 與 **分階段淨化執行計畫**。
每一階段修改後都必須進行截圖比對驗證，確認美觀與功能零影響才進入下一階段。

---

## 📊 Part 1：現況分析（共 78 處）

| CSS 檔案 | 數量 | 分類 | 說明 |
|---|---|---|---|
| `utilities.css` | 12 | 🟢 保留 | `.hidden`, `.visually-hidden`, `.bounce-icon` 等工具類，使用 `!important` 完全正確 |
| `auth.css` (autofill) | 2 | 🟢 保留 | `input:-webkit-autofill` 覆蓋瀏覽器預設的深色表單填充，這是業界標準寫法 |
| `auth.css` (sync 狀態) | 3 | 🟡 戰術 | `.sync-status--syncing/ok/error` 的顏色覆蓋，由 JS 動態掛載 |
| `auth.css` (error/hidden) | 2 | 🟡 戰術 | `.auth-error-msg` 的 `display: flex/none`，用來覆蓋 JS hidden 切換 |
| `auth.css` (modal card) | 7 | 🔴 清除 | `.login-modal-card` 為了蓋過 `.modal-content` 基礎定義而強押 |
| `toolbar.css` | 13 | 🟡 戰術 | 按鈕的 `.active` 狀態覆蓋，由 JS 切換，風險不大 |
| `modal.css` (sponsor) | 6 | 🔴 清除 | `.sponsor-modal-card`, `.sponsor-intro`, `.option-info p` 的強押 |
| `modal.css` (feedback) | 10 | 🔴 清除 | `.feedback-modal-card` 為了蓋過 `.modal-content` 而無差別強押 |
| `table.css` | 14 | 🔴 清除 | 表格的 `text-align: center`、`padding-left`、格線 border 等 |
| `sections.css` | 4 | 🔴 清除 | `.footer-github-btn` 為了覆蓋通用按鈕樣式而強押 |
| `layout.css` | 2 | 🟡 戰術 | `grid-template-columns` 在 RWD 中的極端覆蓋 |

### 統計
- 🟢 **保留不動**：14 處（utilities 12 + autofill 2）
- 🟡 **暫時保留**（風險低，未來可優化）：20 處
- 🔴 **應清除**：44 處

---

## 🛠️ Part 2：分階段淨化執行計畫

### 階段 1：`table.css` — 表格對齊（14 處）

**風險等級**：⚠️ 中高（直接影響桌機 + 手機的表格顯示）

#### 要清除的 `!important`

| 行號 | 目前寫法 | 原因 |
|---|---|---|
| L42 | `text-align: center !important` | icon 欄位置中 — 沒人跟它搶，不需要 `!important` |
| L65 | `padding-left: 1.15rem !important` | 價格欄微調 — 同上 |
| L92 | `text-align: center !important` | 推薦評分欄 — 同上 |
| L109 | `text-align: center !important` | 股號/公司/價格等欄位 — 同上 |
| L463-464 | `border-bottom/right: ... !important` | 格線模式 — 需保留高權重，改用更高特指度取代 |
| L468 | `border-bottom: ... !important` | 格線標題欄 — 同上 |

#### 修正方式
1. **L42, L65, L92, L109**：直接移除 `!important`，因為這些選擇器本身特指度已經足夠高，沒有其他規則在爭搶。
2. **L463-468（格線）**：將選擇器從 `.table-container.show-gridlines table td` 改為 `section .table-container.show-gridlines table td`，提升特指度後移除 `!important`。

#### 驗證清單
- [ ] 桌機：表格各欄位的置中對齊是否與修改前完全一致
- [ ] 桌機：價格欄的左側間距是否正常
- [ ] 桌機：點擊「格線」按鈕後，格線是否正確顯示
- [ ] 手機：卡片模式的所有欄位是否正常排列（不受影響）

---

### 階段 2：`modal.css` — 彈出視窗（16 處）

**風險等級**：⚠️ 中（影響贊助 Modal 和回饋 Modal 的外觀）

#### 要清除的 `!important`

| 行號 | 目前寫法 | 原因 |
|---|---|---|
| L3 | `.sponsor-modal-card { max-width: 500px !important }` | 蓋過 `.modal-content { max-width: 600px }`，應改用更高特指度 |
| L22-23 | `.sponsor-intro { margin-bottom / font-size }` | 蓋過 `.modal-body p` 的基本間距，應提升選擇器精確度 |
| L94-97 | `.option-info p.option-desc { ... }` | 蓋過 `.modal-body p` 定義。選擇器本身已含 tag+class，特指度應足夠 |
| L326-335 | `.feedback-modal-card { 10 條全部 !important }` | 蓋過 `.modal-content` 基礎定義 |

#### 修正方式
1. **`.sponsor-modal-card`**：改為 `.modal-overlay .sponsor-modal-card`，特指度提升後移除 `!important`。
2. **`.sponsor-intro`**：改為 `.sponsor-modal-card .sponsor-intro`。
3. **`.option-info p.option-desc`**：已含 tag+class，嘗試直接移除 `!important`；若不行，改為 `.sponsor-option-card .option-info p.option-desc`。
4. **`.feedback-modal-card`**：改為 `.feedback-modal-overlay .feedback-modal-card`，一次清掉 10 處。

#### 驗證清單
- [ ] 桌機：點擊「贊助開發者」按鈕 → Modal 開啟，外觀正常（圓角、陰影、間距）
- [ ] 桌機：贊助選項卡片的描述文字大小與間距正確
- [ ] 桌機：點擊「意見回饋」按鈕 → 回饋 Modal 的毛玻璃背景、圓角、padding 正常
- [ ] 手機：上述兩個 Modal 在手機上的顯示是否正確

---

### 階段 3：`auth.css` — 登入視窗卡片（7 處）

**風險等級**：⚠️ 中（影響登入/註冊功能的容器外觀）

#### 要清除的 `!important`

| 行號 | 目前寫法 | 原因 |
|---|---|---|
| L13-20 | `.login-modal-wrapper .login-modal-card { 7 條 !important }` | 為了覆蓋 `.modal-content` 的基礎定義 |

#### 修正方式
選擇器已經是兩層 class (`.login-modal-wrapper .login-modal-card`)，特指度 = 0-2-0，而 `.modal-content` 只有 0-1-0。**理論上不需要 `!important`。** 可以直接移除。

如果移除後發現被蓋過，代表是 CSS 載入順序問題（`auth.css` 在 `modal.css` 之後載入，但 `modal-content` 定義在後面的某個區塊）。此時的正解是將 `.login-modal-card` 的定義移到 `auth.css` 更靠近末尾的位置。

#### 驗證清單
- [ ] 點擊「登入」按鈕 → Modal 的背景色、半透明、邊框、陰影正確
- [ ] 表單內容不超出 Modal 高度時，不出現多餘滾軸
- [ ] 手機版登入 Modal 的顯示是否正確

---

### 階段 4：`sections.css` — 頁尾 GitHub 按鈕（4 處）

**風險等級**：🟢 低

#### 要清除的 `!important`

| 行號 | 目前寫法 | 原因 |
|---|---|---|
| L17-20 | `.footer-github-btn { padding / font-size / border-radius / display }` | 蓋過通用 `.glass-btn` 按鈕樣式 |

#### 修正方式
改用 `.footer-section .footer-github-btn` 提升特指度，然後移除 `!important`。

#### 驗證清單
- [ ] 頁尾的 GitHub ⭐ 按鈕外觀正常（大小、圓角、間距）

---

### 階段 5（選修）：`toolbar.css` — 戰術性清除（13 處）

**風險等級**：🟢 低，但改動量大

目前 `toolbar.css` 中有 13 處 `!important`，全用於 `.tag-btn.active` 等 JS 動態狀態的顏色覆蓋。在 Vanilla CSS 的架構下，這種寫法是可接受的防禦性策略。

若未來想清除，可以統一改用計算好的更高特指度（如 `.table-toolbar .purchase-tags-group .tag-btn.active`）取代。

---

## 📋 執行安全守則

> [!CAUTION]
> 每個階段完成後，必須執行以下檢查才能進入下一階段：

1. **桌機截圖比對**：修改前後的同一頁面截圖放在一起比對，確認完全一致
2. **手機截圖比對**：同上，確認行動版面不受影響
3. **功能測試**：
   - 登入/登出流程正常
   - 贊助 Modal 可正常開啟/關閉
   - 回饋 Modal 可正常提交
   - 表格排序、搜尋、篩選正常
   - 格線切換正常
4. **Git 隔離提交**：每階段單獨一次 commit，方便出問題時個別 revert
