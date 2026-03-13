function initUI() {
    let step = 'start';
    console.debug('[UI] initUI start');
    try {
    // (主題切換功能已移除)

    step = 'modals';
    const infoModal = document.getElementById('infoModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const sponsorModal = document.getElementById('sponsorModal');
    const ecpayDisabledModal = document.getElementById('ecpayDisabledModal');
    const openSponsorBtn = document.getElementById('openSponsorBtn');
    const closeSponsorBtn = document.getElementById('closeSponsorBtn');

    // ── 彈出視窗 ──────────────────────────────────────────────
    openModalBtn?.addEventListener('click', () => infoModal.classList.remove('hidden'));
    closeModalBtn?.addEventListener('click', () => infoModal.classList.add('hidden'));
    openSponsorBtn?.addEventListener('click', () => sponsorModal.classList.remove('hidden'));
    closeSponsorBtn?.addEventListener('click', () => sponsorModal.classList.add('hidden'));

    [infoModal, sponsorModal].forEach(m => {
        m?.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
    });

    // 綠界未啟用提示
    const ecpayOption = document.querySelector('.sponsor-option-card.ecpay');
    ecpayOption?.addEventListener('click', (e) => {
        e.preventDefault();
        ecpayDisabledModal?.classList.remove('hidden');
    });
    ecpayDisabledModal?.addEventListener('click', () => {
        ecpayDisabledModal.classList.add('hidden');
    });

    // ── 點擊其他地方收起歷史彈窗 ─────────────────────────────
    document.addEventListener('click', (e) => {
        const historyBtn = e.target.closest('.history-btn');
        const insidePopup = e.target.closest('.history-popup');

        // 如果點擊的是按鈕，交給 toggleHistoryPopup 處理，此處不動作
        if (historyBtn) return;

        // 如果點擊的是彈窗內部，保持開啟
        if (insidePopup) return;

        // 點擊其他地方，關閉所有開啟中的彈窗
        document.querySelectorAll('.history-popup.open').forEach(el => el.classList.remove('open', 'popup-upward'));
    });

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
    excludeIdFilter?.addEventListener('change', () => {
        AppState.filters.excludeId = excludeIdFilter.checked;
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    const ticketFilter = document.getElementById('ticketFilter');
    ticketFilter?.addEventListener('change', () => {
        AppState.filters.ticketOnly = ticketFilter.checked;
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

    pageSizeSelect?.addEventListener('change', () => {
        AppState.pageSize = parseInt(pageSizeSelect.value, 10);
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    step = 'sorting';
    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            if (!AppState.globalData.length) return;
            const col = header.dataset.sort;
            if (AppState.currentSort.column === col) {
                AppState.currentSort.direction = AppState.currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.currentSort.column = col;
                AppState.currentSort.direction = 'desc';
            }
            sortHeaders.forEach(h => {
                h.classList.remove('active');
                const si = h.querySelector('i.fa-solid');
                if (si) si.className = 'fa-solid fa-sort';
            });
            header.classList.add('active');
            const si = header.querySelector('i.fa-solid');
            if (si) si.className = AppState.currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
            AppState.currentPage = 1;
            renderTable();
        });
    });

    // 預設排序 icon
    const defaultHeader = document.querySelector('th[data-sort="score"]');
    if (defaultHeader) {
        defaultHeader.classList.add('active');
        const si = defaultHeader.querySelector('i.fa-solid');
        if (si) si.className = 'fa-solid fa-sort-down';
    }

    // ── 禮物 icon 金幣爆炸 ────────────────────────────────────
    step = 'giftbox';
    const headerGiftBox = document.getElementById('headerGiftBox');
    if (headerGiftBox) {
        headerGiftBox.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate([30]);
            const rect = headerGiftBox.getBoundingClientRect();
            if (typeof triggerConfetti === 'function') {
                triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
            createCoins(rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
    }
    console.debug('[UI] initUI done');
    } catch (e) {
        console.error(`[UI] initUI failed at ${step}`, e);
        throw e;
    }
}

function createCoins(lx, ly) {
    const coinIcons = ['💰', '🪙', '✨', '💎'];
    for (let i = 0; i < 15; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin-particle';
        coin.textContent = coinIcons[Math.floor(Math.random() * coinIcons.length)];

        const tx = (Math.random() - 0.5) * 300;
        const ty = (Math.random() - 0.8) * 300;
        const tr = (Math.random() - 0.5) * 720;

        coin.style.left = lx + 'px';
        coin.style.top = ly + 'px';
        coin.style.setProperty('--tx', `${tx}px`);
        coin.style.setProperty('--ty', `${ty}px`);
        coin.style.setProperty('--tr', `${tr}deg`);

        document.body.appendChild(coin);
        coin.onanimationend = () => coin.remove();
    }
}

/**
 * 切換歷年紀念品彈窗 (唯一化管理 + 智慧型邊界偵測)
 */
window.toggleHistoryPopup = function(btn) {
    const parent = btn.closest('.gift-cell');
    if (!parent) return;
    
    const popup = parent.querySelector('.history-popup');
    if (!popup) return;

    const isOpen = popup.classList.contains('open');

    // 1. 先關閉其它所有開啟中的彈窗
    document.querySelectorAll('.history-popup.open').forEach(el => {
        if (el !== popup) el.classList.remove('open', 'popup-upward');
    });

    // 2. 切換當前彈窗
    if (!isOpen) {
        popup.classList.add('open');
        
        // 智慧型邊界偵測：優先「向下」開啟，只有底部空間不足且頂部空間足夠時才翻轉
        const popupRect = popup.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const container = document.querySelector('.table-container');
        const containerRect = container ? container.getBoundingClientRect() : null;
        
        let shouldFlip = false;
        
        // 門檻：當彈窗底部超出 螢幕底部 或 容器底部
        const isBottomOverWindow = popupRect.bottom > viewportHeight - 10;
        const isBottomOverContainer = containerRect && popupRect.bottom > containerRect.bottom - 5;
        
        if (isBottomOverWindow || isBottomOverContainer) {
            // 只有當「向上」的空間比「向下」寬裕時才翻轉
            // 向上空間 = 按鈕頂部距離視窗頂部
            if (btnRect.top > popupRect.height + 40) {
                shouldFlip = true;
            }
        }
        
        if (shouldFlip) {
            popup.classList.add('popup-upward');
        } else {
            popup.classList.remove('popup-upward');
        }
    } else {
        popup.classList.remove('open', 'popup-upward');
    }
};
