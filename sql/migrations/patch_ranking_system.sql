-- ============================================================
-- 台股紀念品指南 - 排行榜系統補丁 (V4.7.2 數據口徑修正版 - 修正語法)
-- 目標：將「熱度榜」回歸為點擊次數，並確保前端顯示不報錯。
-- ============================================================

-- 1. 強化 user_stocks：增加 type 欄位以區分收藏(interest)與持有(purchased)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_stocks' AND column_name='type') THEN
        ALTER TABLE user_stocks ADD COLUMN type TEXT DEFAULT 'interest';
    END IF;
END $$;

-- 2. 修正「熱門收藏榜」(實際反映點擊熱度)
DROP VIEW IF EXISTS top_stocks_30d;
CREATE VIEW top_stocks_30d AS
SELECT 
    stock_code AS stock_id, 
    stock_name, 
    COUNT(*) AS interest_count, -- 保留別名以對接前端 UI
    MAX(created_at) AS last_seen
FROM stock_events 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY stock_code, stock_name 
ORDER BY interest_count DESC 
LIMIT 50;

GRANT SELECT ON top_stocks_30d TO anon, authenticated;

-- 3. 確保持有大戶榜維持現狀
DROP VIEW IF EXISTS top_owned_stocks;
CREATE VIEW top_owned_stocks AS
SELECT 
    stock_id, 
    COUNT(*) AS owner_count
FROM user_stocks
WHERE type = 'purchased'
GROUP BY stock_id
ORDER BY owner_count DESC
LIMIT 50;

GRANT SELECT ON top_owned_stocks TO anon, authenticated;

-- 4. 補強保安與索引
ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public count read') THEN
        CREATE POLICY "Public count read" ON user_stocks FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_stocks_type ON user_stocks(type);
CREATE INDEX IF NOT EXISTS idx_stock_events_code ON stock_events(stock_code);
