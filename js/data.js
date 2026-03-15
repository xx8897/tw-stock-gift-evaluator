const EXCEL_URL = 'data/2021-2025_推薦v2.xlsx';
const GITHUB_API_URL = 'https://api.github.com/repos/xx8897/tw-stock-gift-evaluator/commits?path=data%2F2021-2025_%E6%8E%A8%E8%96%A6v2.xlsx&page=1&per_page=1';

const AppState = {
    globalData: [],
    filteredData: [],
    currentSort: { column: 'score', direction: 'desc' },
    purchasedStocks: new Set(), // 儲存已買入的股號 (String)
    interestStocks: new Set(),  // 儲存感興趣的股號 (String)
    filters: {
        search: '',
        stars: [], // 改為陣列，儲存選取的星級 (如 [5, 4])，為空時代表「全部」
        annualOnly: false,
        excludeId: false,
        ticketOnly: false,
        objectOnly: false,
        interestOnly: false,
        purchaseFilter: 'all' // 'all' | 'purchased' | 'unpurchased'
    },
    currentPage: 1,
    pageSize: 25,
    currentUser: null, // Supabase 登入使用者，null 代表未登入
    isInitialSyncing: false
};

function processDataAndRender(options = {}) {
    const { resetPage = false } = options;
    if (resetPage) AppState.currentPage = 1;
    if (AppState.globalData.length > 0 && typeof renderTable === 'function') {
        renderTable();
        // 當全體資料載入完成，同步更新排行榜中的公司名稱
        if (typeof renderRankings === 'function') {
            renderRankings();
        }
    }
}

function savePurchasedStocks(source = 'local') {
    localStorage.setItem('purchased_stocks', JSON.stringify([...AppState.purchasedStocks]));
    window.dispatchEvent(new CustomEvent('purchased:changed', {
        detail: {
            source,
            count: AppState.purchasedStocks.size
        }
    }));
}

function replacePurchasedStocks(stockIds, options = {}) {
    const { source = 'local', render = true, resetPage = false } = options;
    const normalized = Array.isArray(stockIds) ? stockIds.map(String) : [];
    AppState.purchasedStocks = new Set(normalized);
    savePurchasedStocks(source);
    if (render) processDataAndRender({ resetPage });
}

/**
 * 載入已買入與興趣清單 (從 LocalStorage)
 */
function loadUserData() {
    try {
        const savedPurchased = localStorage.getItem('purchased_stocks');
        if (savedPurchased) {
            const list = JSON.parse(savedPurchased);
            replacePurchasedStocks(list, { source: 'local', render: false });
        }
        const savedInterest = localStorage.getItem('interest_stocks');
        if (savedInterest) {
            const list = JSON.parse(savedInterest);
            AppState.interestStocks = new Set(list.map(String));
        }
    } catch (e) {
        console.error('無法從 LocalStorage 載入用戶資料:', e);
    }
}

function saveInterestStocks() {
    localStorage.setItem('interest_stocks', JSON.stringify([...AppState.interestStocks]));
}

/**
 * 切換買入狀態
 */
function togglePurchase(stockId) {
    stockId = String(stockId);
    if (AppState.purchasedStocks.has(stockId)) {
        AppState.purchasedStocks.delete(stockId);
    } else {
        AppState.purchasedStocks.add(stockId);
    }
    savePurchasedStocks('local');
    processDataAndRender();
    if (typeof scheduleAutoSync === 'function') scheduleAutoSync();
}

/**
 * 切換興趣狀態
 */
function toggleInterest(stockId) {
    stockId = String(stockId);
    let isMarking = false;
    if (AppState.interestStocks.has(stockId)) {
        AppState.interestStocks.delete(stockId);
    } else {
        AppState.interestStocks.add(stockId);
        isMarking = true;
    }
    saveInterestStocks();
    processDataAndRender();
    if (typeof scheduleAutoSync === 'function') scheduleAutoSync();
}

async function loadData() {
    // 優先載入用戶狀態
    loadUserData();

    const loadingState = document.getElementById('loadingState');
    const tableWrapper = document.getElementById('tableWrapper');
    const lastUpdated = document.getElementById('last-updated');

    try {
        if (!window.supabaseClient) {
            console.warn('Supabase client 未初始化，退回本地 Excel 讀取模式');
            throw new Error('Supabase client 未初始化');
        }

        // 嘗試從 Supabase 撈取 stocks 資料
        const { data: supaData, error: supaError } = await window.supabaseClient
            .from('stocks')
            .select('*')
            .order('cp', { ascending: false });

        if (supaError) {
            console.warn('Supabase 讀取失敗，嘗試載入本地備援 (Excel):', supaError);
            throw supaError;
        }

        if (supaData && supaData.length > 0) {
            let latestDate = new Date(0);

            AppState.globalData = supaData.map(row => {
                if (row.updated_at) {
                    const d = new Date(row.updated_at);
                    if (d > latestDate) latestDate = d;
                }
                return {
                    id: String(row.stock_id || ''),
                    name: String(row.name || ''),
                    price: parseFloat(row.price) || 0,
                    gift: String(row.gift || ''),
                    freq: parseInt(row.freq) || 0,
                    cp: parseFloat(row.cp) || 0,
                    score: String(row.score || '1 星'),
                    fiveYearGifts: String(row.five_year_gifts || ''),
                    cond: String(row.cond || '')
                };
            });
            
            if (latestDate.getTime() === 0) latestDate = new Date();
            
            lastUpdated.innerHTML = `<i class="fa-regular fa-calendar-check"></i> 最後更新: ${latestDate.toLocaleDateString('zh-TW')} ${latestDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
            
            loadingState.classList.add('hidden');
            tableWrapper.classList.remove('hidden');
            processDataAndRender();
            return; // 成功從 Supabase 取得資料，結束函式
        } else {
            throw new Error('Supabase 無資料，轉向備援');
        }
    } catch (primaryError) {
        // Fallback 到 Excel 讀取機制
        await loadExcelDataFallback(loadingState, tableWrapper, lastUpdated);
    }
}

async function loadExcelDataFallback(loadingState, tableWrapper, lastUpdated) {
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
            lastUpdated.innerHTML = `<i class="fa-regular fa-calendar-check"></i> 備援更新: ${d.toLocaleDateString('zh-TW')} ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            lastUpdated.innerHTML = `<i class="fa-solid fa-check"></i> 同步至最新版 (備援)`;
        }

        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        AppState.globalData = rawData.map(row => ({
            id: String(row['股號'] || ''),
            name: String(row['公司'] || ''),
            price: parseFloat(row['最近股價']) || 0,
            gift: String(row['上次紀念品'] || ''),
            freq: parseInt(row['五年內發放次數']) || 0,
            cp: parseFloat(row['新版性價比']) || 0,
            score: String(row['新版推薦評分'] || '1 星'),
            fiveYearGifts: String(row['五年發放紀念品'] || ''),
            cond: String(row['去年條件'] || '')
        }));

        loadingState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');

        // 資料載入完成後渲染表格
        processDataAndRender();

    } catch (error) {
        console.error('Error loading Excel:', error);
        loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:#ef4444;margin-bottom:1rem;"></i>
            <p>無法載入股票資料</p>
            <p style="font-size:0.85rem;opacity:0.7;margin-top:0.5rem;">${error.message}</p>
        `;
    }
}

window.processDataAndRender = processDataAndRender;
window.replacePurchasedStocks = replacePurchasedStocks;
window.toggleInterest = toggleInterest;
