/**
 * 台股紀念品指南 - 數據分析與追蹤模組
 * 功能：整合 GA4 自訂事件與 Supabase 熱度追蹤
 */

(function() {
    // 追蹤股票相關事件
    async function trackStockEvent(stockCode, stockName, eventType = 'view') {
        const timestamp = new Date().toISOString();
        
        // 1. 發送至 GA4
        if (typeof gtag !== 'undefined') {
            gtag('event', `stock_${eventType}`, {
                'stock_code': stockCode,
                'stock_name': stockName,
                'timestamp': timestamp
            });
            console.log(`[Analytics]: GA4 Event -> stock_${eventType}`, stockCode);
        }

        // 2. 寫入 Supabase (stock_events 表)
        if (window.supabaseClient) {
            try {
                // Fire and forget, 不阻塞 UI
                window.supabaseClient
                    .from('stock_events')
                    .insert({
                        stock_code: stockCode,
                        stock_name: stockName,
                        event_type: eventType
                    })
                    .then(({ error }) => {
                        if (error) console.warn('[Analytics]: Supabase Insert Error', error);
                    });
            } catch (e) {
                console.error('[Analytics]: Supabase Event Failed', e);
            }
        }
    }

    // 追蹤一般 UI 動作
    function trackUIEvent(action, label = '') {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'ui_interaction', {
                'action': action,
                'label': label
            });
            console.log(`[Analytics]: GA4 UI Event -> ${action}`, label);
        }
    }

    // 取得熱門股票排行
    async function fetchTopStocks(limit = 10) {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('top_stocks_30d') // 我們稍後會建立這個 View
                .select('*')
                .limit(limit);
            
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('[Analytics]: Fetch Top Stocks Failed', e);
            return [];
        }
    }

    // 追蹤頁面造訪並取得總人數
    async function trackPageVisit() {
        if (!window.supabaseClient) return;
        try {
            // 1. 寫入造訪紀錄 (site_visits 表)
            // 我們可以使用 rpc 或是單純 insert
            // 為了簡便，我們先用單純的 insert 觸發計數
            const { error: insertError } = await window.supabaseClient
                .from('site_visits')
                .insert([{ user_agent: navigator.userAgent }]);
            
            if (insertError) console.warn('[Analytics]: Visit Record Failed', insertError);

            // 2. 取得總數並更新 UI
            const { count, error: countError } = await window.supabaseClient
                .from('site_visits')
                .select('*', { count: 'exact', head: true });
            
            if (!countError && count !== null) {
                const visitorEl = document.getElementById('totalVisitors');
                if (visitorEl) {
                    visitorEl.textContent = count.toLocaleString();
                    const container = document.getElementById('visitorCounterContainer');
                    if (container) container.classList.remove('hidden');
                }
            }
        } catch (e) {
            console.error('[Analytics]: trackPageVisit error', e);
        }
    }

    // 取得熱門持有排行
    async function fetchTopOwned(limit = 10) {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('top_owned_stocks')
                .select('*')
                .limit(limit);
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('[Analytics]: Fetch Top Owned Failed', e);
            return [];
        }
    }

    // 渲染排行榜 UI
    async function renderRankings() {
        const [hotData, ownedData] = await Promise.all([
            fetchTopStocks(5),
            fetchTopOwned(5)
        ]);

        const mkItem = (id, name, valueText) => {
            const item = document.createElement('div');
            item.className = 'ranking-item';
            item.innerHTML = `
                <div class="item-stock">${id}</div>
                <div class="item-name">${name || '—'}</div>
                <div class="item-value">${valueText}</div>
            `;
            item.onclick = () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = id;
                    searchInput.dispatchEvent(new Event('input'));
                    
                    // 捲動到表格控制區塊，而不是頁面頂端
                    const controls = document.querySelector('.controls');
                    if (controls) {
                        controls.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            };
            return item;
        };

        // 渲染 30日關注榜
        const hotList = document.getElementById('topHotList');
        if (hotList && hotData.length > 0) {
            hotList.innerHTML = '';
            hotData.forEach((d, i) => {
                hotList.appendChild(mkItem(d.stock_code, d.stock_name, `${d.click_count} 次點擊`));
            });
        } else if (hotList) {
            hotList.innerHTML = '<div class="ranking-item loading">暫無熱度數據</div>';
        }

        // 渲染 股東大戶榜
        const ownedList = document.getElementById('topOwnedList');
        if (ownedList && ownedData.length > 0) {
            ownedList.innerHTML = '';
            ownedData.forEach((d, i) => {
                // 從全域資料找名稱，或是直接用 ID
                const name = AppState?.globalData?.find(s => s.id === d.stock_id)?.name || d.stock_id;
                ownedList.appendChild(mkItem(d.stock_id, name, `${d.owner_count} 位持有`));
            });
        } else if (ownedList) {
            ownedList.innerHTML = '<div class="ranking-item loading">尚未有持有數據</div>';
        }
    }

    // 暴露至全域
    window.trackStockEvent = trackStockEvent;
    window.trackUIEvent = trackUIEvent;
    window.fetchTopStocks = fetchTopStocks;
    window.trackPageVisit = trackPageVisit;
    window.renderRankings = renderRankings;

    console.log('[Analytics]: 追蹤模組初始化完成');
    
    // 初始化時自動執行
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(async () => {
            await trackPageVisit();
            await renderRankings();
        }, 1500); 
    });
})();
