/**
 * 台股紀念品指南 - 數據分析與追蹤模組
 * 功能：整合 GA4 自訂事件與 Supabase 熱度追蹤
 */

(function() {
    // 用於防止重複點擊洗版 (冷卻時間機制)
    const eventCache = new Map();
    const COOLING_MS = 10000; // 10秒冷卻時間

    // 追蹤股票相關事件
    async function trackStockEvent(stockCode, stockName, eventType = 'view') {
        const now = Date.now();
        const cacheKey = `${eventType}_${stockCode}`;
        const lastTime = eventCache.get(cacheKey) || 0;

        // 如果在冷卻時間內重複觸發相同事件，則跳過
        if (now - lastTime < COOLING_MS) {
            console.debug(`[Analytics]: 事件已冷卻，跳過追蹤 (${cacheKey})`);
            return;
        }
        eventCache.set(cacheKey, now);

        const timestamp = new Date().toISOString();
        
        // 1. 發送至 GA4
        if (typeof gtag !== 'undefined') {
            const gaEventName = (eventType === 'mark_interest' || eventType === 'unmark_interest') 
                ? eventType 
                : `stock_${eventType}`;
            
            gtag('event', gaEventName, {
                'stock_code': stockCode,
                'stock_name': stockName,
                'timestamp': timestamp
            });
            console.log(`[Analytics]: GA4 Event -> ${gaEventName}`, stockCode);
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
        const now = Date.now();
        const cacheKey = `ui_${action}_${label}`;
        const lastTime = eventCache.get(cacheKey) || 0;

        if (now - lastTime < 5000) return; // UI 動作 5 秒冷卻
        eventCache.set(cacheKey, now);

        if (typeof gtag !== 'undefined') {
            gtag('event', 'ui_interaction', {
                'action': action,
                'label': label
            });
            console.log(`[Analytics]: GA4 UI Event -> ${action}`, label);
        }
    }


    // 取得頁面造訪總數並更新 UI (trackPageVisit 留在此供 ranking-ui.js 呼叫)
    async function trackPageVisit() {
        if (!window.supabaseClient) return;
        try {
            const { error: insertError } = await window.supabaseClient
                .from('site_visits')
                .insert([{ user_agent: navigator.userAgent }]);
            if (insertError) console.warn('[Analytics]: Visit Record Failed', insertError);

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

    // 暴露至全域
    window.trackStockEvent = trackStockEvent;
    window.trackUIEvent = trackUIEvent;
    window.trackPageVisit = trackPageVisit;

    console.log('[Analytics]: 追蹤模組初始化完成');
})();
