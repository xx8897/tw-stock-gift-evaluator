/**
 * auth.js — Supabase Auth 模組 (Email/OTP + Google)
 */

let currentAuthTab = 'signin';
let pendingEmail = '';

function translateAuthError(errMsg) {
    const errorMap = {
        'Invalid login credentials': '帳號或密碼錯誤',
        'Email not confirmed': '信箱尚未驗證',
        'Password should be at least 6 characters.': '密碼至少需要 6 個字元',
        'User already registered': '此信箱已被註冊',
        'Token has expired or is invalid': '驗證碼錯誤或已過期',
        'You must provide either an email or phone number and a password': '請輸入信箱與密碼'
    };
    for (const [key, value] of Object.entries(errorMap)) {
        if (errMsg.includes(key)) return value;
    }
    return '發生未知錯誤，請稍後再試 (' + errMsg + ')';
}

function showError(formId, msg) {
    const el = document.getElementById(formId);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideError(formId) {
    const el = document.getElementById(formId);
    if (el) el.classList.add('hidden');
}

// ── 監聽登入狀態 ──────────────────────────────────────────────
async function initAuth() {
    if (!window.supabaseClient) return;

    // 取得目前 session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    handleAuthChange(session?.user ?? null);

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            closeLoginModal();
        }
        handleAuthChange(session?.user ?? null);
    });

    // 綁定 DOM 事件
    bindModalEvents();
    bindUserMenuEvents();
}

function bindModalEvents() {
    const loginModal = document.getElementById('loginModal');
    const closeBtn = document.getElementById('closeLoginModalBtn');
    const guestBtn = document.getElementById('guestLoginBtn');

    // 關閉 Modal
    closeBtn?.addEventListener('click', closeLoginModal);
    guestBtn?.addEventListener('click', closeLoginModal);
    loginModal?.addEventListener('click', (e) => {
        if (e.target === loginModal) closeLoginModal();
    });

    // 頁籤切換
    document.querySelectorAll('.login-tab').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // 表單送出
    document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
    document.getElementById('otpSubmitBtn')?.addEventListener('click', handleOtpSubmit);
    document.getElementById('backToSignupBtn')?.addEventListener('click', showAuthForm);

    // 眼睛按鈕
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const passInput = document.getElementById('authPassword');
    toggleBtn?.addEventListener('click', () => {
        if (passInput.type === 'password') {
            passInput.type = 'text';
            toggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
        } else {
            passInput.type = 'password';
            toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        }
    });

    // 限制 OTP 只能輸入數字
    const otpInput = document.getElementById('otpInput');
    otpInput?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
    });
}

function bindUserMenuEvents() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    userMenuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu?.classList.toggle('open');
    });
    document.addEventListener('click', () => userMenu?.classList.remove('open'));
}

// ── Modal UI 控制 ──────────────────────────────────────────────
function openLoginModal() {
    document.getElementById('loginModal')?.classList.remove('hidden');
    switchTab('signin');
}

function closeLoginModal() {
    document.getElementById('loginModal')?.classList.add('hidden');
    showAuthForm(); // Reset state
    document.getElementById('authForm')?.reset();
    hideError('authErrorMsg');
}

