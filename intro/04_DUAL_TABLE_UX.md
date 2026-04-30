---
title: "雙檢視 UX"
subtitle: "歷史模式↔年度模式、跨模式深連結、即時急迫感"
document_type: narrative
version: 2.0
language: zh-TW
ux_decisions:
  - "兩個模式而不是一個：歷史（5年平均）vs 年度（今年公告）"
  - "深連結：年度模式的股票可以跳轉到歷史模式看完整紀錄"
  - "急迫感：最後買進日倒數計時，到期自動變紅"
  - "兩個模式的資料來源不同：歷史用 stocks 表，年度用當年度表"
  - "排序邏輯不同：歷史按 CP+ 排序，年度按星級排序"
related_documents:
  - 05_STAR_SYSTEM.md
  - 06_GLASS_AND_DARK.md
tags: [ux, dual-view, deep-linking, countdown, urgency]
---

# 雙檢視 UX

> 歷史模式看五年平均，年度模式看今年公告。兩個表格，兩個資料來源，兩個排序邏輯——但使用者只需要點一個連結就能跳轉。

## 為什麼要兩個模式

一個散戶在股東會季節有兩種完全不同的需求：

### 歷史模式：誰最穩定？

「我想找一支長期值得買的股票——過去五年都有發紀念品，CP+ 一直很高。」

歷史模式使用 `stocks` 表的 `five_year_total`、`frequency`、`cp` 欄位。這些是五年累計數據，由 GitHub Actions 每週更新。排序邏輯是 CP+（性價比）從高到低。

### 年度模式：今年有什麼可以買？

「我想知道今年誰公告了、最後買進日是哪天、還來不來得及。」

年度模式使用當年度表（如 `"2026"`），欄位完全不同：`gift`（今年禮物）、`last_buy_date`（最後買進日）、`condition`（領取條件）、`method`（領取方式）。排序邏輯是星級從高到低。

**兩個模式解決兩個完全不同的問題。** 合併成一個表格只會讓兩種資訊都變得難看。

## 跨模式深連結

兩個模式之間有一個深連結：年度模式中的每支股票，都有一個連結可以跳轉到歷史模式查看完整紀錄。

```javascript
// 年度模式表格中的連結
function createHistoryLink(stockId) {
    return `<a href="#" onclick="switchToHistory('${stockId}')">${stockId}</a>`;
}

// 跳轉後自動捲動到目標股票
function switchToHistory(stockId) {
    currentMode = 'history';
    renderTable();
    const row = document.querySelector(`[data-stock-id="${stockId}"]`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row?.classList.add('highlight-flash');
}
```

這不是兩個獨立的頁面，同一個頁面，切換模式，自動捲動到目標行，閃爍一下讓使用者知道在哪裡。

## 倒數計時：急迫感

年度模式有一個歷史模式沒有的東西：**最後買進日倒數計時。**

```
🟢 還有 12 天  →  綠色徽章
🟡 還有 5 天   →  黃色徽章
🔴 已截止       →  紅色徽章，整行灰化
```

實作方式：

```javascript
function getCountdownBadge(lastBuyDate) {
    const days = Math.ceil((new Date(lastBuyDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: '已截止', class: 'badge-danger', rowClass: 'row-expired' };
    if (days <= 5) return { text: `僅剩 ${days} 天`, class: 'badge-warning' };
    return { text: `還有 ${days} 天`, class: 'badge-success' };
}
```

已截止的股票整行灰化 + 半透明，視覺上告訴使用者「這個已經來不及了」。

## 排序邏輯的差異

| | 歷史模式 | 年度模式 |
|---|---|---|
| 資料來源 | `stocks` 表 | `2026` 表（當年度） |
| 主排序 | CP+ 降序 | 星級降序 |
| 次排序 | 五年總值降序 | 最後買進日升序 |
| 顯示欄位 | CP+, 五年總值, 頻率, 星級 | 禮物名, 領取條件, 倒數計時, 星級 |
| 更新頻率 | 每週（Actions） | 即時（Supabase 即時訂閱） |

**歷史模式按 CP+ 排序**，因為長期投資者最關心的是性價比——每 1 元股價能換多少紀念品價值。

**年度模式按星級排序**，因為短期買家最關心的是綜合評價——今年這支股票值不值得買，考慮了歷史頻率、領取門檻、零股限制等所有因素。

## 表格渲染的共同核心

兩個模式共用 `table.js` 的核心渲染邏輯：

```javascript
// table.js 的責任：
// 1. 接收資料陣列和欄位定義
// 2. 渲染表格頭、行、分頁
// 3. 處理排序（點擊表頭切換升降序）
// 4. 處理篩選（搜尋框、星級篩選）
// 5. 觸發回調（行點擊、買入/關注按鈕）

function renderTable(data, columns, options) {
    // 排序
    data.sort(comparator(options.sortColumn, options.sortDirection));
    // 篩選
    data = filter(data, options.filters);
    // 渲染
    const html = data.map(row => renderRow(row, columns, options)).join('');
    // ...
}
```

差異不在渲染邏輯，在資料和欄位定義。`data.js` 負責從 Supabase 抓取不同表的資料，`table.js` 只負責渲染。這讓添加新模式只需要加一個新的資料抓取函數和一組新的欄位定義。

## 搜尋和篩選的跨模式一致性

兩個模式共享同一個搜尋框和星級篩選器：

```javascript
// 切換模式時保留篩選條件
document.getElementById('mode-toggle').addEventListener('click', () => {
    const currentSearch = document.getElementById('search-input').value;
    const currentFilter = document.getElementById('star-filter').value;
    currentMode = currentMode === 'history' ? 'annual' : 'history';
    renderTable();
    // 恢復篩選
    document.getElementById('search-input').value = currentSearch;
    document.getElementById('star-filter').value = currentFilter;
    applyFilters();
});
```

使用者在歷史模式搜尋「台積電」，切到年度模式，搜尋框還是「台積電」。體驗是連續的。