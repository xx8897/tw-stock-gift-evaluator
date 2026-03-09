/**
 * auth-ui.js — UI 介面控制
 * 直接掛載於 window，確保 HTML onclick 能找到函數
 */

function showError(formId, msg) {
    const el = document.getElementById(formId);
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${msg}</span>`;
    el.classList.remove('hidden');
    el.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; margin-bottom: 1rem;';

    const form = el.closest('.auth-form');
    if (form) {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        hapticFeedback('error');
    }
}

function hideError(formId) {
    const el = document.getElementById(formId);
    if (el) {
        el.classList.add('hidden');
        el.style.cssText = 'display: none !important;';
    }
}

async function setButtonState(btnId, state, text = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const spinnerEl = btn.querySelector('.btn-spinner');
    const successEl = btn.querySelector('.btn-success');

    if (state === 'loading') {
        btn.disabled = true;
        btn.classList.add('disabled-look');
        textEl?.classList.add('hidden');
        spinnerEl?.classList.remove('hidden');
        successEl?.classList.add('hidden');
        if (text && spinnerEl) spinnerEl.querySelector('.loading-text').textContent = text;
    } else if (state === 'success') {
        btn.disabled = false;
        btn.classList.remove('disabled-look');
        btn.classList.add('success-state');
        textEl?.classList.add('hidden');
        spinnerEl?.classList.add('hidden');
        successEl?.classList.remove('hidden');
        hapticFeedback('success');
    } else {
        btn.disabled = false;
        btn.classList.remove('disabled-look', 'success-state');
        textEl?.classList.remove('hidden');
        spinnerEl?.classList.add('hidden');
        successEl?.classList.add('hidden');
        if (text && textEl) textEl.textContent = text;
    }
}

function triggerConfetti(x, y) {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: x / window.innerWidth, y: y / window.innerHeight },
            colors: ['#34d399', '#60a5fa', '#fbbf24']
        });
    }
}

function openLoginModal() {
    document.getElementById('loginModal')?.classList.remove('hidden');
    setTimeout(() => { document.getElementById('authEmail')?.focus(); }, 100);
    switchTab('signin');
}

function closeLoginModal() {
    document.getElementById('loginModal')?.classList.add('hidden');
    setTimeout(() => {
        showAuthForm();
        document.getElementById('authForm')?.reset();
        document.getElementById('otpForm')?.reset();
        document.getElementById('forgotPasswordForm')?.reset();
        hideError('authErrorMsg');
        hideError('otpErrorMsg');
        document.getElementById('passwordStrength')?.classList.add('hidden');
        document.getElementById('passwordHintText')?.classList.add('hidden');
        document.querySelectorAll('.toggle-password-btn').forEach(btn => {
            btn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        });
        document.querySelectorAll('input[type="text"]').forEach(input => {
            if (input.id !== 'authNickname') input.type = 'password';
        });
    }, 300);
}

function switchTab(tab) {
    currentAuthTab = tab;
    hideError('authErrorMsg');
    document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.login-tab[data-tab="${tab}"]`)?.classList.add('active');

    const submitBtn = document.getElementById('authSubmitBtn');
    const tosAgree = document.getElementById('tosAgree');
    setButtonState('authSubmitBtn', 'idle', tab === 'signin' ? '登入' : '註冊');

    if (tab === 'signup') {
        document.querySelectorAll('.signup-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.login-only').forEach(el => el.classList.add('hidden'));
        if (tosAgree) tosAgree.required = true;
    } else {
        document.querySelectorAll('.signup-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.login-only').forEach(el => el.classList.remove('hidden'));
        if (tosAgree) tosAgree.required = false;
    }

    const authPassword = document.getElementById('authPassword');
    if (authPassword) authPassword.type = 'password';
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';

    document.getElementById('passwordStrength')?.classList.add('hidden');
    document.getElementById('passwordHintText')?.classList.add('hidden');

    showAuthForm();
}

function showAuthForm() {
    hideAllForms();
    const f = document.getElementById('authForm');
    if (f) {
        f.classList.remove('hidden');
        restartAnimation(f);
    }
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.visibility = 'visible';
    const altMethods = document.getElementById('altLoginMethods');
    if (altMethods) altMethods.style.display = 'flex';
    const divider = document.getElementById('socialDivider');
    if (divider) divider.style.display = 'flex';
}

function showOtpForm() {
    hideAllForms();
    const f = document.getElementById('otpForm');
    if (f) {
        f.classList.remove('hidden');
        restartAnimation(f);
    }
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.visibility = 'hidden';
    const altMethods = document.getElementById('altLoginMethods');
    if (altMethods) altMethods.style.display = 'none';
    const divider = document.getElementById('socialDivider');
    if (divider) divider.style.display = 'none';

    document.getElementById('otpInput').value = '';
    document.getElementById('otpInput').focus();
    document.getElementById('otpEmailMasked').textContent = `驗證碼已寄至 ${maskEmail(pendingEmail)}`;
    document.title = '(1) 📩 驗證進行中...';
}

