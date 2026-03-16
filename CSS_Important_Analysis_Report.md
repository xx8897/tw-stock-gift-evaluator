# CSS `!important` 五階段淨化計畫

## 前置說明

### 執行規則
- 每個「找到這段」的代碼塊必須**完整複製後才改**，不可只改局部。
- 若找不到完全一致的代碼，**停下來，不要修改**，並向用戶回報。
- 每階段只動一個檔案，修改後立刻做驗證，再進行下一階段。

### CSS 優先級核心邏輯（用於理解為什麼可以移除 `!important`）
- 選擇器越精確（含越多 class），優先級越高，後出現的規則越晚、越優先。
- 同一個檔案中，後出現的規則會蓋過前面的規則（如果特指度相同）。
- 越晚載入的 CSS 檔案，優先級越高。

### 本專案 CSS 載入順序（從先到後）
```
layout.css → components.css（內含：toolbar.css, table.css, buttons.css,
             sections.css, user-menu.css, history-popup.css, controls.css）
→ modal.css → auth.css（最後載入，優先級最高）
```

---

## 階段一：`css/components/table.css`（共 6 處 `!important`）

> **每個修改都只是刪掉 `!important`，屬性值完全不變。**

---

### 修改 A（第 39–45 行）

**找到這段（完整代碼塊，含開頭選擇器）：**
```css
th.th-interest, td.interest-cell,
th.th-purchased, td.purchase-cell {
    width: 60px;
    text-align: center !important;
    vertical-align: middle;
    /* padding / font-size / line-height 僅桌機需要，見下方 @media (min-width: 769px) */
}
```

**改為：**
```css
th.th-interest, td.interest-cell,
th.th-purchased, td.purchase-cell {
    width: 60px;
    text-align: center;
    vertical-align: middle;
    /* padding / font-size / line-height 僅桌機需要，見下方 @media (min-width: 769px) */
}
```

---

### 修改 B（第 64–66 行）

**找到這段：**
```css
td.price {
    padding-left: 1.15rem !important;
}
```

**改為：**
```css
td.price {
    padding-left: 1.15rem;
}
```

---

### 修改 C（第 91–93 行）

**找到這段（注意上方有一行中文注解）：**
```css
/* 推薦評分特別處理 (第10欄)：改為完全置中（僅桌機需要）—見下方 @media (min-width: 769px) */
td:nth-child(10) {
    text-align: center !important;
}
```

**改為：**
```css
/* 推薦評分特別處理 (第10欄)：改為完全置中（僅桌機需要）—見下方 @media (min-width: 769px) */
td:nth-child(10) {
    text-align: center;
}
```

---

### 修改 D（第 95–110 行）

**找到這段（這是一個包含 13 個選擇器的多行規則）：**
```css
/* 依照要求置中特定標題與欄位 */
th:nth-child(3), /* 股號標題 */
th:nth-child(4), /* 公司標題 */
th:nth-child(5), /* 最近價格標題 */
th:nth-child(7), /* 五年內發放標題 */
th:nth-child(8), /* 新版性價比標題 */
th:nth-child(9), /* 去年條件標題 */
th:nth-child(10), /* 推薦評分標題 */
td.stock-id,      /* 股號內容 */
td.stock-name,    /* 公司內容 */
td.price,         /* 最近價格內容 */
td.cp-value,      /* 性價比內容 */
td.cond-cell,     /* 去年條件內容 */
.freq-cell {      /* 五年內發放下方的欄位 */
    text-align: center !important;
}
```

**改為：**
```css
/* 依照要求置中特定標題與欄位 */
th:nth-child(3), /* 股號標題 */
th:nth-child(4), /* 公司標題 */
th:nth-child(5), /* 最近價格標題 */
th:nth-child(7), /* 五年內發放標題 */
th:nth-child(8), /* 新版性價比標題 */
th:nth-child(9), /* 去年條件標題 */
th:nth-child(10), /* 推薦評分標題 */
td.stock-id,      /* 股號內容 */
td.stock-name,    /* 公司內容 */
td.price,         /* 最近價格內容 */
td.cp-value,      /* 性價比內容 */
td.cond-cell,     /* 去年條件內容 */
.freq-cell {      /* 五年內發放下方的欄位 */
    text-align: center;
}
```

---

### 修改 E（第 462–464 行）

**找到這段：**
```css
.table-container.show-gridlines table th,
.table-container.show-gridlines table td {
    border-bottom: 1px solid var(--border-subtle) !important;
    border-right: 1px solid var(--border-subtle) !important;
}
```

**改為：**
```css
.table-container.show-gridlines table th,
.table-container.show-gridlines table td {
    border-bottom: 1px solid var(--border-subtle);
    border-right: 1px solid var(--border-subtle);
}
```

---

### 修改 F（第 467–469 行）

**找到這段（緊接在修改 E 的 `}` 之後）：**
```css
.table-container.show-gridlines table th {
    border-bottom: 2px solid var(--border-subtle) !important;
}
```

