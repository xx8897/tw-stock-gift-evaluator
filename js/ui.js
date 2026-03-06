function initUI() {
    // (主題切換功能已移除)

    const infoModal = document.getElementById('infoModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const sponsorModal = document.getElementById('sponsorModal');
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

    // ── 點擊其他地方收起歷史彈窗 ─────────────────────────────
    document.addEventListener('click', () => {
        document.querySelectorAll('.history-popup.open').forEach(el => el.classList.remove('open'));
    });

    // ── 搜尋、過濾、排序、分頁大小（僅在資料載入後作用）───────
    const searchInput = document.getElementById('searchInput');
    const starButtons = document.querySelectorAll('#starFilterGroup .filter-btn[data-star]');
    const annualFilter = document.getElementById('annualFilter');
    const filterPurchased = document.getElementById('filterPurchased');
    const filterUnpurchased = document.getElementById('filterUnpurchased');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const sortHeaders = document.querySelectorAll('th.sortable');

    searchInput?.addEventListener('input', () => {
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
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
    const giftIcon = document.querySelector('.bounce-icon');
    if (giftIcon) {
        giftIcon.addEventListener('click', () => {
            const rect = giftIcon.getBoundingClientRect();
            createCoins(rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
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
