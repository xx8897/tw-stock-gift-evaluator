# CSS `!important` 五階段淨化計畫

## 前置知識（執行前必讀）

### CSS 載入順序（決定哪條規則勝出）
```
index.html 載入順序：
  L33: layout.css
  L34: components.css  →  @import 順序：
                             1. toolbar.css
                             2. ranking.css
                             3. components/table.css
                             4. components/badges.css
                             5. components/buttons.css      ← glass-btn 在這
                             6. components/sections.css     ← footer-github-btn 在這
                             7. components/user-menu.css
                             8. components/history-popup.css
                             9. components/controls.css
  L35: modal.css
  L36: auth.css        ← 最後載入，優先度最高
```

### CSS 特指度計算規則（用於判斷誰會贏）
- `#id` = 100 分
- `.class` / `[attr]` / `:pseudo-class` = 10 分
- `tag` = 1 分
- 特指度相同時：**後出現的規則贏**（不論是同檔案還是後載入的檔案）

---

## 🔴 階段一：`table.css`（移除 6 處 `!important`）

**檔案路徑**：`css/components/table.css`
**移除原因**：這些選擇器的特指度已高過所有競爭規則，`!important` 完全多餘。

### 修改 1/6（第 42 行）
找到這段：
```css
th.th-interest, td.interest-cell,
th.th-purchased, td.purchase-cell {
    width: 60px;
    text-align: center !important;
    vertical-align: middle;
```
改為：
```css
th.th-interest, td.interest-cell,
th.th-purchased, td.purchase-cell {
    width: 60px;
    text-align: center;
    vertical-align: middle;
```
**原因**：`th.th-interest`（0-1-1）遠高於任何競爭的 `th`（0-0-1），不需要 `!important`。

---

### 修改 2/6（第 65 行）
找到這段：
```css
td.price {
    padding-left: 1.15rem !important;
}
```
改為：
```css
td.price {
    padding-left: 1.15rem;
}
```
**原因**：`td.price`（0-1-1）特指度足夠，無競爭者。

---

### 修改 3/6（第 92 行）
找到這段：
```css
td:nth-child(10) {
    text-align: center !important;
}
```
改為：
```css
td:nth-child(10) {
    text-align: center;
}
```
**原因**：`td:nth-child(10)`（0-1-1）特指度足夠，無競爭者。

---

### 修改 4/6（第 109 行）
找到這段（在 `th:nth-child(3), td.stock-id ...` 多選擇器區塊末尾）：
```css
    text-align: center !important;
}
```
改為：
```css
    text-align: center;
}
```
**原因**：這個區塊的選擇器包含 `th:nth-child(3)` 等，特指度均高於基礎 `th` / `td` 規則，`!important` 多餘。

---

### 修改 5/6（第 463–464 行）
找到這段：
```css
.table-container.show-gridlines table th,
.table-container.show-gridlines table td {
    border-bottom: 1px solid var(--border-subtle) !important;
    border-right: 1px solid var(--border-subtle) !important;
}
```
改為：
```css
.table-container.show-gridlines table th,
.table-container.show-gridlines table td {
    border-bottom: 1px solid var(--border-subtle);
    border-right: 1px solid var(--border-subtle);
}
```
**原因**：`.table-container.show-gridlines table td`（0-2-2）遠高於基礎 `td`（0-0-1），已無敵無需 `!important`。

---

### 修改 6/6（第 468 行）
找到這段：
```css
.table-container.show-gridlines table th {
    border-bottom: 2px solid var(--border-subtle) !important;
}
```
改為：
```css
.table-container.show-gridlines table th {
    border-bottom: 2px solid var(--border-subtle);
}
```
**原因**：同上。

---

### 階段一驗證清單
完成後，用瀏覽器執行以下目視確認：
- [ ] 桌機：「興趣」「已買」欄位的 icon 正常置中
- [ ] 桌機：「最近價格」欄的左側間距正常
- [ ] 桌機：「推薦評分」欄正常置中
- [ ] 桌機：點擊工具列「格線」按鈕，格線正常出現；再次點擊，格線消失
- [ ] 手機：卡片式行佈局正常，各欄對齊不受影響

---

## 🔴 階段二：`modal.css`（修改 4 處，移除共 16 個 `!important`）

**檔案路徑**：`css/modal.css`

### 修改 1/4（第 2–4 行）—— 需改選擇器
**問題根因**：`.sponsor-modal-card`（L3，0-1-0）出現在 `.modal-content`（L131，0-1-0）之前。同特指度時，後出現的 `.modal-content` 會贏，所以原本加了 `!important` 強制覆蓋。

