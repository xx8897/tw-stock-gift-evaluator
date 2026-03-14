window.initTableEvents = function() {
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
};