function switchTab(tab) {
    currentAuthTab = tab;

    // 更新頁籤外觀
    document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.login-tab[data-tab="${tab}"]`)?.classList.add('active');

    // 更新按鈕文字
    const submitBtn = document.getElementById('authSubmitBtn');
    if (submitBtn) submitBtn.textContent = tab === 'signin' ? '登入' : '註冊';

    // 清空錯誤和表單
    hideError('authErrorMsg');
    showAuthForm();
}

function showOtpForm() {
    document.getElementById('authForm')?.classList.add('hidden');
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.visibility = 'hidden'; // Hide tabs but keep layout space

    document.getElementById('otpForm')?.classList.remove('hidden');
    document.getElementById('otpInput').value = '';
    hideError('otpErrorMsg');
}

function showAuthForm() {
    document.getElementById('otpForm')?.classList.add('hidden');
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.visibility = 'visible';

    document.getElementById('authForm')?.classList.remove('hidden');
}

// ── 核心登入/註冊邏輯 ──────────────────────────────────────────
async function handleAuthSubmit(e) {
    e.preventDefault();
    hideError('authErrorMsg');

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');

    if (!email || !password) return;

    // UI loading state
    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 處理中...';
    btn.disabled = true;

    try {
        if (currentAuthTab === 'signin') {
            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await window.supabaseClient.auth.signUp({ email, password });
            if (error) throw error;

            // 註冊成功，切換到 OTP 畫面
            pendingEmail = email;
            showOtpForm();
        }
    } catch (err) {
        console.error('Auth Error:', err);
        showError('authErrorMsg', translateAuthError(err.message));
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

async function handleOtpSubmit() {
    hideError('otpErrorMsg');
    const token = document.getElementById('otpInput').value.trim();
    const btn = document.getElementById('otpSubmitBtn');

    if (token.length !== 6) {
        showError('otpErrorMsg', '請輸入完整的 6 位數驗證碼');
        return;
    }

    const originalText = btn.textContent;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 驗證中...';
    btn.disabled = true;

    try {
        const { error } = await window.supabaseClient.auth.verifyOtp({
            email: pendingEmail,
            token: token,
            type: 'signup'
        });
        if (error) throw error;
        // 驗證成功後 onAuthStateChange 會捕捉到 SIGNED_IN 事件並關閉 modal
    } catch (err) {
        console.error('OTP Error:', err);
        showError('otpErrorMsg', translateAuthError(err.message));
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// ── Google 登入 ───────────────────────────────────────────────
async function signInWithGoogle() {
    if (!window.supabaseClient) return;
    const cleanRedirectUrl = window.location.origin + window.location.pathname;
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: cleanRedirectUrl }
    });
    if (error) console.error('登入失敗:', error.message);
}

// ── 登出 ─────────────────────────────────────────────────────
async function signOut() {
    if (!window.supabaseClient) return;
    if (typeof cancelAutoSync === 'function') cancelAutoSync();

    // Clear user menu state before signOut completes to avoid visual bugs
    document.getElementById('userMenu')?.classList.remove('open');

    const { error } = await window.supabaseClient.auth.signOut();
    if (error) console.error('登出失敗:', error.message);
}

// ── 根據登入狀態更新介面 ───────────────────────────────────────
function handleAuthChange(user) {
    const wasLoggedIn = !!AppState.currentUser;
    const isNowLoggedIn = !!user;

    AppState.currentUser = user;
    updateAuthUI(user);

    if (window.location.href.includes('#')) {
        window.history.replaceState(null, '', window.location.pathname);
    }

    if (!wasLoggedIn && isNowLoggedIn) {
        if (typeof loadFromCloud === 'function') loadFromCloud();
    }
}

function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userEmailShort = document.getElementById('userEmailShort');
    const syncSaveBtn = document.getElementById('syncSaveBtn');
    const syncStatusText = document.getElementById('syncStatusText');

    if (user) {
        loginBtn?.classList.add('hidden');
        userMenu?.classList.remove('hidden');
        syncSaveBtn?.classList.remove('hidden');
        syncStatusText?.classList.remove('hidden');
        if (userEmailShort) {
            userEmailShort.textContent = user.email?.split('@')[0] || '使用者';
        }
        if (typeof updateSyncStatus === 'function') {
            const saved = localStorage.getItem('last_sync_time');
            if (saved) updateSyncStatus(new Date(saved));
        }
    } else {
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
        userMenu?.classList.remove('open');
        syncSaveBtn?.classList.add('hidden');
        syncStatusText?.classList.add('hidden');
    }
}

window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
