-- ============================================================
-- 台股紀念品指南 - 收藏、持有與分析系統 (全案整合版)
-- 功能：1. 用戶收藏/持有資料 2. 股票熱度追蹤 3. 網站瀏覽人數
-- ============================================================

-- 1. 建立用戶股票關聯表 (收藏 & 持有)
CREATE TABLE IF NOT EXISTS user_stocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_id    TEXT NOT NULL,          -- 股號
    type        TEXT DEFAULT 'interest',-- 'interest' (收藏), 'purchased' (持有)
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, stock_id, type)
);

-- 設定 RLS 權限
ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stocks" ON user_stocks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public read user_stocks count" ON user_stocks FOR SELECT TO anon, authenticated USING (true);

-- 2. 建立股票點擊事件表 (熱度追蹤)
CREATE TABLE IF NOT EXISTS stock_events (
    id          BIGSERIAL PRIMARY KEY,
    stock_code  TEXT NOT NULL,
    stock_name  TEXT,
    event_type  TEXT DEFAULT 'view',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert events" ON stock_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public read events" ON stock_events FOR SELECT TO anon, authenticated USING (true);

-- 3. 建立「熱門收藏榜」視圖 (基於 user_stocks)
CREATE OR REPLACE VIEW top_interest_stocks AS
SELECT 
    stock_id, 
    COUNT(*) AS interest_count
FROM user_stocks
WHERE type = 'interest'
GROUP BY stock_id
ORDER BY interest_count DESC
LIMIT 50;

GRANT SELECT ON top_interest_stocks TO anon, authenticated;

-- 4. 建立「近 30 天熱度排行」視圖 (點擊率)
-- 修正欄位名稱與前端 ranking-ui.js 匹配
CREATE OR REPLACE VIEW top_stocks_30d AS
SELECT 
    stock_code AS stock_id, 
    stock_name, 
    COUNT(*) AS interest_count, -- 統一前端顯示為收藏/關注感
    MAX(created_at) AS last_seen
FROM stock_events 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY stock_code, stock_name 
ORDER BY interest_count DESC 
LIMIT 50;

GRANT SELECT ON top_stocks_30d TO anon, authenticated;

-- 5. 建立「熱門持有排行」視圖
CREATE OR REPLACE VIEW top_owned_stocks AS
SELECT 
    stock_id, 
    COUNT(*) AS owner_count
FROM user_stocks
WHERE type = 'purchased'
GROUP BY stock_id
ORDER BY owner_count DESC
LIMIT 50;

GRANT SELECT ON top_owned_stocks TO anon, authenticated;

-- 6. 網站瀏覽人數
CREATE TABLE IF NOT EXISTS site_visits (
    id          BIGSERIAL PRIMARY KEY,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert visits" ON site_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can count visits" ON site_visits FOR SELECT TO anon, authenticated USING (true);

-- 7. 索引優化
CREATE INDEX IF NOT EXISTS idx_stock_events_code ON stock_events(stock_code);
CREATE INDEX IF NOT EXISTS idx_user_stocks_id ON user_stocks(stock_id);
CREATE INDEX IF NOT EXISTS idx_user_stocks_uid ON user_stocks(user_id);
