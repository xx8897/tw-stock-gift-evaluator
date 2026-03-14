window.initFilters = function() {
    // ── 搜尋、過濾、排序、分頁大小（僅在資料載入後作用）───────
    step = 'filters';
    const searchInput = document.getElementById('searchInput');
    const starButtons = document.querySelectorAll('#starFilterGroup .filter-btn[data-star]');
    const annualFilter = document.getElementById('annualFilter');
    const filterPurchased = document.getElementById('filterPurchased');
    const filterUnpurchased = document.getElementById('filterUnpurchased');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const sortHeaders = document.querySelectorAll('th.sortable');

    let searchTimer = null;
    searchInput?.addEventListener('input', () => {
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();

        // 搜尋行為點擊追蹤 (防抖 1秒)
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            const val = searchInput.value.trim();
            if (val && typeof trackUIEvent === 'function') {
                trackUIEvent('search_query', val);
            }
        }, 1000);
    });

    // 星星過濾器 (多選邏輯)
    starButtons.forEach(btn => btn.addEventListener('click', () => {
        const star = btn.dataset.star;
        if (star === 'all') {
            AppState.filters.stars = [];
            starButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        } else {
            const starNum = parseInt(star);
            const index = AppState.filters.stars.indexOf(starNum);
            if (index > -1) {
                AppState.filters.stars.splice(index, 1);
                btn.classList.remove('active');
            } else {
                AppState.filters.stars.push(starNum);
                btn.classList.add('active');
            }

            // 如果選了星星，取消「全部」的 active
            const allBtn = document.querySelector('#starFilterGroup .filter-btn[data-star="all"]');
            if (AppState.filters.stars.length > 0) {
                allBtn?.classList.remove('active');
            } else {
                allBtn?.classList.add('active');
            }
        }
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    }));

    annualFilter?.addEventListener('change', () => {
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    const excludeIdFilter = document.getElementById('excludeIdFilter');
    const includeIdFilter = document.getElementById('includeIdFilter');

    excludeIdFilter?.addEventListener('change', () => {
        AppState.filters.excludeId = excludeIdFilter.checked;
        if (excludeIdFilter.checked && includeIdFilter) {
            includeIdFilter.checked = false;
            AppState.filters.includeId = false;
        }
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });
    includeIdFilter?.addEventListener('change', () => {
        AppState.filters.includeId = includeIdFilter.checked;
        if (includeIdFilter.checked && excludeIdFilter) {
            excludeIdFilter.checked = false;
            AppState.filters.excludeId = false;
        }
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    const ticketFilter = document.getElementById('ticketFilter');
    const objectFilter = document.getElementById('objectFilter');

    ticketFilter?.addEventListener('change', () => {
        AppState.filters.ticketOnly = ticketFilter.checked;
        if (ticketFilter.checked && objectFilter) {
            objectFilter.checked = false;
            AppState.filters.objectOnly = false;
        }
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    objectFilter?.addEventListener('change', () => {
        AppState.filters.objectOnly = objectFilter.checked;
        if (objectFilter.checked && ticketFilter) {
            ticketFilter.checked = false;
            AppState.filters.ticketOnly = false;
        }
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    const interestFilter = document.getElementById('interestFilter');
    interestFilter?.addEventListener('change', () => {
        AppState.filters.interestOnly = interestFilter.checked;
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    // 買入/未買過濾 (工具列、互斥)
    const updatePurchaseUI = () => {
        filterPurchased?.classList.toggle('active', AppState.filters.purchaseFilter === 'purchased');
        filterUnpurchased?.classList.toggle('active', AppState.filters.purchaseFilter === 'unpurchased');
    };

    filterPurchased?.addEventListener('click', () => {
        AppState.filters.purchaseFilter = (AppState.filters.purchaseFilter === 'purchased') ? 'all' : 'purchased';
        updatePurchaseUI();
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    filterUnpurchased?.addEventListener('click', () => {
        AppState.filters.purchaseFilter = (AppState.filters.purchaseFilter === 'unpurchased') ? 'all' : 'unpurchased';
        updatePurchaseUI();
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    const showGridlinesToggle = document.getElementById('showGridlinesToggle');
    const tableContainer = document.querySelector('.table-container');
    const gridlinesIcon = document.getElementById('gridlinesIcon');

    const updateGridlinesUI = (isShow) => {
        if (isShow) {
            tableContainer?.classList.add('show-gridlines');
            localStorage.setItem('showGridlines', 'true');
            if (gridlinesIcon) gridlinesIcon.className = 'fa-solid fa-eye';
        } else {
            tableContainer?.classList.remove('show-gridlines');
            localStorage.setItem('showGridlines', 'false');
            if (gridlinesIcon) gridlinesIcon.className = 'fa-solid fa-eye-slash';
        }
    };

    if (showGridlinesToggle) {
        // 讀取本地格線狀態，預設為隱藏 (false)
        if (localStorage.getItem('showGridlines') === 'true') {
            showGridlinesToggle.checked = true;
            updateGridlinesUI(true);
        } else {
            showGridlinesToggle.checked = false;
            updateGridlinesUI(false);
        }

        showGridlinesToggle.addEventListener('change', () => {
            updateGridlinesUI(showGridlinesToggle.checked);
        });
    }

    pageSizeSelect?.addEventListener('change', () => {
        AppState.pageSize = parseInt(pageSizeSelect.value, 10);
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });
};
