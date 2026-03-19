-- ============================================================
-- 台股紀念品指南 - 數據分析系統升級 (V4.9.0)
-- 目標：達成「真．感興趣人數」演算，區分底蘊與爆發力
-- ============================================================

-- 1. [架構升級]：為事件表增加唯一辨識，以計算「訪客數」而非「點擊次數」
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_events' AND column_name='visitor_id') THEN
        ALTER TABLE stock_events ADD COLUMN visitor_id TEXT;
    END IF;
END $$;

-- 2. [演算升級]：重新定義收藏熱度榜
-- 演算法：總收藏人數 (底蘊) + 30天內感興趣的人數 (爆發力)
-- 這裡的人數包含登入會員的持久狀態與訪客的即時動作。
DROP VIEW IF EXISTS top_stocks_30d;
CREATE VIEW top_stocks_30d AS
WITH 
all_time_users AS (
    -- 所有時間的唯一收藏會員
    SELECT stock_id, COUNT(DISTINCT user_id) as total_member_count
    FROM user_stocks
    WHERE type = 'interest'
    GROUP BY stock_id
),
recent_people AS (
    -- 最近 30 天的「感興趣」人數 (會員與訪客合計)
    SELECT stock_id, COUNT(DISTINCT person_id) as recent_person_count
    FROM (
        -- 會員在 30 天內的狀態
        SELECT stock_id, user_id::text as person_id
        FROM user_stocks
        WHERE type = 'interest' AND created_at >= NOW() - INTERVAL '30 days'
        UNION
        -- 訪客在 30 天內的動作 (點星號)
        SELECT stock_code as stock_id, visitor_id as person_id
        FROM stock_events
        WHERE event_type = 'mark_interest' AND created_at >= NOW() - INTERVAL '30 days' AND visitor_id IS NOT NULL
    ) raw_people
    GROUP BY stock_id
)
SELECT 
    COALESCE(at.stock_id, rp.stock_id) as stock_id,
    (COALESCE(at.total_member_count, 0) + COALESCE(rp.recent_person_count, 0)) as interest_count
FROM all_time_users at
FULL OUTER JOIN recent_people rp ON at.stock_id = rp.stock_id
ORDER BY interest_count DESC
LIMIT 50;

GRANT SELECT ON top_stocks_30d TO anon, authenticated;

-- 3. 補強欄位索引
CREATE INDEX IF NOT EXISTS idx_stock_events_visitor ON stock_events(visitor_id);