找到這段：
```css
.sponsor-modal-card {
    max-width: 500px !important;
}
```
改為：
```css
.modal-content.sponsor-modal-card {
    max-width: 500px;
}
```
**原因**：`.modal-content.sponsor-modal-card`（0-2-0）高於 `.modal-content`（0-1-0），直接贏過，不需要 `!important`。HTML 元素確認帶有這兩個 class（`class="modal-content sponsor-modal-card"`）。

---

### 修改 2/4（第 21–24 行）—— 需改選擇器
**問題根因**：`.sponsor-intro` 是 `<p>` 標籤，而 `.modal-body p`（0-1-1）的特指度高於 `.sponsor-intro`（0-1-0），所以原本加了 `!important`。

找到這段：
```css
.sponsor-intro {
    text-align: left;
    margin-bottom: 2rem !important;
    font-size: 1rem !important;
}
```
改為：
```css
.sponsor-modal-card .sponsor-intro {
    text-align: left;
    margin-bottom: 2rem;
    font-size: 1rem;
}
```
**原因**：`.sponsor-modal-card .sponsor-intro`（0-2-0）高於 `.modal-body p`（0-1-1），直接贏過。

---

### 修改 3/4（第 93–98 行）—— 只移除 `!important`
找到這段：
```css
.option-info p.option-desc {
    font-size: 0.85rem !important;
    color: var(--text-secondary);
    margin: 0 !important;
    line-height: 1.4 !important;
}
```
改為：
```css
.option-info p.option-desc {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.4;
}
```
**原因**：`.option-info p.option-desc`（0-2-1）已高於 `.modal-body p`（0-1-1），直接贏過，`!important` 多餘。

---

### 修改 4/4（第 324–336 行）—— 只移除 `!important`
**問題根因**：`.feedback-modal-card` 雖然出現在 `.modal-content`（L128）之後（L324），本應直接贏過，但當時開發者不確定，加了 `!important` 作為防禦。實際上全部多餘。

找到這段：
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
改為：
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
**原因**：`.feedback-modal-card`（L324，0-1-0）在同檔案中出現於 `.modal-content`（L128，0-1-0）之後，同特指度時較晚出現的規則勝出，`!important` 全部多餘。

---

### 階段二驗證清單
- [ ] 桌機：點擊「贊助開發者」→ 彈出 Modal，寬度至多 500px，背景/圓角/間距正常
- [ ] 桌機：贊助選項卡片的描述文字（小字）大小與間距正確
- [ ] 桌機：點擊「意見回饋」→ 回饋 Modal 的毛玻璃背景、24px 圓角、padding 正確
- [ ] 手機：上述兩個 Modal 正常顯示

---

## 🔴 階段三：`auth.css`（移除 7 處 `!important`）

**檔案路徑**：`css/auth.css`
**問題根因**：HTML 元素帶有 `class="modal-content login-modal-card"`（雙 class），`.modal-content` 定義在 `modal.css`（index.html L35），而 `.login-modal-wrapper .login-modal-card` 定義在 `auth.css`（index.html L36，**後載入**）。後載入且特指度（0-2-0）高於 `.modal-content`（0-1-0），`!important` 完全多餘。

### 修改（第 11–22 行）
找到這段：
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
改為：
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
- [ ] 點擊「登入」按鈕 → 登入/註冊 Modal 的深色半透明背景、邊框、陰影正常
- [ ] 表單正常捲動（內容超出高度時）
- [ ] 手機：登入 Modal 顯示正常

---

## 🔴 階段四：`sections.css`（移除 4 處 `!important`）

**檔案路徑**：`css/components/sections.css`
**問題根因**：`.footer-github-btn` 可能與 `.glass-btn` 同時加在元素上。`.glass-btn` 定義在 `buttons.css`（components.css import 第 5 位），`.footer-github-btn` 定義在 `sections.css`（第 6 位），兩者同特指度（0-1-0）但 `sections.css` 後載入，故 `.footer-github-btn` 規則本就會贏，`!important` 多餘。

### 修改（第 16–21 行）
找到這段：
```css
.footer-github-btn {
    padding: 0.35rem 0.75rem !important;
    font-size: 0.8rem !important;
    border-radius: 8px !important;
    display: inline-flex !important;
}
```
改為：
```css
.footer-github-btn {
    padding: 0.35rem 0.75rem;
    font-size: 0.8rem;
    border-radius: 8px;
    display: inline-flex;
}
```

