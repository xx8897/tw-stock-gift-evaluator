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

function checkNonOddMatch(row, nonOddOnly) {
    if (!nonOddOnly) return true;
    const cond = String(row.cond || '');
    if (cond.includes('可零股') || cond.includes('不限股數')) {
        return false;
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
               checkGiftTypeMatch(row, filters.ticketOnly, filters.objectOnly) &&
               checkNonOddMatch(row, filters.nonOddOnly);
    });

    sortTableData(AppState.filteredData, currentSort.column, currentSort.direction);
}

function renderTable() {
    const searchInput = document.getElementById('searchInput');
    const annualFilter = document.getElementById('annualFilter');
    const resultCount = document.getElementById('resultCount');
    const noResults = document.getElementById('noResults');
    const tableBody = document.getElementById('tableBody');
    const pagination = document.getElementById('pagination');

    const query = searchInput.value.toLowerCase().trim();
    const isAnnualOnly = annualFilter ? annualFilter.checked : false;

    applyFiltersAndSort(query, isAnnualOnly);

    const total = AppState.filteredData.length;
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

    const start = (AppState.currentPage - 1) * AppState.pageSize;
    const pageData = AppState.filteredData.slice(start, start + AppState.pageSize);

    tableBody.innerHTML = '';
    pageData.forEach(row => {
        const starNum = parseInt(row.score.charAt(0)) || 1;
        const displayGift = row.gift.length > 18 ? row.gift.slice(0, 18) + '…' : row.gift;
        const isPurchased = AppState.purchasedStocks.has(row.id);

        let historyHtml = '';
        const raw5y = row.fiveYearGifts;
        if (raw5y && raw5y !== 'nan' && raw5y.trim()) {
            const lines = raw5y.split(/\r?\n/).filter(l => l.trim());
            historyHtml = lines.map(l => {
                const clean = l.trim();
                const m = clean.match(/^\((\d{4})\)(.*)$/);
                if (m) {
                    return `<div class="hist-row"><span class="hist-year">${m[1]}</span><span class="hist-gift">${m[2].trim() || '（未發放）'}</span></div>`;
                }
                return `<div class="hist-row"><span class="hist-gift">${clean}</span></div>`;
            }).join('');
        }
        const condText = (row.cond && row.cond !== 'nan' && row.cond.trim()) ? row.cond.trim() : '—';
        const historyTag = historyHtml
            ? `<button class="history-btn" onclick="toggleHistoryPopup(this)" title="查看五年歷史"><i class="fa-solid fa-clock-rotate-left"></i></button><div class="history-popup">${historyHtml}</div>`
            : '';
        const condDisplay = condText;

        const tr = document.createElement('tr');
        if (isPurchased) tr.classList.add('purchased-row');
        const isInterest = AppState.interestStocks.has(row.id);

        tr.innerHTML = `
            <td data-label="興趣" class="interest-cell"><button class="interest-btn ${isInterest ? 'active' : ''}" onclick="toggleInterestAndRender('${row.id}')" title="${isInterest ? '取消收藏' : '加入收藏'}"><i class="fa-solid fa-star"></i></button></td>
            <td data-label="已買" class="purchase-cell"><button class="purchase-btn ${isPurchased ? 'active' : ''}" onclick="togglePurchaseAndRender('${row.id}')" title="${isPurchased ? '已買入' : '標記買入'}"><i class="fa-solid ${isPurchased ? 'fa-check' : 'fa-plus'}"></i></button></td>
            <td data-label="股號" class="stock-id">${row.id}</td>
            <td data-label="公司" class="stock-name">${row.name}</td>
            <td data-label="最近價格" class="price">${row.price.toFixed(2)}</td>
            <td data-label="上次紀念品">
                <div class="gift-cell"><span class="gift-text" title="${row.gift}">${displayGift}</span>${historyTag}</div>
            </td>
            <td data-label="五年內發放" class="freq-cell">
                <span class="freq-num">${row.freq}<span class="freq-slash">/5</span></span>
            </td>
            <td data-label="CP 值" class="cp-value">${row.cp.toFixed(2)}</td>
            <td data-label="去年條件" class="cond-cell" title="${condText}">${condDisplay}</td>
            <td data-label="推薦評分"><span class="badge badge-${starNum}">${row.score}</span></td>
        `;
        tableBody.appendChild(tr);
    });

    renderPagination(totalPages);
}

/**
 * 切換買入狀態並重新渲染表格
 */
function togglePurchaseAndRender(stockId) {
    const stock = AppState.globalData.find(s => s.id === stockId);
    if (stock && typeof trackStockEvent === 'function') {
        const becomingPurchased = !AppState.purchasedStocks.has(stockId);
        trackStockEvent(stockId, stock.name, becomingPurchased ? 'mark_purchased' : 'unmark_purchased');
    }
    togglePurchase(stockId);
}

/**
 * 切換興趣狀態並重新渲染
 */
function toggleInterestAndRender(stockId) {
    const stock = AppState.globalData.find(s => s.id === stockId);
    if (stock && typeof trackStockEvent === 'function') {
        const becomingInterest = !AppState.interestStocks.has(stockId);
        trackStockEvent(stockId, stock.name, becomingInterest ? 'mark_interest' : 'unmark_interest');
    }
    toggleInterest(stockId);
}

function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const mkBtn = (label, page, active, disabled) => {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
        btn.innerHTML = label;
        btn.disabled = disabled;
        if (!disabled && !active) {
            btn.addEventListener('click', () => {
                AppState.currentPage = page;
                renderTable();
                document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        return btn;
    };

    const mkEllipsis = () => {
        const s = document.createElement('span');
        s.className = 'page-ellipsis';
        s.textContent = '…';
        return s;
    };

    pagination.appendChild(mkBtn('<i class="fa-solid fa-chevron-left"></i>', AppState.currentPage - 1, false, AppState.currentPage === 1));

    let pages;
    if (totalPages <= 11) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        pages = [1];
        if (AppState.currentPage > 4) pages.push('...');
        for (let i = Math.max(2, AppState.currentPage - 3); i <= Math.min(totalPages - 1, AppState.currentPage + 3); i++) pages.push(i);
        if (AppState.currentPage < totalPages - 3) pages.push('...');
        pages.push(totalPages);
    }
    pages.forEach(p => {
        pagination.appendChild(p === '...' ? mkEllipsis() : mkBtn(p, p, p === AppState.currentPage, false));
    });

    pagination.appendChild(mkBtn('<i class="fa-solid fa-chevron-right"></i>', AppState.currentPage + 1, false, AppState.currentPage === totalPages));

    const jumpWrap = document.createElement('div');
    jumpWrap.className = 'page-jump';
    jumpWrap.innerHTML = `
        <span>跳至</span>
        <input id="pageJumpInput" type="number" min="1" max="${totalPages}" value="${AppState.currentPage}" title="輸入頁碼後按 Enter">
        <span>/ ${totalPages}</span>
    `;
    pagination.appendChild(jumpWrap);

    const jumpInput = jumpWrap.querySelector('#pageJumpInput');
    const doJump = () => {
        const v = parseInt(jumpInput.value, 10);
        if (v >= 1 && v <= totalPages && v !== AppState.currentPage) {
            AppState.currentPage = v;
            renderTable();
            document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    jumpInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJump(); });
    jumpInput.addEventListener('blur', doJump);
    jumpInput.addEventListener('click', e => e.stopPropagation());
}
