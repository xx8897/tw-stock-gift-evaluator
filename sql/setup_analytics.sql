-- ============================================================
-- 台股紀念品指南 - 分析與追蹤系統設置
-- 功能：1. 股票熱度追蹤 2. 網站瀏覽人數 3. 熱門排行視圖
-- ============================================================

-- 1. 建立股票點擊事件表
CREATE TABLE IF NOT EXISTS stock_events (
    id          BIGSERIAL PRIMARY KEY,
    stock_code  TEXT NOT NULL,          -- 股票代號
    stock_name  TEXT,                   -- 股票名稱
    event_type  TEXT DEFAULT 'view',    -- 事件類型 (view, mark_purchased)
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 設定 RLS 權限
ALTER TABLE stock_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert events" ON stock_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can select all" ON stock_events FOR SELECT TO authenticated USING (true);

-- 2. 建立「近 30 天熱門排行」視圖
CREATE OR REPLACE VIEW top_stocks_30d AS
SELECT 
    stock_code, 
    stock_name, 
    COUNT(*) AS click_count, 
    MAX(created_at) AS last_seen
FROM stock_events 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY stock_code, stock_name 
ORDER BY click_count DESC 
LIMIT 50;

GRANT SELECT ON top_stocks_30d TO anon, authenticated;

-- ==========================================
-- 3. 熱門持有排行 (基於 user_stocks 表)
-- ==========================================
CREATE OR REPLACE VIEW top_owned_stocks AS
SELECT 
    stock_id, 
    COUNT(*) AS owner_count
FROM user_stocks
GROUP BY stock_id
ORDER BY owner_count DESC
LIMIT 50;

GRANT SELECT ON top_owned_stocks TO anon, authenticated;

-- ==========================================
-- 4. 總瀏覽人數追蹤
-- ==========================================
CREATE TABLE IF NOT EXISTS site_visits (
    id          BIGSERIAL PRIMARY KEY,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 設定 RLS 權限
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert visits" ON site_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can count visits" ON site_visits FOR SELECT TO anon, authenticated USING (true);

-- ==========================================
-- 5. 優化查詢索引
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_stock_events_code ON stock_events(stock_code);
CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_user_stocks_id ON user_stocks(stock_id);
