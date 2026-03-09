/**
 * auth.js — Supabase Auth 模組 (Email/OTP + Google)
 * 包含完整 UI/UX 升級 (人工延遲, 震動, 彩帶, 錯誤抖動, 防機器人, OTP冷卻等)
 */

let currentAuthTab = 'signin';
let pendingEmail = '';
let recoverEmail = '';
let otpCooldownTimer = null;
let recoverOtpCooldownTimer = null;
let isSubmitting = false;

// ── 輔助工具 ──────────────────────────────────────────────

// 人工延遲
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 遮罩 Email
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [name, domain] = email.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.substring(0, 2)}***@${domain}`;
}

// 觸覺回饋
function hapticFeedback(type = 'medium') {
    if (navigator.vibrate) {
        if (type === 'error') navigator.vibrate([50, 50, 50]);
        else if (type === 'success') navigator.vibrate([100]);
        else navigator.vibrate([30]);
    }
}

// 錯誤訊息轉換
function translateAuthError(errMsg) {
    const errorMap = {
        'Invalid login credentials': '帳號或密碼錯誤',
        'Email not confirmed': '信箱尚未驗證',
        'Password should be at least 6 characters': '密碼至少需要 6 個字元',
        'User already registered': '此信箱已註冊，請直接登入或以 Google 繼續',
        'Token has expired or is invalid': '驗證碼錯誤或已過期',
        'You must provide either an email or phone number and a password': '請輸入信箱與密碼',
        'rate limit': '請求過於頻繁，請稍後再試'
    };
    for (const [key, value] of Object.entries(errorMap)) {
        if (errMsg.includes(key)) return value;
    }
    return '發生未知錯誤，請稍後再試';
}

function showError(formId, msg) {
    const el = document.getElementById(formId);
    if (!el) return;
    el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${msg}</span>`;
    el.classList.remove('hidden');
    el.style.cssText = 'display: flex !important; opacity: 1 !important; visibility: visible !important; margin-bottom: 1rem;';

    // shake animation
    const form = el.closest('.auth-form');
    if (form) {
        form.classList.remove('shake');
        void form.offsetWidth; // trigger reflow
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

// 按鈕狀態切換
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

// 彩帶特效
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


// ── 監聽登入狀態 ──────────────────────────────────────────────
async function initAuth() {
    if (!window.supabaseClient) return;

    // 取得目前 session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    handleAuthChange(session?.user ?? null);

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            closeLoginModal();
            triggerSyncProgress(); // 動態進度條
        } else if (event === 'PASSWORD_RECOVERY') {
            // 從重置信件回來
            openLoginModal();
            showUpdatePasswordForm();
        }
        handleAuthChange(session?.user ?? null);
    });

    bindModalEvents();
    bindUserMenuEvents();
    bindInputEvents();
}

