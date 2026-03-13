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

            // 2. 取得 Turnstile Token
            // 注意：如果 Turnstile 未通過，token 會是空的
            const turnstileResponse = turnstile.getResponse();
            if (!turnstileResponse) {
                alert('請先完成安全驗證 (Turnstile)');
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
                // 4. 準備準備資料
                const email = ($('feedbackEmail') || {}).value?.trim() || '';
                const typeLabel = TYPE_SUBJECTS[currentType] || '【回饋】';
                
                // 將資料送往 Google Apps Script
                // 注意：這裡的 URL 需要使用者部署後提供
                const GAS_URL = 'https://script.google.com/macros/s/AKfycbyRR5oUUJrygGPbFWmHzLGuViXmFw2Bm2YsqA21cxos_UKTRBVY61zlii0kN_wEcou6/exec';
                
                const formData = new FormData();
                formData.append('type', typeLabel);
                formData.append('email', email);
                formData.append('content', content);
                formData.append('turnstileToken', turnstileResponse);

                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    body: formData,
                    mode: 'no-cors' // GAS Web App 限制通常需要 no-cors 或特殊處理
                });

                // 因為 no-cors 無法讀取 response body，我們假設 200 OK
                // (GAS 只要沒報 500 通常就是成功)
                
                // 5. 顯示成功畫面
                hide(form);
                show($('feedbackSuccessState'));

            } catch (error) {
                console.error('[Feedback]: 送出失敗', error);
                alert('伺服器忙碌中，請稍後再試或直接 Email 給作者。');
                
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
        console.log('[FeedbackModal]: 初始化完成');
    }

    // ---- 暴露至全域 ----
    window.openFeedbackModal = openFeedbackModal;
    window.closeFeedbackModal = closeFeedbackModal;
    window.initFeedbackModal = initFeedbackModal;

})();