**改為：**
```css
.table-container.show-gridlines table th {
    border-bottom: 2px solid var(--border-subtle);
}
```

---

### 階段一驗證清單
完成後用瀏覽器目視確認：
- [ ] 桌機：「興趣」「已買」欄的 icon 依然置中
- [ ] 桌機：「最近價格」欄位有左側間距，不貼邊
- [ ] 桌機：「推薦評分」星星欄依然置中
- [ ] 桌機：點擊「格線」按鈕，格線出現；再點，格線消失
- [ ] 手機：卡片式行佈局一切正常

Git 指令：
```
git add css/components/table.css
git commit -m "refactor(css): remove redundant !important from table.css"
git push origin master
```

---

## 階段二：`css/modal.css`（共 4 處修改，移除 16 個 `!important`）

---

### 修改 A（第 2–4 行）—— **需改選擇器名稱，不只是刪 `!important`**

> 原因：HTML 元素帶有 `class="modal-content sponsor-modal-card"` 兩個 class。`.sponsor-modal-card` 在 L3 定義，`.modal-content { max-width: 600px }` 在 L131 定義。同特指度時，後出現的 `.modal-content` 會蓋過 `.sponsor-modal-card`，所以需要將選擇器改成兩個 class 合寫（提高特指度）。

**找到這段：**
```css
.sponsor-modal-card {
    max-width: 500px !important;
}
```

**改為（將 `.sponsor-modal-card` 改為 `.modal-content.sponsor-modal-card`，且移除 `!important`）：**
```css
.modal-content.sponsor-modal-card {
    max-width: 500px;
}
```

---

### 修改 B（第 20–24 行）—— **需改選擇器名稱**

> 原因：`.sponsor-intro` 是 `<p>` 標籤，所以會被 `.modal-body p { font-size: 0.95rem; margin-bottom: 0.5rem; }` 蓋過（`.modal-body p` 特指度 = class + tag = 0-1-1，高於 `.sponsor-intro` 的 0-1-0）。加入父層選擇器後，`0-2-0 > 0-1-1` 直接贏過。

**找到這段：**
```css
.sponsor-intro {
    text-align: left;
    margin-bottom: 2rem !important;
    font-size: 1rem !important;
}
```

**改為（選擇器加入父層 `.sponsor-modal-card`，且移除 `!important`）：**
```css
.sponsor-modal-card .sponsor-intro {
    text-align: left;
    margin-bottom: 2rem;
    font-size: 1rem;
}
```

---

### 修改 C（第 93–98 行）—— 只刪 `!important`

**找到這段：**
```css
.option-info p.option-desc {
    font-size: 0.85rem !important;
    color: var(--text-secondary);
    margin: 0 !important;
    line-height: 1.4 !important;
}
```

**改為：**
```css
.option-info p.option-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
}
```

---

### 修改 D（第 324–336 行）—— 只刪 `!important`

> 原因：`.feedback-modal-card`（L324）在 `.modal-content`（L128）之後定義，同特指度時後出現的規則優先，`!important` 完全多餘。

**找到這段：**
```css
.feedback-modal-card {
    width: 100%;
    max-width: none !important;
    max-height: 88vh !important;
    padding: 2.5rem 2.5rem !important;
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95)) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
    border-radius: 24px !important;
    backdrop-filter: blur(24px) !important;
    -webkit-backdrop-filter: blur(24px) !important;
    overflow-y: auto !important;
}
```

**改為：**
```css
.feedback-modal-card {
    width: 100%;
    max-width: none;
    max-height: 88vh;
    padding: 2.5rem 2.5rem;
    background: linear-gradient(145deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95));
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    overflow-y: auto;
}
```

---

### 階段二驗證清單
- [ ] 點擊「贊助開發者」→ Modal 寬度正常（不超過 500px）、背景深色、圓角、間距正常
- [ ] 贊助 Modal 中的描述文字（小字）大小與間距正確
- [ ] 點擊「意見回饋」→ 回饋 Modal 的毛玻璃背景、24px 圓角、padding 正確
- [ ] 手機：上述兩個 Modal 正常顯示

Git 指令：
```
git add css/modal.css
git commit -m "refactor(css): remove !important from modal.css, fix sponsor-modal specificity"
git push origin master
```

---

## 階段三：`css/auth.css`（共 7 處 `!important`）

> 原因：HTML 元素帶有 `class="modal-content login-modal-card"`。`.login-modal-wrapper .login-modal-card` 是兩個 class 的選擇器（特指度 0-2-0），而 `.modal-content` 只有一個 class（特指度 0-1-0）。此外，`auth.css` 比 `modal.css` 更晚載入（index.html L36 vs L35）。所以這裡的規則已絕對優先，`!important` 全部多餘。

### 修改（第 11–22 行）

**找到這段：**
```css
.login-modal-wrapper .login-modal-card {
    width: 100%;
    max-width: none !important;
    max-height: 88vh !important;
    padding: 2.5rem !important;
    background: rgba(15, 23, 42, 0.7) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
    position: relative;
    overflow-y: auto !important;
    /* Allow scroll if form is too tall */
}
```

