// ==========================================
// 今年紀念品表格 (Annual Announcements Table)
// ==========================================

const ANNUAL_COLGROUP_HTML =
    '<col style="width: 53px;">'  +  // 1. 興趣
    '<col style="width: 53px;">'  +  // 2. 持有
    '<col style="width: 85px;">'  +  // 3. 股號
    '<col style="width: 90px;">'  +  // 4. 公司
    '<col style="width: 85px;">'  +  // 5. 最近價格
    '<col style="width: 115px;">' +  // 6. 最後買進日
    '<col style="width: 115px;">' +  // 7. 股東會日期
    '<col style="width: 85px;">'  +  // 8. 會議性質
    '<col>';                          // 9. 紀念品 (auto)

const HISTORY_COLGROUP_HTML =
    '<col style="width: 53px;">'  +  // 1. 興趣
    '<col style="width: 53px;">'  +  // 2. 持有
    '<col style="width: 85px;">'  +  // 3. 股號
    '<col style="width: 90px;">'  +  // 4. 公司
    '<col style="width: 85px;">'  +  // 5. 最近價格
    '<col>'                       +  // 6. 上次紀念品 (auto)
    '<col style="width: 115px;">' +  // 7. 五年內發放
    '<col style="width: 109px;">' +  // 8. 性價比+
    '<col style="width: 128px;">' +  // 9. 去年條件
    '<col style="width: 118px;">';   // 10. 推薦評分

// 取得 UTC+8 今天日期字串 'YYYY-MM-DD'
function getTodayUTC8() {
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return utc8.toISOString().slice(0, 10);
}

// 'YYYY-MM-DD' → 'YYYY/MM/DD'，null 時回 '—'
function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    const p = dateStr.split('-');
    return p.length === 3 ? `${p[0]}/${p[1]}/${p[2]}` : dateStr;
}

// ── 過濾與排序（重用 table.js 的 check* 函數）──────────────
function applyAnnualFiltersAndSort() {
    const { announcementData, purchasedStocks, interestStocks, filters } = AppState;
    const searchInput  = document.getElementById('searchInput');
    const annualFilter = document.getElementById('annualFilter');
    const query        = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const isAnnualOnly = annualFilter ? annualFilter.checked : false;
    const today        = getTodayUTC8();

    let filtered = announcementData.filter(row => {
        const isPurchased = purchasedStocks.has(row.id);
        const isInterest  = interestStocks.has(row.id);

        return checkSearchMatch(row, query) &&
               checkStarMatch(row, filters.stars) &&
               checkAnnualMatch(row, isAnnualOnly) &&
               checkIdRequirementMatch(row, filters.excludeId, filters.includeId) &&
               checkPurchaseMatch(isPurchased, filters.purchaseFilter) &&
               (filters.interestOnly ? isInterest : true) &&
               checkGiftTypeMatch(row, filters.ticketOnly, filters.objectOnly) &&
               checkNonOddMatch(row, filters.nonOddOnly);
    });

    // 未到期升序在前，已過期升序在後
    filtered.sort((a, b) => {
        const aExp = !!(a.lastBuyDate && a.lastBuyDate < today);
        const bExp = !!(b.lastBuyDate && b.lastBuyDate < today);
        if (aExp !== bExp) return aExp ? 1 : -1;
        const aD = a.lastBuyDate || '';
        const bD = b.lastBuyDate || '';
        return aD < bD ? -1 : aD > bD ? 1 : 0;
    });

    AppState.filteredAnnouncementData = filtered;
}

