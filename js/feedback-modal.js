/**
 * feedback-modal.js
 * 回饋彈窗：類型選擇、字數計算、表單驗證、送出邏輯
 */

(function () {
    'use strict';

    // ---- 常數 ----
    const FEEDBACK_EMAIL = 'zhixiang8897@gmail.com';
    const MAX_CHARS = 1000;

    const TYPE_SUBJECTS = {
        suggestion: '【功能建議】',
        bug: '【問題回報】',
        collab: '【開發合作】',
    };

    // ---- 狀態 ----
    let currentType = 'suggestion';

    // ---- 工具 ----
    function $(id) { return document.getElementById(id); }
    function hide(el) { el && el.classList.add('hidden'); }
    function show(el) { el && el.classList.remove('hidden'); }
    
    // ---- 開關彈窗 ----
    function openFeedbackModal() {
        const modal = $('feedbackModal');
        if (!modal) return;
        
        resetModal();
        show(modal);
        document.body.style.overflow = 'hidden';
    }

    function closeFeedbackModal() {
        const modal = $('feedbackModal');
        if (!modal) return;
        hide(modal);
        document.body.style.overflow = '';
    }

    function resetModal() {
        // 重置類型
        currentType = 'suggestion';
        document.querySelectorAll('.feedback-type-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.type === 'suggestion');
        });

        // 重置表單
        const form = $('feedbackForm');
        const successState = $('feedbackSuccessState');
        if (form) { show(form); form.reset(); }
        if (successState) hide(successState);

        // 重置驗證訊息
        const validMsg = $('feedbackValidationMsg');
        if (validMsg) hide(validMsg);

        // 重置字數
        const counter = $('feedbackCharCount');
        if (counter) counter.textContent = '0';

        // 重置按鈕
        const submitBtn = $('feedbackSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            const text = submitBtn.querySelector('.btn-text');
            const spinner = submitBtn.querySelector('.btn-spinner');
            const success = submitBtn.querySelector('.btn-success');
            if (text) show(text);
            if (spinner) hide(spinner);
            if (success) hide(success);
        }
    }

    // ---- 類型選擇 ----
    function bindTypePills() {
        document.querySelectorAll('.feedback-type-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.feedback-type-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentType = pill.dataset.type;
            });
        });
    }

    // ---- 字數計算 ----
    function bindCharCounter() {
        const textarea = $('feedbackContent');
        const counter = $('feedbackCharCount');
        if (!textarea || !counter) return;

        textarea.addEventListener('input', () => {
            const len = textarea.value.length;
            counter.textContent = len;
            // 接近上限時變紅
            counter.style.color = len >= MAX_CHARS * 0.9 ? '#f87171' : '';
        });
    }

    // ---- 送出邏輯 ----
    function bindFormSubmit() {
        const form = $('feedbackForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const contentField = $('feedbackContent');
            const content = contentField?.value?.trim() || '';
            const validMsg = $('feedbackValidationMsg');

            // 1. 基本內容驗證
            if (!content) {
                if (validMsg) show(validMsg);
                contentField?.focus();
                return;
            }
            if (validMsg) hide(validMsg);

            // 2. 檢查頻率限制 (Rate Limiting) - 每 1 分鐘只能送一次
            const lastSubmit = localStorage.getItem('last_feedback_submit');
            const now = Date.now();
            if (lastSubmit && (now - parseInt(lastSubmit)) < 1 * 60 * 1000) {
                const waitSec = Math.ceil((1 * 60 * 1000 - (now - parseInt(lastSubmit))) / 1000);
                alert(`您送得太快囉！請稍等 ${waitSec} 秒後再試。`);
                return;
            }

            // 3. 切換 Loading 狀態
            const submitBtn = $('feedbackSubmitBtn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnSpinner = submitBtn?.querySelector('.btn-spinner');
            
            if (submitBtn) submitBtn.disabled = true;
            if (btnText) hide(btnText);
            if (btnSpinner) show(btnSpinner);

            try {
                // 4. 準備資料
                const email = ($('feedbackEmail') || {}).value?.trim() || '';
                const typeLabel = TYPE_SUBJECTS[currentType] || '【回饋】';
                const GAS_URL = 'https://script.google.com/macros/s/AKfycbxlu25qzMK_OHuNuAUwHju2Pl6klhgQ-haxjLEUMr20dvrM8WqwbnhxGWNN3u5rcluF/exec';
                
                // 使用 URLSearchParams 以確保 GAS e.parameter 能正確解析
                const params = new URLSearchParams();
                params.append('type', typeLabel);
                params.append('email', email);
                params.append('content', content);

                console.log('[Feedback]: 開始傳送...', typeLabel);

                // 發送請求
                await fetch(GAS_URL, {
                    method: 'POST',
                    body: params,
                    mode: 'no-cors' // GAS 必須使用 no-cors 模式
                });

                // 5. 成功紀錄與畫面切換
                localStorage.setItem('last_feedback_submit', Date.now().toString());
                hide(form);
                show($('feedbackSuccessState'));

            } catch (error) {
                console.error('[Feedback]: 送出失敗', error);
                alert('傳送時發生網路錯誤，請稍後再試。');
                
                // 恢復按鈕
                if (submitBtn) submitBtn.disabled = false;
                if (btnText) show(btnText);
                if (btnSpinner) hide(btnSpinner);
            }
        });
    }

    // ---- 關閉按鈕 + 點擊背景關閉 ----
    function bindCloseEvents() {
        // X 按鈕
        const closeBtn = $('closeFeedbackModalBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeFeedbackModal);

        // 取消按鈕
        const cancelBtn = $('feedbackCancelBtn');
        if (cancelBtn) cancelBtn.addEventListener('click', closeFeedbackModal);

        // 成功後關閉
        const doneBtn = $('feedbackDoneBtn');
        if (doneBtn) doneBtn.addEventListener('click', closeFeedbackModal);

        // 點擊 overlay 關閉
        const modal = $('feedbackModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeFeedbackModal();
            });
        }

        // ESC 關閉
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = $('feedbackModal');
                if (modal && !modal.classList.contains('hidden')) {
                    closeFeedbackModal();
                }
            }
        });
    }

    // ---- 初始化 ----
    function initFeedbackModal() {
        bindTypePills();
        bindCharCounter();
        bindFormSubmit();
        bindCloseEvents();
        console.log('[FeedbackModal]: 初始化完成（無驗證碼模式）');
    }

    // ---- 暴露至全域 ----
    window.openFeedbackModal = openFeedbackModal;
    window.closeFeedbackModal = closeFeedbackModal;
    window.initFeedbackModal = initFeedbackModal;

})();
