document.addEventListener('DOMContentLoaded', async () => {
    // 優先載入外部組件 (彈窗等)
    if (typeof initComponents === 'function') {
        await initComponents();
    }

    try {
        if (typeof initUI === 'function') {
            initUI();
        } else {
            console.warn('[Main]: initUI is not available');
        }
    } catch (e) {
        console.error('[Main]: initUI failed', e);
    }

    try {
        if (typeof initRankingUI === 'function') {
            initRankingUI();
        } else {
            console.warn('[Main]: initRankingUI is not available');
        }
    } catch (e) {
        console.error('[Main]: initRankingUI failed', e);
    }

    try {
        if (typeof loadData === 'function') {
            loadData();
        } else {
            console.warn('[Main]: loadData is not available');
        }
    } catch (e) {
        console.error('[Main]: loadData failed', e);
    }

    try {
        if (typeof initAuth === 'function') {
            initAuth();
        } else {
            console.warn('[Main]: initAuth is not available');
        }
    } catch (e) {
        console.error('[Main]: initAuth failed', e);
    }
});