### 階段四驗證清單
- [ ] 頁尾的 GitHub ⭐ 按鈕外觀正常（圓角 8px、大小如舊）

---

## 🟡 階段五（選修）：`toolbar.css`（移除 13 處 `!important`）

**檔案路徑**：`css/toolbar.css`
**問題根因**：全部是 JS 動態加掛 `.active` 後的狀態覆蓋。選擇器已加了 `.purchase-tags-group` 父層包裹，特指度已遠高於基礎 `.tag-btn` 規則，`!important` 為防禦性過度寫法。

### 修改 1/6（第 183–184 行）
找到：
```css
.table-toolbar .square-tag.show-gridlines-btn:has(#showGridlinesToggle:checked) {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.3) !important;
    color: #fff;
    opacity: 1;
}
```
改為（移除 2 個 `!important`）：
```css
.table-toolbar .square-tag.show-gridlines-btn:has(#showGridlinesToggle:checked) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
    opacity: 1;
}
```

### 修改 2/6（第 271–273 行）
找到：
```css
.purchase-tags-group .tag-btn:hover {
    background: rgba(255, 255, 255, 0.05) !important;
}
```
改為：
```css
.purchase-tags-group .tag-btn:hover {
    background: rgba(255, 255, 255, 0.05);
}
```

### 修改 3/6（第 275–280 行）
找到：
```css
.purchase-tags-group .tag-btn.active {
    background: rgba(255, 255, 255, 0.15) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    color: #ffffff !important;
    font-weight: 600;
}
```
改為（移除 3 個 `!important`）：
```css
.purchase-tags-group .tag-btn.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
    color: #ffffff;
    font-weight: 600;
}
```

### 修改 4/6（第 282–286 行）
找到：
```css
.purchase-tags-group #filterPurchased.active {
    background: rgba(16, 185, 129, 0.2) !important; /* 翠綠 Emerald */
    border-color: rgba(16, 185, 129, 0.5) !important;
    color: #34d399 !important;
}
```
改為（移除 3 個 `!important`）：
```css
.purchase-tags-group #filterPurchased.active {
    background: rgba(16, 185, 129, 0.2); /* 翠綠 Emerald */
    border-color: rgba(16, 185, 129, 0.5);
    color: #34d399;
}
```

### 修改 5/6（第 288–292 行）
找到：
```css
.purchase-tags-group #filterUnpurchased.active {
    background: rgba(99, 102, 241, 0.2) !important; /* 靛青 Indigo */
    border-color: rgba(99, 102, 241, 0.5) !important;
    color: #a5b4fc !important;
}
```
改為（移除 3 個 `!important`）：
```css
.purchase-tags-group #filterUnpurchased.active {
    background: rgba(99, 102, 241, 0.2); /* 靛青 Indigo */
    border-color: rgba(99, 102, 241, 0.5);
    color: #a5b4fc;
}
```

### 修改 6/6（第 294–296 行）
找到：
```css
.purchase-tags-group .tag-btn.active i {
    opacity: 1 !important;
}
```
改為：
```css
.purchase-tags-group .tag-btn.active i {
    opacity: 1;
}
```

### 階段五驗證清單
- [ ] 點擊「顯示已持有」→ 按鈕變綠色、帶邊框高亮
- [ ] 點擊「顯示未持有」→ 按鈕變藍紫色、帶邊框高亮
- [ ] 點擊「全部」→ 兩個按鈕恢復預設灰色
- [ ] 點擊工具列格線按鈕 → 亮白色高亮正常
- [ ] 各按鈕 hover 樣式正常（輕微背景）

---

## 📋 每階段 Git 提交格式

```
# 階段一
git add css/components/table.css
git commit -m "refactor(css): remove redundant !important from table.css column alignment"

# 階段二
git add css/modal.css
git commit -m "refactor(css): remove !important from modal.css, improve sponsor-modal specificity"

# 階段三
git add css/auth.css
git commit -m "refactor(css): remove redundant !important from login-modal-card styles"

# 階段四
git add css/components/sections.css
git commit -m "refactor(css): remove redundant !important from footer-github-btn"

# 階段五（選修）
git add css/toolbar.css
git commit -m "refactor(css): remove redundant !important from toolbar active state styles"
```

> [!CAUTION]
> 每個階段只修改一個檔案，commit 後部署確認視覺無誤，才進行下一階段。不要把多個階段合並為一次 commit。