function showForgotPasswordForm() {
    hideAllForms();
    const f = document.getElementById('forgotPasswordForm');
    if (f) {
        f.classList.remove('hidden');
        restartAnimation(f);
    }
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.visibility = 'hidden';
    const altMethods = document.getElementById('altLoginMethods');
    if (altMethods) altMethods.style.display = 'none';
    const divider = document.getElementById('socialDivider');
    if (divider) divider.style.display = 'none';
}

function showUpdatePasswordForm() {
    hideAllForms();
    const f = document.getElementById('updatePasswordForm');
    if (f) {
        f.classList.remove('hidden');
        restartAnimation(f);
    }
    const tabs = document.querySelector('.login-tabs');
    if (tabs) tabs.style.visibility = 'hidden';
    const altMethods = document.getElementById('altLoginMethods');
    if (altMethods) altMethods.style.display = 'none';
    const divider = document.getElementById('socialDivider');
    if (divider) divider.style.display = 'none';
}

function hideAllForms() {
    document.getElementById('authForm')?.classList.add('hidden');
    document.getElementById('otpForm')?.classList.add('hidden');
    document.getElementById('forgotPasswordForm')?.classList.add('hidden');
    document.getElementById('updatePasswordForm')?.classList.add('hidden');
    document.getElementById('recoverOtpForm')?.classList.add('hidden');
}

function restartAnimation(element) {
    element.classList.remove('stagger-anim');
    void element.offsetWidth;
    element.classList.add('stagger-anim');
}

function handleAuthChange(user) {
    const wasLoggedIn = !!AppState.currentUser;
    const isNowLoggedIn = !!user;

    AppState.currentUser = user;
    updateAuthUI(user);

    if (window.location.href.includes('#')) {
        window.history.replaceState(null, '', window.location.pathname);
    }

    if (!wasLoggedIn && isNowLoggedIn && typeof window.checkAndMergeData === 'function') {
        if (AppState.isInitialSyncing) return;
        AppState.isInitialSyncing = true;
        window.checkAndMergeData()
            .catch(err => console.error('初次同步失敗:', err))
            .finally(() => {
                AppState.isInitialSyncing = false;
            });
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
            userEmailShort.textContent = user.user_metadata?.nickname || user.email?.split('@')[0] || '使用者';
        }
    } else {
        loginBtn?.classList.remove('hidden');
        userMenu?.classList.add('hidden');
        userMenu?.classList.remove('open');
        syncSaveBtn?.classList.add('hidden');
        syncStatusText?.classList.add('hidden');
    }
}

function triggerSyncProgress() {
    const bar = document.getElementById('topSyncProgressBar');
    if (!bar) return;
    bar.classList.add('active', 'syncing');
    bar.classList.remove('complete', 'error');
    bar.style.width = '32%';
    requestAnimationFrame(() => {
        bar.style.width = '78%';
    });
}

let syncProgressHideTimer = null;
let syncStatusResetTimer = null;

function completeSyncProgress(isError = false) {
    const bar = document.getElementById('topSyncProgressBar');
    if (!bar) return;
    if (syncProgressHideTimer) clearTimeout(syncProgressHideTimer);

    bar.classList.add('active');
    bar.classList.remove('syncing');
    bar.classList.toggle('complete', !isError);
    bar.classList.toggle('error', isError);
    bar.style.width = '100%';

    syncProgressHideTimer = setTimeout(() => {
        bar.classList.remove('active', 'syncing', 'complete', 'error');
        bar.style.width = '0';
    }, isError ? 900 : 550);
}

function setTransientSyncStatus(text, mode = 'syncing', durationMs = 0) {
    const el = document.getElementById('syncStatusText');
    if (!el) return;
    if (syncStatusResetTimer) {
        clearTimeout(syncStatusResetTimer);
        syncStatusResetTimer = null;
    }

    el.textContent = text;
    el.classList.remove('sync-status--syncing', 'sync-status--ok', 'sync-status--error');
    if (mode === 'syncing') el.classList.add('sync-status--syncing');
    if (mode === 'ok') el.classList.add('sync-status--ok');
    if (mode === 'error') el.classList.add('sync-status--error');
    el.classList.remove('hidden');

    if (durationMs > 0) {
        syncStatusResetTimer = setTimeout(() => {
            const fallback = el.dataset.lastSyncText || '';
            el.classList.remove('sync-status--syncing', 'sync-status--ok', 'sync-status--error');
            if (fallback) {
                el.textContent = fallback;
            }
        }, durationMs);
    }
}

function animateTableSyncApplied() {
    const wrapper = document.getElementById('tableWrapper');
    if (!wrapper) return;
    wrapper.classList.remove('table-sync-refresh');
    void wrapper.offsetWidth;
    wrapper.classList.add('table-sync-refresh');
}

window.addEventListener('sync:started', () => {
    triggerSyncProgress();
    setTransientSyncStatus('同步中...', 'syncing');
});

window.addEventListener('sync:applied', () => {
    animateTableSyncApplied();
});

window.addEventListener('sync:finished', () => {
    completeSyncProgress(false);
    setTransientSyncStatus('已同步', 'ok', 1200);
});

window.addEventListener('sync:error', () => {
    completeSyncProgress(true);
    setTransientSyncStatus('同步失敗，請重試', 'error', 2200);
});

// 暴露給全域，確保 HTML onclick 運作
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.triggerConfetti = triggerConfetti;

console.log('[Auth UI]: 初始化完成');
