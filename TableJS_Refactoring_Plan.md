# JavaScript table.js 上帝函式重構計畫

## 執行規則
- 此計畫完全針對 `js/table.js` 檔案。
- 「找到這段」請進行**完整比對後才刪除或替換**，不可只刪局部。
- 若找不到完全一致的代碼字串，**請停下來，不要修改**，向用戶回報。

---

## 背景說明

目前 `js/table.js` 檔案最頂部的 `applyFiltersAndSort` 函式包含了所有的資料過濾與排序邏輯（超過 60 行），所有過濾條件像毛線球一樣糾纏在一個巨大的 `.filter()` 中。

**目標**：將這個巨大的函式拆分為：
1. 負責單一判斷的「過濾器輔助函數群」(`checkSearchMatch`, `checkStarMatch` 等)。
2. 負責陣列排序的 `sortTableData` 輔助函數。
3. 簡化後的主協調者 `applyFiltersAndSort`，它現在只負責依序調用上述函數。

---

## 步驟一：替換 `applyFiltersAndSort` 與其巨型內容

**找到這段（這是 `js/table.js` 的第 1 到 62 行，請完整比對後替換）：**
```javascript
/**
 * 執行過濾與排序，結果直接寫入 AppState.filteredData
 * ⚠️ 重要：只能寫入 AppState.filteredData，不能 return！
 */
function applyFiltersAndSort(query, isAnnualOnly) {
    AppState.filteredData = AppState.globalData.filter(row => {
        const matchSearch = !query ||
            row.id.includes(query) ||
            row.name.toLowerCase().includes(query) ||
            row.gift.toLowerCase().includes(query);

        const rowStar = parseInt(row.score.charAt(0)) || 1;
        const matchStar = AppState.filters.stars.length === 0 ||
            AppState.filters.stars.includes(rowStar);

        const matchAnnual = isAnnualOnly ? row.freq >= 5 : true;

        const matchExcludeId = AppState.filters.excludeId ? !row.cond.includes('身分證') : true;
        const matchIncludeId = AppState.filters.includeId ? row.cond.includes('身分證') : true;

        const isPurchased = AppState.purchasedStocks.has(row.id);
        const isInterest = AppState.interestStocks.has(row.id);
        let matchPurchase = true;
        if (AppState.filters.purchaseFilter === 'purchased') {
            matchPurchase = isPurchased;
        } else if (AppState.filters.purchaseFilter === 'unpurchased') {
            matchPurchase = !isPurchased;
        }

        const matchInterest = AppState.filters.interestOnly ? isInterest : true;

        let matchGiftType = true;
        const giftText = String(row.gift);
        const posKws = ['券', '劵', '卡', '門票', '點數', '抵用金', '購物金', '拿鐵', '美式'];
        const negKws = ['卡套', '卡包', '卡夾', '夾', '撲克牌', '賀卡', '馬卡龍', '打卡', '微波', '保卡', '金屬', '金盞', '黃金', '馬克杯', '合金', '吸掛卡', '打卡板', '記憶卡', '卡片', '指甲剪', '口罩', '提籃'];
        let isTicket = posKws.some(kw => giftText.includes(kw));
        let isExcluded = negKws.some(kw => giftText.includes(kw));
        if (giftText.includes('錦明股東專屬會員卡')) { isTicket = true; isExcluded = false; }
        const finalIsTicket = isTicket && !isExcluded;

        if (AppState.filters.ticketOnly) {
            matchGiftType = finalIsTicket;
        } else if (AppState.filters.objectOnly) {
            const isNoGift = !giftText || giftText === '-' || giftText.includes('未發放') || giftText.includes('不發放');
            matchGiftType = !finalIsTicket && !isNoGift;
        }

        return matchSearch && matchStar && matchAnnual && matchExcludeId && matchIncludeId && matchPurchase && matchGiftType && matchInterest;
    });

    AppState.filteredData.sort((a, b) => {
        let va = a[AppState.currentSort.column];
        let vb = b[AppState.currentSort.column];
        if (AppState.currentSort.column === 'score') {
            va = parseInt(va) || 0;
            vb = parseInt(vb) || 0;
        }
        if (va < vb) return AppState.currentSort.direction === 'asc' ? -1 : 1;
        if (va > vb) return AppState.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });
}
```

