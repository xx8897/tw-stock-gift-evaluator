/**
 * auth.js — 身份驗證進入點
 * 負責協調 State, UI, API 模組
 */

function initAuth() {
    if (!window.supabaseClient) {
        console.error('Supabase Client 未就緒');
        return;
    }

    // 監聽登入狀態改變
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('[Auth Event]:', event);
        const user = session?.user || null;
        handleAuthChange(user);
    });

    // 這裡不直接 bindEvents，因為 HTML 可能是異步載入的
    // bindAuthEvents 會由 components-loader.js 在載入完成後觸發
}

function bindAuthEvents() {
    console.log('[Auth]: 開始綁定按鈕事件');

    // 登入區切換
    document.querySelectorAll('.login-tab').forEach(btn => {
        btn.onclick = () => switchTab(btn.dataset.tab);
    });

    // 關閉 Modal
    document.getElementById('closeLoginModalBtn').onclick = closeLoginModal;

    // 表單提交
    document.getElementById('authForm').onsubmit = handleAuthSubmit;
    document.getElementById('otpSubmitBtn').onclick = handleOtpSubmit;
    document.getElementById('resendOtpBtn').onclick = resendOtp;

    // 忘記密碼
    document.getElementById('forgotPasswordLink').onclick = (e) => { e.preventDefault(); showForgotPasswordForm(); };
    document.getElementById('forgotPasswordForm').onsubmit = handleForgotPasswordSubmit;
    document.getElementById('backToLoginFromForgotBtn').onclick = showAuthForm;

    // 重設驗證
    document.getElementById('recoverOtpSubmitBtn').onclick = handleRecoverOtpSubmit;
    document.getElementById('resendRecoverOtpBtn').onclick = resendRecoverOtp;
    document.getElementById('backToForgotFromRecoverBtn').onclick = showForgotPasswordForm;

    // 更新密碼
    document.getElementById('updatePasswordForm').onsubmit = handleUpdatePasswordSubmit;

    // 訪客登入
    document.getElementById('guestLoginBtn').onclick = () => closeLoginModal();

    // 密碼可見性切換
    const toggleBtn = document.getElementById('togglePasswordBtn');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            const input = document.getElementById('authPassword');
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
            } else {
                input.type = 'password';
                toggleBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
            }
        };
    }

    // 使用者選單切換
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    if (userMenuBtn && userMenu) {
        userMenuBtn.onclick = (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('open');
        };
    }

    // 點擊外部關閉選單
    document.addEventListener('click', (e) => {
        if (userMenu && !userMenu.contains(e.target)) {
            userMenu.classList.remove('open');
        }
    });

    // 更新 UI 狀態
    if (AppState.currentUser) updateAuthUI(AppState.currentUser);
}

// 暴露給全域
window.initAuth = initAuth;
window.bindAuthEvents = bindAuthEvents;

console.log('[Auth Main]: 初始化完成');
