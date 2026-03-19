-- 1. [原熱度榜修正]：真正基於「收藏動作」的熱度排行
-- 同時計入最近 30 天內訪客的「點擊星號」動作與成員的「持久收藏」狀態
DROP VIEW IF EXISTS top_stocks_30d;
CREATE VIEW top_stocks_30d AS
WITH event_counts AS (
    -- 訪客最近 30 天的收藏動作 (排除純瀏覽)
    SELECT stock_code AS stock_id, COUNT(*) AS event_count
    FROM stock_events
    WHERE event_type = 'mark_interest' AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY stock_code
),
user_stock_counts AS (
    -- 成員目前持久保存的收藏狀態 (唯一人數)
    SELECT stock_id, COUNT(DISTINCT user_id) AS user_count
    FROM user_stocks
    WHERE type = 'interest'
    GROUP BY stock_id
)
SELECT 
    COALESCE(e.stock_id, u.stock_id) AS stock_id,
    (COALESCE(e.event_count, 0) + COALESCE(u.user_count, 0)) AS interest_count
FROM event_counts e
FULL OUTER JOIN user_stock_counts u ON e.stock_id = u.stock_id
ORDER BY interest_count DESC
LIMIT 50;

GRANT SELECT ON top_stocks_30d TO anon, authenticated;
