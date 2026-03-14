window.initModals = function() {
    step = 'modals';
    const infoModal = document.getElementById('infoModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const sponsorModal = document.getElementById('sponsorModal');
    const ecpayDisabledModal = document.getElementById('ecpayDisabledModal');
    const openSponsorBtn = document.getElementById('openSponsorBtn');
    const closeSponsorBtn = document.getElementById('closeSponsorBtn');

    // ── 彈出視窗 ──────────────────────────────────────────────
    openModalBtn?.addEventListener('click', () => infoModal.classList.remove('hidden'));
    closeModalBtn?.addEventListener('click', () => infoModal.classList.add('hidden'));
    openSponsorBtn?.addEventListener('click', () => sponsorModal.classList.remove('hidden'));
    closeSponsorBtn?.addEventListener('click', () => sponsorModal.classList.add('hidden'));

    [infoModal, sponsorModal].forEach(m => {
        m?.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
    });

    // 綠界未啟用提示
    const ecpayOption = document.querySelector('.sponsor-option-card.ecpay');
    ecpayOption?.addEventListener('click', (e) => {
        e.preventDefault();
        ecpayDisabledModal?.classList.remove('hidden');
    });
    ecpayDisabledModal?.addEventListener('click', () => {
        ecpayDisabledModal.classList.add('hidden');
    });

    // ── 點擊其他地方收起歷史彈窗 ─────────────────────────────
    document.addEventListener('click', (e) => {
        const historyBtn = e.target.closest('.history-btn');
        const insidePopup = e.target.closest('.history-popup');

        // 如果點擊的是按鈕，交給 toggleHistoryPopup 處理，此處不動作
        if (historyBtn) return;

        // 如果點擊的是彈窗內部，保持開啟
        if (insidePopup) return;

        // 點擊其他地方，關閉所有開啟中的彈窗
        document.querySelectorAll('.history-popup.open').forEach(el => el.classList.remove('open', 'popup-upward'));
    });

};

function createCoins(lx, ly) {
    const coinIcons = ['💰', '🪙', '✨', '💎'];
    for (let i = 0; i < 15; i++) {
        const coin = document.createElement('div');
        coin.className = 'coin-particle';
        coin.textContent = coinIcons[Math.floor(Math.random() * coinIcons.length)];

        const tx = (Math.random() - 0.5) * 300;
        const ty = (Math.random() - 0.8) * 300;
        const tr = (Math.random() - 0.5) * 720;

        coin.style.left = lx + 'px';
        coin.style.top = ly + 'px';
        coin.style.setProperty('--tx', `${tx}px`);
        coin.style.setProperty('--ty', `${ty}px`);
        coin.style.setProperty('--tr', `${tr}deg`);

        document.body.appendChild(coin);
        coin.onanimationend = () => coin.remove();
    }
}

/**
 * 切換歷年紀念品彈窗 (唯一化管理 + 智慧型邊界偵測)
 */
window.toggleHistoryPopup = function(btn) {
    const parent = btn.closest('.gift-cell');
    if (!parent) return;
    
    const popup = parent.querySelector('.history-popup');
    if (!popup) return;

    const isOpen = popup.classList.contains('open');

    // 1. 先關閉其它所有開啟中的彈窗
    document.querySelectorAll('.history-popup.open').forEach(el => {
        if (el !== popup) el.classList.remove('open', 'popup-upward');
    });

    // 2. 切換當前彈窗
    if (!isOpen) {
        popup.classList.add('open');
        
        // 智慧型邊界偵測：優先「向下」開啟，只有底部空間不足且頂部空間足夠時才翻轉
        const popupRect = popup.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const container = document.querySelector('.table-container');
        const containerRect = container ? container.getBoundingClientRect() : null;
        
        let shouldFlip = false;
        
        // 門檻：當彈窗底部超出 螢幕底部 或 容器底部
        const isBottomOverWindow = popupRect.bottom > viewportHeight - 10;
        const isBottomOverContainer = containerRect && popupRect.bottom > containerRect.bottom - 5;
        
        if (isBottomOverWindow || isBottomOverContainer) {
            // 只有當「向上」的空間比「向下」寬裕時才翻轉
            // 向上空間 = 按鈕頂部距離視窗頂部
            if (btnRect.top > popupRect.height + 40) {
                shouldFlip = true;
            }
        }
        
        if (shouldFlip) {
            popup.classList.add('popup-upward');
        } else {
            popup.classList.remove('popup-upward');
        }
    } else {
        popup.classList.remove('open', 'popup-upward');
    }
};
