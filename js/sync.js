/**
 * sync.js — 雲端同步模組
 * 功能：
 *  1. syncToCloud()       — 將 AppState.purchasedStocks 寫入 Supabase
 *  2. loadFromCloud()     — 從 Supabase 讀取並覆寫 AppState.purchasedStocks
 *  3. scheduleAutoSync()  — 操作後 15 分鐘 Debounce 自動同步
 *  4. cancelAutoSync()    — 手動儲存時取消排程
 *  5. updateSyncStatus()  — 更新工具列的「同步於 XX:XX」文字
 */

const SYNC_DELAY_MS = 15 * 60 * 1000; // 15 分鐘
const SYNC_LS_KEY = 'last_sync_time';

let autoSyncTimer = null;

// ── 同步至雲端 ───────────────────────────────────────────────
async function syncToCloud() {
    const client = window.supabaseClient;
    const user = AppState.currentUser;
    if (!client || !user) return;

    const syncBtn = document.getElementById('syncSaveBtn');
    if (syncBtn) {
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
        if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 手動儲存';
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
            // 若表格已渲染，重新渲染以反映雲端資料
            if (AppState.globalData.length > 0) renderTable();
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
        syncToCloud();
    }, SYNC_DELAY_MS);
}

// ── 取消排程 ─────────────────────────────────────────────────
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
    el.textContent = `同步於 ${str}`;
    el.style.display = '';
}