**改為：**
```css
.login-modal-wrapper .login-modal-card {
    width: 100%;
    max-width: none;
    max-height: 88vh;
    padding: 2.5rem;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    position: relative;
    overflow-y: auto;
    /* Allow scroll if form is too tall */
}
```

### 階段三驗證清單
- [ ] 點擊「登入」→ 登入 Modal 深色半透明背景正常
- [ ] 登入/註冊表單的邊框、陰影、padding 正常
- [ ] 手機：登入 Modal 正常顯示

Git 指令：
```
git add css/auth.css
git commit -m "refactor(css): remove redundant !important from login-modal-card"
git push origin master
```

---

## 階段四：`css/components/sections.css`（共 4 處 `!important`）

> 原因：`sections.css` 在 `components.css` 的 import 順序中排在 `buttons.css` 之後，載入較晚，相同特指度（0-1-0）下 `sections.css` 的規則本就優先，`!important` 多餘。

### 修改（第 16–21 行）

**找到這段：**
```css
.footer-github-btn {
    padding: 0.35rem 0.75rem !important;
    font-size: 0.8rem !important;
    border-radius: 8px !important;
    display: inline-flex !important;
}
```

**改為：**
```css
.footer-github-btn {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 8px;
    display: inline-flex;
}
```

### 階段四驗證清單
- [ ] 頁尾的 GitHub ⭐ 按鈕外觀正常（大小、圓角）

Git 指令：
```
git add css/components/sections.css
git commit -m "refactor(css): remove redundant !important from footer-github-btn"
git push origin master
```

---

## 階段五（選修）：`css/toolbar.css`（共 13 處 `!important`，一次替換整段）

> 原因：這些全是 `.purchase-tags-group` 下的子元素，已加了父層包裹使特指度（0-3-0 以上）遠高於基礎 `.tag-btn`（0-1-0），`!important` 為防禦性過度寫法。

### 修改（第 268–296 行）—— 一次替換整個區塊

**找到這段（從注解行到最後一個 `}` 共 29 行）：**
```css
/* ==========================================
   ToolBar Tag Buttons (Filter, Sync)
   ========================================== */
.purchase-tags-group .tag-btn:hover {
    background: rgba(255, 255, 255, 0.05) !important;
}

.purchase-tags-group .tag-btn.active {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    color: #ffffff !important;
    font-weight: 600;
}

.purchase-tags-group #filterPurchased.active {
    background: rgba(16, 185, 129, 0.2) !important; /* 翠綠 Emerald */
    border-color: rgba(16, 185, 129, 0.5) !important;
    color: #34d399 !important;
}

.purchase-tags-group #filterUnpurchased.active {
    background: rgba(99, 102, 241, 0.2) !important; /* 靛青 Indigo */
    border-color: rgba(99, 102, 241, 0.5) !important;
    color: #a5b4fc !important;
}

.purchase-tags-group .tag-btn.active i {
    opacity: 1 !important;
}
```

**改為（移除所有 `!important`，其他什麼都不動）：**
```css
/* ==========================================
   ToolBar Tag Buttons (Filter, Sync)
   ========================================== */
.purchase-tags-group .tag-btn:hover {
    background: rgba(255, 255, 255, 0.05);
}

.purchase-tags-group .tag-btn.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
    color: #ffffff;
    font-weight: 600;
}

.purchase-tags-group #filterPurchased.active {
    background: rgba(16, 185, 129, 0.2); /* 翠綠 Emerald */
    border-color: rgba(16, 185, 129, 0.5);
    color: #34d399;
}

.purchase-tags-group #filterUnpurchased.active {
    background: rgba(99, 102, 241, 0.2); /* 靛青 Indigo */
    border-color: rgba(99, 102, 241, 0.5);
    color: #a5b4fc;
}

.purchase-tags-group .tag-btn.active i {
    opacity: 1;
}
```

> **注意**：`toolbar.css` 第 182–187 行還有 2 處 `!important`（格線按鈕），也一併處理：

**找到這段（第 181–187 行）：**
```css
/* 開啟(顯示格線)狀態：高亮 */
.table-toolbar .square-tag.show-gridlines-btn:has(#showGridlinesToggle:checked) {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    color: #fff;
    opacity: 1;
}
```

**改為：**
```css
/* 開啟(顯示格線)狀態：高亮 */
.table-toolbar .square-tag.show-gridlines-btn:has(#showGridlinesToggle:checked) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
    opacity: 1;
}
```

### 階段五驗證清單
- [ ] 點擊「顯示已持有」→ 按鈕轉為綠色高亮；再點「全部顯示」→ 恢復灰色
- [ ] 點擊「顯示未持有」→ 按鈕轉為藍紫色高亮
- [ ] 點擊工具列格線按鈕 → 按鈕高亮並出現格線
- [ ] 各按鈕 hover 時有輕微背景變化

Git 指令：
```
git add css/toolbar.css
git commit -m "refactor(css): remove redundant !important from toolbar active/hover states"
git push origin master
```
