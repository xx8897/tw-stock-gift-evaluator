/**
 * 台股紀念品指南 - 排行榜 UI 模組
 * 功能：Supabase 資料獲取、排行榜渲染、彈窗控制
 * 依賴：analytics.js (trackPageVisit), supabase-config.js
 */

(function() {
    // ── 通用 Supabase 視圖查詢（共用邏輯） ──────────────────────
    async function fetchFromView(viewName, limit = 10) {
        if (!window.supabaseClient) {
            console.warn(`[RankingUI]: supabaseClient 未就緒`);
            return [];
        }
        try {
            const { data, error } = await window.supabaseClient
                .from(viewName)
                .select('*')
                .limit(limit);
            if (error) throw error;
            return data;
        } catch (e) {
            console.error(`[RankingUI]: Fetch ${viewName} Failed`, e);
            return [];
        }
    }

    // 取得熱門股票排行 (30日點擊)
    async function fetchTopStocks(limit = 10) {
        return fetchFromView('top_stocks_30d', limit);
    }

    // 取得熱門持有排行
    async function fetchTopOwned(limit = 10) {
        return fetchFromView('top_owned_stocks', limit);
    }

    // 渲染首頁排行榜 UI
    async function renderRankings() {
        console.log('[RankingUI]: 開始獲取排行榜數據...');
        try {
            const [hotData, ownedData] = await Promise.all([
                fetchTopStocks(5),
                fetchTopOwned(5)
            ]);
            console.log('[RankingUI]: 數據獲取完成', { hotData, ownedData });

            const mkItem = (id, name, valueText, trendHtml = '') => {
                const item = document.createElement('div');
                item.className = 'ranking-item';
                // 如果名稱暫時找不到，且 AppState 已就緒，嘗試再次尋找
                let displayName = name;
                if ((!displayName || displayName === id) && typeof AppState !== 'undefined' && AppState?.globalData?.length) {
                    displayName = AppState.globalData.find(s => s.id === id)?.name || id;
                }

                item.innerHTML = `
                    <div class="item-stock">${id}</div>
                    <div class="item-name">${displayName || '—'}</div>
                    <div class="item-value" style="font-size: 0.75rem; opacity: 0.7;">${valueText}${trendHtml}</div>
                `;
                item.onclick = () => {
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = id;
                        searchInput.dispatchEvent(new Event('input'));
                        const controls = document.querySelector('.controls');
                        if (controls) controls.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                };
                return item;
            };

            // 渲染 30日關注榜
            const hotList = document.getElementById('topHotList');
            if (hotList) {
                if (hotData && hotData.length > 0) {
                    hotList.innerHTML = '';
                    hotData.forEach(d => {
                        const name = (typeof AppState !== 'undefined' && AppState?.globalData) 
                            ? AppState.globalData.find(s => s.id === d.stock_id)?.name 
                            : d.stock_id;
                        const trend = d.recent_count > 0 
                            ? `<span class="trend-badge trend-up">↑${d.recent_count}</span>` 
                            : '';
                        hotList.appendChild(mkItem(d.stock_id, name || d.stock_id, `${d.interest_count} 人收藏`, trend));
                    });
                } else {
                    hotList.innerHTML = '<div class="ranking-item loading">暫無熱度數據</div>';
                }
            }

            // 渲染股東大戶榜
            const ownedList = document.getElementById('topOwnedList');
            if (ownedList) {
                if (ownedData && ownedData.length > 0) {
                    ownedList.innerHTML = '';
                    ownedData.forEach(d => {
                        const name = (typeof AppState !== 'undefined' && AppState?.globalData) 
                            ? AppState.globalData.find(s => s.id === d.stock_id)?.name 
                            : d.stock_id;
                        ownedList.appendChild(mkItem(d.stock_id, name || d.stock_id, `${d.owner_count} 位持有`));
                    });
                } else {
                    ownedList.innerHTML = '<div class="ranking-item loading">尚未有持有數據</div>';
                }
            }
        } catch (error) {
            console.error('[RankingUI]: renderRankings 發生異常', error);
        }
    }

    // 開啟排行彈窗
    async function openRankingModal(type) {
        const modal = document.getElementById('rankingModal');
        const title = document.getElementById('rankingModalTitle');
        const desc = document.getElementById('rankingModalDesc');
        const body = document.getElementById('rankingModalBody');
        if (!modal || !body) return;

        modal.classList.remove('hidden');
        body.innerHTML = '<div class="ranking-item loading">資料載入中...</div>';

        if (type === 'hot') {
            title.innerText = '⭐ 收藏熱度榜 Top 50';
            if (desc) desc.innerText = '所有來源的唯一收藏人數（含會員＋訪客），↑ 為近 30 天新增';
            const data = await fetchTopStocks(50);
            renderModalList(data, 'hot');
        } else {
            title.innerText = '💎 資深小資選 Top 50';
            if (desc) desc.innerText = '註冊會員將該股票設定為「已持有」的總人數進行排行';
            const data = await fetchTopOwned(50);
            renderModalList(data, 'owned');
        }
    }

    function closeRankingModal() {
        const modal = document.getElementById('rankingModal');
        if (modal) modal.classList.add('hidden');
    }

    // 渲染彈窗清單
    function renderModalList(data, type) {
        const body = document.getElementById('rankingModalBody');
        if (!body) return;

        if (!data || data.length === 0) {
            body.innerHTML = '<div class="ranking-item loading">暫無排名資料</div>';
            return;
        }

        body.innerHTML = '';
        data.forEach((d, i) => {
            const id = d.stock_id || d.stock_code;
            const name = (typeof AppState !== 'undefined' && AppState?.globalData)
                ? AppState.globalData.find(s => s.id === id)?.name
                : (d.stock_name || id);
            const trendHtml = (type === 'hot' && d.recent_count > 0) 
                ? `<span class="trend-badge trend-up">↑${d.recent_count}</span>` 
                : '';
            const valueText = type === 'hot' 
                ? `${d.interest_count} 人收藏${trendHtml}` 
                : `${d.owner_count} 位持有`;

            const item = document.createElement('div');
            item.className = 'ranking-item';
            item.innerHTML = `
                <div class="rank-num">${i + 1}</div>
                <div class="item-stock">${id}</div>
                <div class="item-name">${name || '—'}</div>
                <div class="item-value">${valueText}</div>
            `;
            item.onclick = () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = id;
                    searchInput.dispatchEvent(new Event('input'));
                    const controls = document.querySelector('.controls');
                    if (controls) controls.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                closeRankingModal();
            };
            body.appendChild(item);
        });
    }

    // 初始化排行榜
    async function initRankingUI() {
        console.log('[RankingUI]: 開始初始化排行榜...');
        if (typeof trackPageVisit === 'function') {
            // Don't block rankings on analytics/network latency.
            trackPageVisit().catch(err => {
                console.warn('[RankingUI]: trackPageVisit failed', err);
            });
        }
        await renderRankings();
        
        // 點擊外部關閉排行彈窗
        const modal = document.getElementById('rankingModal');
        if (modal) {
            modal.addEventListener('click', e => {
                if (e.target === modal) closeRankingModal();
            });
        }
        console.log('[RankingUI]: 排行榜初始化完成');
    }

    // 暴露至全域
    window.openRankingModal = openRankingModal;
    window.closeRankingModal = closeRankingModal;
    window.renderRankings = renderRankings;
    window.fetchTopStocks = fetchTopStocks;
    window.initRankingUI = initRankingUI;

    console.log('[RankingUI]: 排行榜模組加載完成');
})();