// ── DOM 事件 ──────────────────────────────────────────────
function bindModalEvents() {
    const loginModal = document.getElementById('loginModal');

    document.getElementById('closeLoginModalBtn')?.addEventListener('click', closeLoginModal);
    document.getElementById('guestLoginBtn')?.addEventListener('click', closeLoginModal);

    // 頁籤切換
    document.querySelectorAll('.login-tab').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    // 表單送出
    document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
    document.getElementById('otpForm')?.addEventListener('submit', (e) => { e.preventDefault(); handleOtpSubmit(); });
    document.getElementById('otpSubmitBtn')?.addEventListener('click', handleOtpSubmit);

    // 返回按鈕
    document.getElementById('backToSignupBtn')?.addEventListener('click', () => {
        switchTab('signup');
        // Reset tab document title
        if (document.title.includes('📩')) document.title = '台股股東會紀念品攻略 🎁';
    });

    // OTP 重寄
    document.getElementById('resendOtpBtn')?.addEventListener('click', resendOtp);

    // 忘記密碼
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordForm();
    });
    document.getElementById('backToLoginFromForgotBtn')?.addEventListener('click', () => switchTab('signin'));
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', handleForgotPasswordSubmit);

    // 回復 OTP (重設密碼)
    document.getElementById('recoverOtpForm')?.addEventListener('submit', (e) => { e.preventDefault(); handleRecoverOtpSubmit(); });
    document.getElementById('recoverOtpSubmitBtn')?.addEventListener('click', handleRecoverOtpSubmit);
    document.getElementById('resendRecoverOtpBtn')?.addEventListener('click', resendRecoverOtp);
    document.getElementById('backToForgotFromRecoverBtn')?.addEventListener('click', () => {
        document.getElementById('recoverOtpForm').classList.add('hidden');
        document.getElementById('forgotPasswordForm').classList.remove('hidden');
    });

    // 重設密碼
    document.getElementById('updatePasswordForm')?.addEventListener('submit', handleUpdatePasswordSubmit);

    // 眼睛按鈕 (長按偷看)
    const togglePasswordMode = (wrapper, show) => {
        const passInput = wrapper.querySelector('input');
        const iconBtn = wrapper.querySelector('.toggle-password-btn');
        if (show) {
            passInput.type = 'text';
            iconBtn.innerHTML = '<i class="fa-regular fa-eye"></i>';
        } else {
            passInput.type = 'password';
            iconBtn.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        }
    };

    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        const wrapper = btn.closest('.password-input-wrapper');
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); togglePasswordMode(wrapper, true); });
        btn.addEventListener('pointerup', (e) => { e.preventDefault(); togglePasswordMode(wrapper, false); });
        btn.addEventListener('pointerleave', (e) => { e.preventDefault(); togglePasswordMode(wrapper, false); });
    });

    // 檢查防手滑 (BeforeUnload)
    window.addEventListener('beforeunload', (e) => {
        const emailVal = document.getElementById('authEmail')?.value;
        const passVal = document.getElementById('authPassword')?.value;
        if (!document.getElementById('loginModal').classList.contains('hidden') && (emailVal || passVal) && !isSubmitting) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function bindInputEvents() {
    // Email typo check
    const authEmail = document.getElementById('authEmail');

    const checkEmailTypo = (e) => {
        const val = e.target.value.trim().toLowerCase();
        const existing = authEmail.parentElement.querySelector('.email-suggestion');
        if (existing) existing.remove();

        if (!val.includes('@')) return;

        const parts = val.split('@');
        const domain = parts[1];
        if (!domain) return;

        const commonDomains = {
            'gamil.com': 'gmail.com',
            'gmai.com': 'gmail.com',
            'gmail.com.tw': 'gmail.com',
            'hotmail.com.tw': 'hotmail.com',
            'yaho.com': 'yahoo.com',
            'yahoo.com.te': 'yahoo.com.tw'
        };

        if (commonDomains[domain]) {
            const suggestion = `${parts[0]}@${commonDomains[domain]}`;
            const hint = document.createElement('div');
            hint.className = 'email-suggestion';
            hint.innerHTML = `<i class="fa-solid fa-lightbulb"></i> 您是指 <strong>${suggestion}</strong> 嗎？`;
            // prevent default on mousedown to let click fire before blur hides it
            hint.onmousedown = (e) => e.preventDefault();
            hint.onclick = () => {
                authEmail.value = suggestion;
                hint.remove();
            };
            authEmail.parentElement.appendChild(hint);
        }
    };

    authEmail?.addEventListener('input', checkEmailTypo);
    authEmail?.addEventListener('blur', checkEmailTypo);

    // Caps lock warning
    const passInput = document.getElementById('authPassword');
    const capsWarning = document.getElementById('capsLockWarning');
    passInput?.addEventListener('keyup', (e) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) capsWarning.classList.remove('hidden');
        else capsWarning.classList.add('hidden');
    });

    // Password strength
    const strengthBar = document.querySelector('.strength-bar');
    const pStrength = document.getElementById('passwordStrength');
    const pHint = document.getElementById('passwordHintText');
    passInput?.addEventListener('input', (e) => {
        if (currentAuthTab !== 'signup') {
            pStrength.classList.add('hidden');
            pHint.classList.add('hidden');
            return;
        }

        const val = e.target.value;
        if (val.length > 0) pStrength.classList.remove('hidden');
        else pStrength.classList.add('hidden');

        pHint.classList.remove('hidden');

        if (val.length < 6) {
            strengthBar.className = 'strength-bar weak';
            pHint.textContent = '密碼長度至少需 6 碼';
            pHint.className = 'password-hint-text';
        } else if (val.length >= 6 && !/[A-Z]/.test(val) && !/[0-9]/.test(val)) {
            strengthBar.className = 'strength-bar fair';
            pHint.textContent = '中等。建議包含數字和英文大小寫。';
            pHint.className = 'password-hint-text valid';
        } else {
            strengthBar.className = 'strength-bar strong';
            pHint.textContent = '密碼強度高！';
            pHint.className = 'password-hint-text valid';
        }
    });

    // Nickname counter
    const nickInput = document.getElementById('authNickname');
    const nickCounter = document.getElementById('nicknameCounter');
    nickInput?.addEventListener('input', (e) => {
        nickCounter.textContent = `${e.target.value.length}/20`;
    });

    // OTP Auto Submit
    const otpInput = document.getElementById('otpInput');
    otpInput?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length === 6 && !isSubmitting) {
            handleOtpSubmit();
        }
    });

    const recoverOtpInput = document.getElementById('recoverOtpInput');
    recoverOtpInput?.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length === 6 && !isSubmitting) {
            handleRecoverOtpSubmit();
        }
    });

    // Adaptive Button State
    const authForm = document.getElementById('authForm');
    const authBtn = document.getElementById('authSubmitBtn');
    authForm?.addEventListener('input', () => {
        if (!authForm) return;
        const e = document.getElementById('authEmail')?.value.trim();
        const p = document.getElementById('authPassword')?.value.trim();
        // 如果是註冊模式，可能還要檢查 TOS
        const tos = document.getElementById('tosAgree')?.checked;
        const isValid = currentAuthTab === 'signin' ? (e && p) : (e && p && tos);

        if (isValid) {
            authBtn.style.opacity = '1';
            authBtn.style.filter = 'grayscale(0)';
        } else {
            authBtn.style.opacity = '0.6';
            authBtn.style.filter = 'grayscale(1)';
        }
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
    // Default focus
    setTimeout(() => { document.getElementById('authEmail')?.focus(); }, 100);
    switchTab('signin');
}

function closeLoginModal() {
    document.getElementById('loginModal')?.classList.add('hidden');
    // Reset state
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
    }, 300); // Wait for transition
}

