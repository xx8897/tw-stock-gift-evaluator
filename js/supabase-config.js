/**
 * Supabase 連線設定
 * 用 IIFE 包裝，避免全域命名空間衝突
 */
(function () {
    const SUPABASE_URL = 'https://jyoaoepcrqxzrtdkldfg.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IFSxZWya1imWZQzNwg90ZA_msTvVbsg';

    // 初始化 Supabase Client，掛上 window 供其他腳本使用
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    } else {
        window.supabaseClient = null;
        console.error('Supabase SDK 未正確載入，請檢查 index.html 中的 SDK 引入。');
    }
})();
