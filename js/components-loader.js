/**
 * 安全的組件載入器
 * 功能：從外部 .html 檔案讀取區塊並注入到頁面中
 */
async function loadComponent(elementId, filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`無法載入組件: ${filePath}`);
        const html = await response.text();
        const container = document.getElementById(elementId);
        if (container) {
            container.innerHTML = html;
            return true;
        }
    } catch (error) {
        console.error('[Loader Error]:', error);
    }
    return false;
}

// 初始化所有組件
async function initComponents() {
    // 建立一個隱藏的容器來放這些彈窗
    let modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        document.body.appendChild(modalContainer);
    }

    // 依序載入 HTML 區塊
    await loadComponent('modalContainer', 'components/auth-modal.html');

    // 建立第二個容器放說明彈窗 (為了不覆寫)
    const infoContainer = document.createElement('div');
    infoContainer.id = 'infoContainer';
    document.body.appendChild(infoContainer);
    await loadComponent('infoContainer', 'components/info-modals.html');

    // 建立第三個容器放回饋彈窗
    const feedbackContainer = document.createElement('div');
    feedbackContainer.id = 'feedbackContainer';
    document.body.appendChild(feedbackContainer);
    await loadComponent('feedbackContainer', 'components/feedback-modal.html');

    console.log('[Component Loader]: 所有 HTML 組件已就緒');

    // 組件載入後，手動觸發初始化
    if (typeof bindAuthEvents === 'function') {
        bindAuthEvents();
    }

    if (typeof initFeedbackModal === 'function') {
        initFeedbackModal();
    }
}

// 暴露給全域
window.initComponents = initComponents;
window.SCRIPTS = [
    'js/supabase-config.js',
    'js/analytics.js',
    'js/data.js',
    'js/auth/auth-api.js',
    'js/auth/auth-ui.js',
    'js/sync.js',
    'js/table.js',
    'js/ui.js',
    'js/feedback-modal.js'
];

