/**
 * auth-utils.js — 輔助工具
 */

// 人工延遲
var delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

console.log('[Auth Utils]: 初始化完成');
