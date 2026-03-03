function initUI() {
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
    const filterBtns = document.querySelectorAll('.filter-btn input[type="radio"]');
    const annualFilter = document.getElementById('annualFilter');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const sortHeaders = document.querySelectorAll('th.sortable');

    searchInput?.addEventListener('input', () => {
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    });

    filterBtns.forEach(btn => btn.addEventListener('change', e => {
        document.querySelectorAll('.filter-btn').forEach(l => l.classList.remove('active'));
        if (e.target.checked) e.target.parentElement.classList.add('active');
        if (!AppState.globalData.length) return;
        AppState.currentPage = 1;
        renderTable();
    }));

    annualFilter?.addEventListener('change', () => {
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
