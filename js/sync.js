/**
 * sync.js — 雲端同步模組
 * 功能：
 *  1. checkAndMergeData() - 處理訪客與登入後雲端資料的合併策略
 *  2. syncToCloud()       - 將 AppState.purchasedStocks 寫入 Supabase
 *  3. loadFromCloud()     - 從 Supabase 讀取並覆寫 AppState.purchasedStocks
 *  4. scheduleAutoSync()  - 操作後 15 分鐘 Debounce 自動同步
 *  5. updateSyncStatus()  - 更新工具列的同步狀態
 */

const SYNC_DELAY_MS = 15 * 60 * 1000; // 15 分鐘
const SYNC_LS_KEY = 'last_sync_time';

let autoSyncTimer = null;

// ── 資料合併策略 (Guest -> Cloud) ──────────────────────────────────
async function checkAndMergeData() {
    return new Promise(async (resolve) => {
        const client = window.supabaseClient;
        const user = AppState.currentUser;
        if (!client || !user) {
            resolve(false);
            return;
        }

        const localStocks = [...AppState.purchasedStocks];

        try {
            // Fetch cloud data
            const { data, error } = await client
                .from('user_stocks')
                .select('stock_id')
                .eq('user_id', user.id);
            if (error) throw error;

            const cloudStocks = data ? data.map(r => r.stock_id) : [];

            // Case 1: 雲端為空，直接同步本地 (即使本地也為空，同步也不影響)
            if (cloudStocks.length === 0) {
                if (localStocks.length > 0) await syncToCloud(false); // background sync
                resolve(false);
                return;
            }

            // Case 2: 雲端有資料，本地為空 -> 直接載入雲端
            if (localStocks.length === 0) {
                await loadFromCloud();
                resolve(false);
                return;
            }

            // Case 3: 雙方都有資料 -> 彈出合併詢問視窗
            const conflictModal = document.getElementById('syncConflictModal');
            conflictModal.classList.remove('hidden');

            // Handle Merge (Union)
            const btnMerge = document.getElementById('btnMergeData');
            const handlerMerge = async () => {
                cleanup();
                const mergedSet = new Set([...localStocks, ...cloudStocks]);
                AppState.purchasedStocks = mergedSet;
                localStorage.setItem('purchased_stocks', JSON.stringify([...mergedSet]));
                if (typeof window.processDataAndRender === 'function') window.processDataAndRender();
                await syncToCloud(); // Save merged result to cloud
                resolve(true);
            };

            // Handle Overwrite (Cloud wins)
            const btnOverwrite = document.getElementById('btnOverwriteCloud');
            const handlerOverwrite = async () => {
                cleanup();
                AppState.purchasedStocks = new Set(cloudStocks);
                localStorage.setItem('purchased_stocks', JSON.stringify([...cloudStocks]));
                if (typeof window.processDataAndRender === 'function') window.processDataAndRender();
                updateSyncStatus(new Date()); // Already in sync with cloud
                resolve(true);
            };

            const cleanup = () => {
                conflictModal.classList.add('hidden');
                btnMerge.removeEventListener('click', handlerMerge);
                btnOverwrite.removeEventListener('click', handlerOverwrite);
            };

            btnMerge.addEventListener('click', handlerMerge);
            btnOverwrite.addEventListener('click', handlerOverwrite);

        } catch (err) {
            console.error('Check and Merge Error:', err);
            resolve(false); // Proceed without blocking if error occurs
        }
    });
}


// ── 同步至雲端 ───────────────────────────────────────────────
async function syncToCloud(showLoading = true) {
    const client = window.supabaseClient;
    const user = AppState.currentUser;
    if (!client || !user) return;

    const syncBtn = document.getElementById('syncSaveBtn');
    const originalHtml = syncBtn ? syncBtn.innerHTML : '';
    if (syncBtn && showLoading) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 同步中...';
    }

    try {
        // 先刪除該用戶所有舊資料，再批次寫入新資料
        const { error: delErr } = await client
            .from('user_stocks')
            .delete()
            .eq('user_id', user.id);
        if (delErr) throw delErr;

        const stocks = [...AppState.purchasedStocks];
        if (stocks.length > 0) {
            const rows = stocks.map(stockId => ({ user_id: user.id, stock_id: stockId }));
            const { error: insErr } = await client.from('user_stocks').insert(rows);
            if (insErr) throw insErr;
        }

        const now = new Date();
        localStorage.setItem(SYNC_LS_KEY, now.toISOString());
        updateSyncStatus(now);
        cancelAutoSync();

    } catch (err) {
        console.error('同步失敗:', err.message);
    } finally {
        if (syncBtn && showLoading) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = originalHtml;
        }
    }
}

// ── 從雲端載入 ───────────────────────────────────────────────
async function loadFromCloud() {
    const client = window.supabaseClient;
    const user = AppState.currentUser;
    if (!client || !user) return;

    try {
        const { data, error } = await client
            .from('user_stocks')
            .select('stock_id')
            .eq('user_id', user.id);
        if (error) throw error;

        if (data && data.length > 0) {
            AppState.purchasedStocks = new Set(data.map(r => r.stock_id));
            localStorage.setItem('purchased_stocks', JSON.stringify([...AppState.purchasedStocks]));
            if (AppState.globalData.length > 0 && typeof window.processDataAndRender === 'function') {
                window.processDataAndRender();
            }
        }

        // 顯示上次同步時間
        const savedTime = localStorage.getItem(SYNC_LS_KEY);
        if (savedTime) updateSyncStatus(new Date(savedTime));

    } catch (err) {
        console.error('雲端載入失敗:', err.message);
    }
}

// ── 排程自動同步 (Debounce) ───────────────────────────────────
function scheduleAutoSync() {
    if (!AppState.currentUser) return;
    cancelAutoSync();
    autoSyncTimer = setTimeout(() => {
        syncToCloud(false); // Background sync
    }, SYNC_DELAY_MS);
}

function cancelAutoSync() {
    if (autoSyncTimer) {
        clearTimeout(autoSyncTimer);
        autoSyncTimer = null;
    }
}

// ── 更新同步狀態文字 ─────────────────────────────────────────
function updateSyncStatus(dateObj) {
    const el = document.getElementById('syncStatusText');
    if (!el || !dateObj) return;
    const pad = n => String(n).padStart(2, '0');
    const d = dateObj;
    const str = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    // Smooth transition
    el.style.opacity = 0;
    setTimeout(() => {
        el.textContent = `同步於 ${str}`;
        el.classList.remove('hidden');
        el.style.opacity = 1;
    }, 200);
}

// Exported for testing/global access
window.checkAndMergeData = checkAndMergeData;