**改為（請注入重構後的小型函數群與簡化後的協調者）：**
```javascript
// ==========================================
// 1. 過濾器輔助函數群 (Filter Helpers)
// ==========================================

function checkSearchMatch(row, query) {
    if (!query) return true;
    return row.id.includes(query) ||
           row.name.toLowerCase().includes(query) ||
           row.gift.toLowerCase().includes(query);
}

function checkStarMatch(row, activeStars) {
    if (activeStars.length === 0) return true;
    const rowStar = parseInt(row.score.charAt(0)) || 1;
    return activeStars.includes(rowStar);
}

function checkAnnualMatch(row, isAnnualOnly) {
    return isAnnualOnly ? row.freq >= 5 : true;
}

function checkIdRequirementMatch(row, excludeId, includeId) {
    const needId = row.cond.includes('身分證');
    if (excludeId && needId) return false;
    if (includeId && !needId) return false;
    return true;
}

function checkPurchaseMatch(isPurchased, purchaseFilter) {
    if (purchaseFilter === 'purchased') return isPurchased;
    if (purchaseFilter === 'unpurchased') return !isPurchased;
    return true;
}

function checkGiftTypeMatch(row, ticketOnly, objectOnly) {
    if (!ticketOnly && !objectOnly) return true;

    const giftText = String(row.gift);
    const posKws = ['券', '劵', '卡', '門票', '點數', '抵用金', '購物金', '拿鐵', '美式'];
    const negKws = ['卡套', '卡包', '卡夾', '夾', '撲克牌', '賀卡', '馬卡龍', '打卡', '微波', '保卡', '金屬', '金盞', '黃金', '馬克杯', '合金', '吸掛卡', '打卡板', '記憶卡', '卡片', '指甲剪', '口罩', '提籃'];
    
    let isTicket = posKws.some(kw => giftText.includes(kw));
    let isExcluded = negKws.some(kw => giftText.includes(kw));
    if (giftText.includes('錦明股東專屬會員卡')) { isTicket = true; isExcluded = false; }
    
    const finalIsTicket = isTicket && !isExcluded;

    if (ticketOnly) return finalIsTicket;
    if (objectOnly) {
        const isNoGift = !giftText || giftText === '-' || giftText.includes('未發放') || giftText.includes('不發放');
        return !finalIsTicket && !isNoGift;
    }
    return true;
}

// ==========================================
// 2. 排序輔助函數 (Sort Helper)
// ==========================================

function sortTableData(data, sortColumn, sortDirection) {
    data.sort((a, b) => {
        let va = a[sortColumn];
        let vb = b[sortColumn];
        if (sortColumn === 'score') {
            va = parseInt(va) || 0;
            vb = parseInt(vb) || 0;
        }
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

// ==========================================
// 3. 核心協調者 (Orchestrator)
// ==========================================
/**
 * 執行過濾與排序，結果直接寫入 AppState.filteredData
 * ⚠️ 重要：只能寫入 AppState.filteredData，不能 return！
 */
function applyFiltersAndSort(query, isAnnualOnly) {
    const { filters, purchasedStocks, interestStocks, currentSort, globalData } = AppState;

    AppState.filteredData = globalData.filter(row => {
        const isPurchased = purchasedStocks.has(row.id);
        const isInterest = interestStocks.has(row.id);

        return checkSearchMatch(row, query) &&
               checkStarMatch(row, filters.stars) &&
               checkAnnualMatch(row, isAnnualOnly) &&
               checkIdRequirementMatch(row, filters.excludeId, filters.includeId) &&
               checkPurchaseMatch(isPurchased, filters.purchaseFilter) &&
               (filters.interestOnly ? isInterest : true) &&
               checkGiftTypeMatch(row, filters.ticketOnly, filters.objectOnly);
    });

    sortTableData(AppState.filteredData, currentSort.column, currentSort.direction);
}
```

---

## 步驟二：驗證

此步驟無本機 Python 驗證，需開啟網頁（或請使用者刷新頁面）並手動點擊以下元件進行測試：
1. **輸入框搜尋**：輸入「王品」，確認是否有過濾出王品。
2. **條件過濾按鈕**：點擊「不含身分證」、「連發五年」，確認資料有減少且正確。
3. **星級過濾按鈕**：點擊上方「5 星」按鈕，確認是否只顯示五星。
4. **表格排序**：點擊表格標題列（例如：推薦評分、五年內發放），確認排序是否正常切換升/降冪。

**如果網頁出錯（白屏或主控台有 TypeError），請立即放棄提交並查看 `table.js` 是否語法損毀。**

---

## 步驟三：Git 提交

若驗證通過，請使用以下指令進行提交並推上 GitHub：
```bash
git add js/table.js
git commit -m "refactor(ui): split deeply nested applyFiltersAndSort function into modular helpers"
git push origin master
```
