document.addEventListener('DOMContentLoaded', async () => {
    // 優先載入外部組件 (彈窗等)
    if (typeof initComponents === 'function') {
        await initComponents();
    }

    initUI();
    loadData();
    initAuth();
});