// ── 渲染 tbody ────────────────────────────────────────────
function renderAnnualTable() {
    // 確保 colgroup / thead 已切換
    const colgroup = document.getElementById('dataColgroup');
    if (colgroup) colgroup.innerHTML = ANNUAL_COLGROUP_HTML;
    const historyThead = document.getElementById('historyThead');
    const annualThead  = document.getElementById('annualThead');
    if (historyThead) historyThead.style.display = 'none';
    if (annualThead)  annualThead.style.display  = '';

    const resultCount = document.getElementById('resultCount');
    const noResults   = document.getElementById('noResults');
    const tableBody   = document.getElementById('tableBody');
    const pagination  = document.getElementById('pagination');

    applyAnnualFiltersAndSort();

    const today = getTodayUTC8();
    const total = AppState.filteredAnnouncementData.length;
    const totalPages = Math.max(1, Math.ceil(total / AppState.pageSize));
    if (AppState.currentPage > totalPages) AppState.currentPage = 1;

    resultCount.textContent = `共 ${total} 筆結果`;

    if (total === 0) {
        noResults.classList.remove('hidden');
        tableBody.innerHTML = '';
        pagination.innerHTML = '';
        return;
    }
    noResults.classList.add('hidden');

    const start    = (AppState.currentPage - 1) * AppState.pageSize;
    const pageData = AppState.filteredAnnouncementData.slice(start, start + AppState.pageSize);

    tableBody.innerHTML = '';
    pageData.forEach(row => {
        const isPurchased = AppState.purchasedStocks.has(row.id);
        const isInterest  = AppState.interestStocks.has(row.id);
        const isExpired   = !!(row.lastBuyDate && row.lastBuyDate < today);
        const priceDisp   = row.price > 0 ? row.price.toFixed(2) : '—';

        const tr = document.createElement('tr');
        if (isPurchased) tr.classList.add('purchased-row');
        if (isExpired)   tr.classList.add('expired-row');

        tr.innerHTML = `
            <td data-label="興趣" class="interest-cell"><button class="interest-btn ${isInterest ? 'active' : ''}" onclick="toggleInterestAndRender('${row.id}')" title="${isInterest ? '取消收藏' : '加入收藏'}"><i class="fa-solid fa-star"></i></button></td>
            <td data-label="持有" class="purchase-cell"><button class="purchase-btn ${isPurchased ? 'active' : ''}" onclick="togglePurchaseAndRender('${row.id}')" title="${isPurchased ? '已買入' : '標記買入'}"><i class="fa-solid ${isPurchased ? 'fa-check' : 'fa-plus'}"></i></button></td>
            <td data-label="股號" class="stock-id"><span class="stock-id-link" onclick="switchToHistoryWithSearch('${row.id}')" title="點擊查看歷史紀念品">${row.id}</span></td>
            <td data-label="公司" class="stock-name">${row.name}</td>
            <td data-label="最近價格" class="price">${priceDisp}</td>
            <td data-label="最後買進日" class="annual-date">${formatDateDisplay(row.lastBuyDate)}</td>
            <td data-label="股東會日期" class="annual-date">${formatDateDisplay(row.meetingDate)}</td>
            <td data-label="會議性質" class="meeting-type">${row.meetingType || '—'}</td>
            <td data-label="紀念品" class="annual-gift">${row.gift || '—'}</td>
        `;
        tableBody.appendChild(tr);
    });

    renderPagination(totalPages);
}

// ── 模式切換 ─────────────────────────────────────────────
window.switchViewMode = function(mode) {
    console.debug('[ViewToggle] switchViewMode →', mode, '| announcementData:', AppState.announcementData.length);
    AppState.viewMode = mode;
    AppState.currentPage = 1;

    const colgroup     = document.getElementById('dataColgroup');
    const historyThead = document.getElementById('historyThead');
    const annualThead  = document.getElementById('annualThead');

    if (mode === 'annual') {
        if (colgroup)     colgroup.innerHTML        = ANNUAL_COLGROUP_HTML;
        if (historyThead) historyThead.style.display = 'none';
        if (annualThead)  annualThead.style.display  = '';
    } else {
        if (colgroup)     colgroup.innerHTML        = HISTORY_COLGROUP_HTML;
        if (historyThead) historyThead.style.display = '';
        if (annualThead)  annualThead.style.display  = 'none';
    }

    renderTable();
};

/**
 * 從今年紀念品點擊股號 → 切回歷史紀念品 + 帶入搜尋
 */
window.switchToHistoryWithSearch = function(stockId) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = stockId;

    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === 'history');
    });

    window.switchViewMode('history');
};
