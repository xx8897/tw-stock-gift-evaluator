// --- 載入訊息輪播器 ---
const LOADING_MESSAGES = [
    '正在連線至 Supabase 高速資料庫...',
    '同步 FinMind 每日台股最新行情...',
    '執行零股性價比 (CP值) 精算模型...',
    '比對 800+ 支股票五年紀念品歷史...',
    '套用個人雲端持股紀錄與收藏清單...',
    '即將完成，正在準備渲染資料表格...',
];

const ROTATION_T = 600; // 基礎時間單位 t (ms)，最後一句停留 1.5t = 900ms

let _loadingRotatorInterval = null;

function startLoadingTextRotation() {
    const span = document.getElementById('loadingMessageSpan');
    if (!span) return;

    let idx = 0;

    function nextMessage() {
        if (!_loadingRotatorInterval) return;

        // 執行淡出動畫，準備切換
        span.classList.add('fade-out');
        setTimeout(() => {
            idx += 1;
            span.textContent = LOADING_MESSAGES[idx];
            span.classList.remove('fade-out');
            span.classList.add('fade-in');

            setTimeout(() => {
                span.classList.remove('fade-in');

                const isLast = idx === LOADING_MESSAGES.length - 1;
                if (isLast) {
                    // 最後一句：停留 1.5t 後靜止（不再輪播）
                    _loadingRotatorInterval = setTimeout(() => {
                        _loadingRotatorInterval = null;
                    }, ROTATION_T * 1.5);
                } else {
                    // 其餘句子：停留 t 後切換下一句
                    _loadingRotatorInterval = setTimeout(nextMessage, ROTATION_T);
                }
            }, 400); // fade-in 動畫時間
        }, 260); // fade-out 動畫時間
    }

    // 第一句：初始只停留 300ms（馬上開始輪播，讓畫面有動感）
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
