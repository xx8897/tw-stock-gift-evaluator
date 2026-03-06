/**
 * auth.js — Supabase Google OAuth 認證模組
 * 功能：
 *  1. 監聽登入/登出狀態，更新 AppState.currentUser
 *  2. Google 一鍵登入
 *  3. 登出
 *  4. 更新 Toolbar UI (切換 loginBtn / userMenu / syncSaveBtn / syncStatusText)
 */

// ── 監聽登入狀態 ──────────────────────────────────────────────
async function initAuth() {
    if (!window.supabaseClient) return;

    // 取得目前 session（頁面刷新後保持登入狀態）
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    handleAuthChange(session?.user ?? null);

    // 監聽後續的登入/登出事件
    window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        handleAuthChange(session?.user ?? null);
    });

    // 下拉選單：點擊頭像按鈕切換展開/收起
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    userMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu?.classList.toggle('open');
    });

    // 點擊其他地方收起下拉選單
    document.addEventListener('click', () => {
        userMenu?.classList.remove('open');
    });
}

// ── 根據登入狀態更新介面 ───────────────────────────────────────
function handleAuthChange(user) {
    const wasLoggedIn = !!AppState.currentUser;
    const isNowLoggedIn = !!user;

    AppState.currentUser = user;
    updateAuthUI(user);

    // 清除 OAuth 回呼後殘留在網址列的 # fragment（包含空的 # 或有值的 #access_token=...）
    if (window.location.href.includes('#')) {
        window.history.replaceState(null, '', window.location.pathname);
    }

    // 剛登入成功（從未登入 → 已登入）：從雲端載入資料
    if (!wasLoggedIn && isNowLoggedIn) {
        if (typeof loadFromCloud === 'function') loadFromCloud();
    }
}

// ── Google 登入 ───────────────────────────────────────────────
async function signInWithGoogle() {
    if (!window.supabaseClient) {
        console.error('Supabase Client 未初始化');
        return;
    }
    // 使用 origin + pathname，避免 hash fragment 污染導致 ## 雙井號問題
    const cleanRedirectUrl = window.location.origin + window.location.pathname;
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: cleanRedirectUrl
        }
    });
    if (error) console.error('登入失敗:', error.message);
}

// ── 登出 ─────────────────────────────────────────────────────
async function signOut() {
    if (!window.supabaseClient) return;
    if (typeof cancelAutoSync === 'function') cancelAutoSync();
    const { error } = await window.supabaseClient.auth.signOut();
    if (error) console.error('登出失敗:', error.message);
}

// ── 更新 Toolbar UI ──────────────────────────────────────────
function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userEmailShort = document.getElementById('userEmailShort');
    const syncSaveBtn = document.getElementById('syncSaveBtn');
    const syncStatusText = document.getElementById('syncStatusText');

    if (user) {
        // 已登入：隱藏「雲端同步」按鈕，顯示使用者名稱選單、手動儲存、狀態文字
        loginBtn?.classList.add('hidden');
        userMenu?.classList.remove('hidden');
        syncSaveBtn?.classList.remove('hidden');
        syncStatusText?.classList.remove('hidden');
        if (userEmailShort) {
            userEmailShort.textContent = user.email?.split('@')[0] || '使用者';
        }
        // 顯示上次同步時間（從 localStorage 讀取）
        if (typeof updateSyncStatus === 'function') {
            const saved = localStorage.getItem('last_sync_time');
            if (saved) updateSyncStatus(new Date(saved));
        }
    } else {
        // 未登入：顯示「雲端同步」按鈕，隱藏使用者選單與同步元素
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
        userMenu?.classList.remove('open');
        syncSaveBtn?.classList.add('hidden');
        syncStatusText?.classList.add('hidden');
    }
}
