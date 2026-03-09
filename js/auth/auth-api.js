/**
 * auth-api.js — 核心 API 連結
 * 包含 Supabase 登入、註冊、OTP 驗證、密碼重置、Google 登入、登出等
 */

async function handleAuthSubmit(e) {
    e.preventDefault();
    if (!navigator.onLine) {
        showError('authErrorMsg', '請檢查您的網路連線');
        return;
    }

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

    setButtonState('authSubmitBtn', 'loading', '驗證資訊中...');

    try {
        await delay(1000);
        setButtonState('authSubmitBtn', 'loading', currentAuthTab === 'signin' ? '核對身分中...' : '建立安全通道...');

        if (currentAuthTab === 'signin') {
            const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;

            await delay(1000);
            setButtonState('authSubmitBtn', 'success');

            const btnRect = document.getElementById('authSubmitBtn').getBoundingClientRect();
            triggerConfetti(btnRect.left + btnRect.width / 2, btnRect.top);

            await delay(600);
            closeLoginModal();

        } else {
            const { data, error } = await window.supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { nickname: nickname || '' }
                }
            });
            if (error) throw error;

            if (data?.user?.identities?.length === 0) {
                throw new Error('User already registered');
            }

            await delay(1000);
            pendingEmail = email;
            showOtpForm();
            setButtonState('authSubmitBtn', 'idle', '註冊');
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
        await delay(1500);

        const { error } = await window.supabaseClient.auth.verifyOtp({
            email: pendingEmail,
            token: token,
            type: 'signup'
        });
        if (error) {
            if (error.message.includes('Token has expired')) {
                showError('otpErrorMsg', '驗證碼已過期，請點擊重新發送。');
                throw error;
            }
            throw error;
        }

        setButtonState('otpSubmitBtn', 'success');
        document.title = '台股股東會紀念品攻略 🎁';

        const btnRect = document.getElementById('otpSubmitBtn').getBoundingClientRect();
        triggerConfetti(btnRect.left + btnRect.width / 2, btnRect.top);

        await delay(500);

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
    if (otpCooldownTimer) return;

    const btn = document.getElementById('resendOtpBtn');
    hideError('otpErrorMsg');

    try {
        const { error } = await window.supabaseClient.auth.resend({
            type: 'signup',
            email: pendingEmail
        });
        if (error) throw error;

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

async function handleForgotPasswordSubmit(e) {
    e.preventDefault();
    hideError('forgotPasswordMsg');

    const email = document.getElementById('resetEmail').value.trim();
    if (!email) return;

    setButtonState('forgotPasswordSubmitBtn', 'loading', '發送中...');

    try {
        await delay(1500);
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;

        setButtonState('forgotPasswordSubmitBtn', 'success');

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
        await delay(1500);

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
    if (recoverOtpCooldownTimer) return;

    const btn = document.getElementById('resendRecoverOtpBtn');
    hideError('recoverOtpMsg');

    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(recoverEmail);
        if (error) throw error;

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
        await delay(1500);
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

async function signInWithGoogle() {
    if (!window.supabaseClient) return;
    const cleanRedirectUrl = window.location.origin + window.location.pathname;
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: cleanRedirectUrl }
    });
    if (error) console.error('登入失敗:', error.message);
}

async function signOut() {
    if (!window.supabaseClient) return;
    if (typeof cancelAutoSync === 'function') cancelAutoSync();

    document.getElementById('userMenu')?.classList.remove('open');

    const { error } = await window.supabaseClient.auth.signOut();
    if (error) console.error('登出失敗:', error.message);
    else {
        localStorage.removeItem('stockList');
        localStorage.removeItem('last_sync_time');
        if (typeof window.processDataAndRender === 'function') window.processDataAndRender();
    }
}

// 暴露給全域
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;

console.log('[Auth API]: 初始化完成');
