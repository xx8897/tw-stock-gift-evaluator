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
