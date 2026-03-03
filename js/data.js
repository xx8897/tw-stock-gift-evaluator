const EXCEL_URL = 'data/2021-2025_推薦評分.xlsx';
const GITHUB_API_URL = 'https://api.github.com/repos/xx8897/tw-stock-gift-evaluator/commits?path=data%2F2021-2025_%E6%8E%A8%E8%96%A6%E8%A9%95%E5%88%86.xlsx&page=1&per_page=1';

const AppState = {
    globalData: [],
    filteredData: [],
    currentSort: { column: 'score', direction: 'desc' },
    purchasedStocks: new Set(), // 儲存已買入的股號 (String)
    filters: {
        search: '',
        stars: 'all',
        annualOnly: false,
        showPurchasedOnly: false // 新增過濾開關
    },
    currentPage: 1,
    pageSize: 25
};

/**
 * 載入已買入清單 (從 LocalStorage)
 */
function loadPurchased() {
    try {
        const saved = localStorage.getItem('purchased_stocks');
        if (saved) {
            const list = JSON.parse(saved);
            AppState.purchasedStocks = new Set(list.map(String));
        }
    } catch (e) {
        console.error('無法從 LocalStorage 載入買入清單:', e);
        AppState.purchasedStocks = new Set();
    }
}

/**
 * 切換買入狀態並同步至 LocalStorage
 */
function togglePurchase(stockId) {
    stockId = String(stockId);
    if (AppState.purchasedStocks.has(stockId)) {
        AppState.purchasedStocks.delete(stockId);
    } else {
        AppState.purchasedStocks.add(stockId);
    }

    // 同步到 LocalStorage
    localStorage.setItem('purchased_stocks', JSON.stringify([...AppState.purchasedStocks]));
}

async function loadData() {
    // 優先載入已買入狀態
    loadPurchased();

    const loadingState = document.getElementById('loadingState');
    const tableWrapper = document.getElementById('tableWrapper');
    const lastUpdated = document.getElementById('last-updated');

    try {
        const response = await fetch(EXCEL_URL);
        if (!response.ok) throw new Error('無法載入 Excel 檔案，請確認檔案是否存在於儲存庫中。');
        const arrayBuffer = await response.arrayBuffer();

        // 嘗試從 HTTP Header 取得最後更新時間
        const lastMod = response.headers.get('Last-Modified');
        let d = lastMod ? new Date(lastMod) : new Date(NaN);

        // 若 Header 不存在或日期無效，改用 GitHub Commits API 取得
        if (isNaN(d.getTime())) {
            try {
                const ghRes = await fetch(GITHUB_API_URL);
                if (ghRes.ok) {
                    const ghData = await ghRes.json();
                    if (ghData && ghData.length > 0 && ghData[0].commit?.committer?.date) {
                        d = new Date(ghData[0].commit.committer.date);
                    }
                }
            } catch (githubErr) {
                console.warn('GitHub API fallback failed:', githubErr);
            }
        }

        if (!isNaN(d.getTime())) {
            lastUpdated.innerHTML = `<i class="fa-regular fa-calendar-check"></i> 最後更新: ${d.toLocaleDateString('zh-TW')} ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            lastUpdated.innerHTML = `<i class="fa-solid fa-check"></i> 同步至最新版`;
        }

        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        AppState.globalData = rawData.map(row => ({
            id: String(row['股號'] || ''),
            name: String(row['公司'] || ''),
            price: parseFloat(row['最新股價']) || 0,
            gift: String(row['上次紀念品'] || ''),
            freq: parseInt(row['五年內發放次數']) || 0,
            cp: parseFloat(row['新版性價比']) || 0,
            score: String(row['新版推薦評分'] || '1 星'),
            fiveYearGifts: String(row['五年發放紀念品'] || ''),
            cond: String(row['去年條件'] || '')
        }));

        loadingState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');

        // 資料載入完成後才渲染表格
        renderTable();

    } catch (error) {
        console.error('Error loading Excel:', error);
        loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:#ef4444;margin-bottom:1rem;"></i>
            <p>無法載入股票資料</p>
            <p style="font-size:0.85rem;opacity:0.7;margin-top:0.5rem;">${error.message}</p>
        `;
    }
}