function switchTab(tab) {
    currentAuthTab = tab;

    // 清空錯誤
    hideError('authErrorMsg');

    // 更新頁籤 UI
    document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.login-tab[data-tab="${tab}"]`)?.classList.add('active');

    const submitBtn = document.getElementById('authSubmitBtn');
    const tosAgree = document.getElementById('tosAgree');
    if (submitBtn) submitBtn.querySelector('.btn-text').textContent = tab === 'signin' ? '登入' : '註冊';

    if (tab === 'signup') {
        document.querySelectorAll('.signup-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.login-only').forEach(el => el.classList.add('hidden'));
        if (tosAgree) tosAgree.required = true;
    } else {
        document.querySelectorAll('.signup-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.login-only').forEach(el => el.classList.remove('hidden'));
        if (tosAgree) tosAgree.required = false;
    }

    // 重設密碼檢視按鈕
    document.getElementById('authPassword').type = 'password';
    document.getElementById('togglePasswordBtn').innerHTML = '<i class="fa-regular fa-eye-slash"></i>';

    // 強制隱藏密碼強度提示
    document.getElementById('passwordStrength')?.classList.add('hidden');
    document.getElementById('passwordHintText')?.classList.add('hidden');

    showAuthForm();
}

// 畫面切換 (含進場動畫)
function showAuthForm() {
    hideAllForms();
    const f = document.getElementById('authForm');
    f.classList.remove('hidden');
    restartAnimation(f);
    document.querySelector('.login-tabs').style.visibility = 'visible';
    document.getElementById('altLoginMethods').style.display = 'flex';
    document.getElementById('socialDivider').style.display = 'flex';
}

function showOtpForm() {
    hideAllForms();
    const f = document.getElementById('otpForm');
    f.classList.remove('hidden');
    restartAnimation(f);
    document.querySelector('.login-tabs').style.visibility = 'hidden';
    document.getElementById('altLoginMethods').style.display = 'none';
    document.getElementById('socialDivider').style.display = 'none';
    document.getElementById('otpInput').value = '';
    document.getElementById('otpInput').focus();

    // Mask email
    document.getElementById('otpEmailMasked').textContent = `驗證碼已寄至 ${maskEmail(pendingEmail)}`;

    // 修改分頁標題
    document.title = '(1) 📩 驗證進行中...';
}

function showForgotPasswordForm() {
    hideAllForms();
    const f = document.getElementById('forgotPasswordForm');
    f.classList.remove('hidden');
    restartAnimation(f);
    document.querySelector('.login-tabs').style.visibility = 'hidden';
    document.getElementById('altLoginMethods').style.display = 'none';
    document.getElementById('socialDivider').style.display = 'none';
}

function showUpdatePasswordForm() {
    // 透過 URL 參數進入時觸發
    hideAllForms();
    const f = document.getElementById('updatePasswordForm');
    f.classList.remove('hidden');
    restartAnimation(f);
    document.querySelector('.login-tabs').style.visibility = 'hidden';
    document.getElementById('altLoginMethods').style.display = 'none';
    document.getElementById('socialDivider').style.display = 'none';
}

function hideAllForms() {
    document.getElementById('authForm')?.classList.add('hidden');
    document.getElementById('otpForm')?.classList.add('hidden');
    document.getElementById('forgotPasswordForm')?.classList.add('hidden');
    document.getElementById('updatePasswordForm')?.classList.add('hidden');
}

function restartAnimation(element) {
    element.classList.remove('stagger-anim');
    void element.offsetWidth;
    element.classList.add('stagger-anim');
}

// ── 核心登入/註冊邏輯 ──────────────────────────────────────────
async function handleAuthSubmit(e) {
    e.preventDefault();
    if (!navigator.onLine) {
        showError('authErrorMsg', '請檢查您的網路連線');
        return;
    }

    // Honeypot 防禦
    if (document.getElementById('website_b_firstname')?.value !== '') {
        showError('authErrorMsg', '系統判定為異常操作 (機器人防禦觸發)');
        return;
    }

    hideError('authErrorMsg');
    isSubmitting = true;

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const nickname = document.getElementById('authNickname')?.value.trim();

    if (!email || !password) {
        isSubmitting = false;
        return;
    }

    // 模擬重量級處理 (要求 2.5 ~ 3秒)
    setButtonState('authSubmitBtn', 'loading', '驗證資訊中...');

    try {
        // First delay stage
        await delay(1000);
        setButtonState('authSubmitBtn', 'loading', currentAuthTab === 'signin' ? '核對身分中...' : '建立安全通道...');

        if (currentAuthTab === 'signin') {
            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            // Second delay stage
            await delay(1000);

            // 若不是訪客才處理 Merge，但我們先一律當作成功
            setButtonState('authSubmitBtn', 'success');

            // 慶祝效果 (抓取點擊按鈕的座標)
            const btnRect = document.getElementById('authSubmitBtn').getBoundingClientRect();
            triggerConfetti(btnRect.left + btnRect.width / 2, btnRect.top);

            await delay(600);

            // Check data merging before closing
            if (typeof window.checkAndMergeData === 'function') {
                const needsMerge = await window.checkAndMergeData();
                if (!needsMerge) {
                    closeLoginModal();
                } else {
                    // checkAndMergeData will handle opening the conflict modal
                    closeLoginModal();
                }
            } else {
                closeLoginModal();
            }

        } else {
            // Signup Form
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { nickname: nickname || '' }
                }
            });
            if (error) throw error;

            // Supabase "fake success" detection for existing emails (including OAuth users)
            if (data?.user?.identities?.length === 0) {
                throw new Error('User already registered');
            }

            await delay(1000);
            pendingEmail = email;
            showOtpForm();
            setButtonState('authSubmitBtn', 'idle', '註冊'); // reset standard btn
        }
    } catch (err) {
        console.error('Auth Error:', err);
        const translatedMsg = translateAuthError(err.message || String(err));
        showError('authErrorMsg', translatedMsg);
        setButtonState('authSubmitBtn', 'idle', currentAuthTab === 'signin' ? '登入' : '註冊');
    } finally {
        isSubmitting = false;
    }
}

async function handleOtpSubmit() {
    if (!navigator.onLine) {
        showError('otpErrorMsg', '連線異常，請稍後重試');
        return;
    }

    hideError('otpErrorMsg');
    const token = document.getElementById('otpInput').value.trim();

    if (token.length !== 6) {
        showError('otpErrorMsg', '請輸入完整的 6 位數驗證碼');
        return;
    }

    isSubmitting = true;
    setButtonState('otpSubmitBtn', 'loading', '驗證中...');

    try {
        await delay(1500); // 人工延遲

        const { error } = await window.supabaseClient.auth.verifyOtp({
            email: pendingEmail,
            token: token,
            type: 'signup'
        });
        if (error) {
            // Dormant registration handling fallback ?
            if (error.message.includes('Token has expired')) {
                showError('otpErrorMsg', '驗證碼已過期，請點擊重新發送。');
                throw error;
            }
            throw error;
        }

        setButtonState('otpSubmitBtn', 'success');
        document.title = '台股股東會紀念品攻略 🎁'; // Reset title

        const btnRect = document.getElementById('otpSubmitBtn').getBoundingClientRect();
        triggerConfetti(btnRect.left + btnRect.width / 2, btnRect.top);

        await delay(500);
        // Supabase will trigger SIGNED_IN event.

    } catch (err) {
        console.error('OTP Error:', err);
        showError('otpErrorMsg', translateAuthError(err.message));
        setButtonState('otpSubmitBtn', 'idle', '驗證並登入');
    } finally {
        isSubmitting = false;
        document.getElementById('otpInput').value = '';
    }
}

async function resendOtp() {
    if (otpCooldownTimer) return; // Prevent spam

    const btn = document.getElementById('resendOtpBtn');
    hideError('otpErrorMsg');

    try {
        const { error } = await window.supabaseClient.auth.resend({
            type: 'signup',
            email: pendingEmail
        });
        if (error) throw error;

        // Cooldown 60s
        let timeLeft = 60;
        btn.disabled = true;
        btn.style.color = 'var(--text-secondary)';

        otpCooldownTimer = setInterval(() => {
            timeLeft--;
            btn.textContent = `重新發送 (${timeLeft}s)`;
            if (timeLeft <= 0) {
                clearInterval(otpCooldownTimer);
                otpCooldownTimer = null;
                btn.disabled = false;
                btn.textContent = '重新發送驗證碼';
                btn.style.color = '';
            }
        }, 1000);

    } catch (err) {
        showError('otpErrorMsg', '重寄失敗：' + translateAuthError(err.message));
    }
}

// ── 忘記密碼 / 重設密碼 ──────────────────────────────────────────
async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    hideError('forgotPasswordMsg');

    const email = document.getElementById('resetEmail').value.trim();
    if (!email) return;

    setButtonState('forgotPasswordSubmitBtn', 'loading', '發送中...');

    try {
        await delay(1500); // 人工延遲
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;

        setButtonState('forgotPasswordSubmitBtn', 'success');

        // 進入輸入驗證碼階段
        recoverEmail = email;
        const msgMasked = document.getElementById('recoverOtpEmailMasked');
        if (msgMasked) msgMasked.textContent = `請前往信箱查看發送至 ${maskEmail(email)} 的 6 位數密碼重置驗證碼`;

        await delay(500);
        document.getElementById('forgotPasswordForm').classList.add('hidden');
        document.getElementById('recoverOtpForm').classList.remove('hidden');
        document.getElementById('recoverOtpInput').focus();
        setButtonState('forgotPasswordSubmitBtn', 'idle', '發送重置連結');
    } catch (err) {
        showError('forgotPasswordMsg', translateAuthError(err.message));
        setButtonState('forgotPasswordSubmitBtn', 'idle', '發送重置連結');
    }
}

async function handleRecoverOtpSubmit() {
    if (!navigator.onLine) {
        showError('recoverOtpMsg', '連線異常，請稍後重試');
        return;
    }

    hideError('recoverOtpMsg');
    const token = document.getElementById('recoverOtpInput').value.trim();

    if (token.length !== 6) {
        showError('recoverOtpMsg', '請輸入完整的 6 位數驗證碼');
        return;
    }

    isSubmitting = true;
    setButtonState('recoverOtpSubmitBtn', 'loading', '驗證中...');

    try {
        await delay(1500); // 人工延遲

        const { error } = await window.supabaseClient.auth.verifyOtp({
            email: recoverEmail,
            token: token,
            type: 'recovery'
        });

        if (error) {
            if (error.message.includes('Token has expired')) {
                showError('recoverOtpMsg', '驗證碼已過期，請點擊重新發送。');
                throw error;
            }
            throw error;
        }

        setButtonState('recoverOtpSubmitBtn', 'success');

        const btnRect = document.getElementById('recoverOtpSubmitBtn').getBoundingClientRect();
        triggerConfetti(btnRect.left + btnRect.width / 2, btnRect.top);

        await delay(500);

        // OTP 驗證成功後直接顯示設定新密碼表單
        document.getElementById('recoverOtpForm').classList.add('hidden');
        document.getElementById('updatePasswordForm').classList.remove('hidden');

    } catch (err) {
        console.error('Recovery OTP Error:', err);
        showError('recoverOtpMsg', translateAuthError(err.message));
        setButtonState('recoverOtpSubmitBtn', 'idle', '驗證驗證碼');
    } finally {
        isSubmitting = false;
        document.getElementById('recoverOtpInput').value = '';
    }
}

async function resendRecoverOtp() {
    if (recoverOtpCooldownTimer) return; // Prevent spam

    const btn = document.getElementById('resendRecoverOtpBtn');
    hideError('recoverOtpMsg');

    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(recoverEmail);
        if (error) throw error;

        // Cooldown 60s
        let timeLeft = 60;
        btn.disabled = true;
        btn.style.color = 'var(--text-secondary)';

        recoverOtpCooldownTimer = setInterval(() => {
            timeLeft--;
            btn.textContent = `重新發送 (${timeLeft}s)`;
            if (timeLeft <= 0) {
                clearInterval(recoverOtpCooldownTimer);
                recoverOtpCooldownTimer = null;
                btn.disabled = false;
                btn.textContent = '重新發送驗證碼';
                btn.style.color = '';
            }
        }, 1000);

    } catch (err) {
        showError('recoverOtpMsg', '重寄失敗：' + translateAuthError(err.message));
    }
}


async function handleUpdatePasswordSubmit(e) {
    e.preventDefault();
    hideError('updatePasswordMsg');

    const pw1 = document.getElementById('newPassword').value;
    const pw2 = document.getElementById('confirmNewPassword').value;

    if (pw1 !== pw2) {
        showError('updatePasswordMsg', '兩次輸入的密碼不一致');
        return;
    }

    setButtonState('updatePasswordSubmitBtn', 'loading', '更新中...');

    try {
        await delay(1500); // 人工延遲
        const { error } = await window.supabaseClient.auth.updateUser({ password: pw1 });
        if (error) throw error;

        setButtonState('updatePasswordSubmitBtn', 'success');
        await delay(1000);
        closeLoginModal();
    } catch (err) {
        showError('updatePasswordMsg', translateAuthError(err.message));
        setButtonState('updatePasswordSubmitBtn', 'idle', '更新密碼並登入');
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
    else {
        // 清除本地備份以防錯亂
        localStorage.removeItem('stockList');
        localStorage.removeItem('last_sync_time');
        // Render empty table
        if (typeof window.processDataAndRender === 'function') window.processDataAndRender();
    }
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
        // We defer loadFromCloud check to the merge logic, but if there was no local data, we just load.
        // Actually, loadFromCloud should be called inside checkAndMergeData or after.
        // But for safety, if there's no conflict modal showing, we can load.
        if (typeof loadFromCloud === 'function' && document.getElementById('syncConflictModal').classList.contains('hidden')) {
            loadFromCloud();
        }
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

// ── UI Utilities ───────────────────────────
function triggerSyncProgress() {
    const bar = document.getElementById('topSyncProgressBar');
    if (!bar) return;
    bar.classList.add('active');
    bar.style.width = '30%';
    setTimeout(() => bar.style.width = '70%', 500);
    setTimeout(() => bar.style.width = '100%', 1200);
    setTimeout(() => {
        bar.style.opacity = '0';
        setTimeout(() => {
            bar.classList.remove('active');
            bar.style.width = '0';
            bar.style.opacity = '';
        }, 500);
    }, 1500);
}

// Exported for Global use
window.openLoginModal = openLoginModal;
window.closeLoginModal = closeLoginModal;
window.triggerConfetti = triggerConfetti;
