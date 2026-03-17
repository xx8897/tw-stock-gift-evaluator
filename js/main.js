// --- 載入訊息輪播器 ---
const LOADING_MESSAGES = [
    '正在連線至 Supabase 高速資料庫...',
    '同步 FinMind 每日台股最新行情...',
    '執行零股性價比 (CP值) 精算模型...',
    '比對 800+ 支股票五年紀念品歷史...',
    '套用個人雲端持股紀錄與收藏清單...',
    '即將完成，正在準備渲染資料表格...',
];

let _loadingRotatorInterval = null;

function startLoadingTextRotation() {
    const span = document.getElementById('loadingMessageSpan');
    if (!span) return;

    let idx = 0;

    function nextMessage() {
        if (!_loadingRotatorInterval) return; // 如果已經呼叫 stop 則停止

        span.classList.add('fade-out');
        setTimeout(() => {
            idx = (idx + 1) % LOADING_MESSAGES.length;
            span.textContent = LOADING_MESSAGES[idx];
            span.classList.remove('fade-out');
            span.classList.add('fade-in');
            
            setTimeout(() => {
                span.classList.remove('fade-in');
                // 每句話展示完全後，等待一小段時間再呼叫 nextMessage
                _loadingRotatorInterval = setTimeout(nextMessage, 400); // 0.4 秒停留
            }, 400); // fade-in 動畫時間
        }, 260); // fade-out 動畫時間
    }

    // 第一句話預設只秀 0.3 秒就要準備切第二句，讓畫面馬上動起來
    _loadingRotatorInterval = setTimeout(nextMessage, 300);
}

function stopLoadingTextRotation() {
    if (_loadingRotatorInterval) {
        clearTimeout(_loadingRotatorInterval);
        _loadingRotatorInterval = null;
    }
}
window.stopLoadingTextRotation = stopLoadingTextRotation;

document.addEventListener('DOMContentLoaded', async () => {
    startLoadingTextRotation();


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
