-- ============================================================
-- V4.12.0: 修復收藏熱度榜人數重複計算
-- 問題：舊版 all_time_users + recent_people 會對 30 天內的會員重複計算
-- 修復：用 UNION 去重計算唯一人數，另外提供近 30 天增量供前端顯示趨勢
-- ============================================================

DROP VIEW IF EXISTS top_stocks_30d;

CREATE VIEW top_stocks_30d AS
WITH
-- 合併所有來源的收藏人（UNION 自動去重）
all_people AS (
    -- 會員的持久收藏
    SELECT stock_id, user_id::text AS person_id, created_at
    FROM user_stocks
    WHERE type = 'interest'
    UNION
    -- 訪客的點擊收藏
    SELECT stock_code AS stock_id, visitor_id AS person_id, created_at
    FROM stock_events
    WHERE event_type = 'mark_interest' AND visitor_id IS NOT NULL
),
-- 總人數（唯一）
total AS (
    SELECT stock_id, COUNT(DISTINCT person_id) AS interest_count
    FROM all_people
    GROUP BY stock_id
),
-- 近 30 天新增人數
recent AS (
    SELECT stock_id, COUNT(DISTINCT person_id) AS recent_count
    FROM all_people
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY stock_id
)
SELECT
    t.stock_id,
    t.interest_count,
    COALESCE(r.recent_count, 0) AS recent_count
FROM total t
LEFT JOIN recent r ON t.stock_id = r.stock_id
ORDER BY t.interest_count DESC, r.recent_count DESC
LIMIT 50;

GRANT SELECT ON top_stocks_30d TO anon, authenticated;
