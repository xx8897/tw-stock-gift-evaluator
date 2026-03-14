-- 台股紀念品評估 - stocks 主資料表 (V2 完全重寫版)
-- 注意：執行此腳本會刪除舊有的 stocks 資料表並重建所有欄位！

-- 1. 重設資料表 (完全重寫)
DROP TABLE IF EXISTS stocks CASCADE;

-- 2. 建立 V2 架構資料表
CREATE TABLE stocks (
    stock_id        TEXT PRIMARY KEY,       -- 股號, e.g. '2330'
    name            TEXT NOT NULL,          -- 公司名稱
    price           NUMERIC(10, 2),         -- 最近股價
    gift            TEXT,                   -- 上次紀念品
    freq            SMALLINT,               -- 五年內發放次數
    last_issued     TEXT,                   -- 最近一次發放 (年份)
    five_year_total NUMERIC(10, 2),         -- 五年紀念品總估值 (取代舊版 gift_value)
    cp              NUMERIC(8, 2),          -- 新版性價比
    score           TEXT,                   -- 新版推薦評分 e.g. '5 星'
    cond            TEXT,                   -- 去年條件
    five_year_gifts TEXT,                   -- 五年發放紀念品清單
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 設定 Row Level Security (RLS)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取股票資料（公開資料）
CREATE POLICY "Public read stocks"
ON stocks FOR SELECT
TO anon, authenticated
USING (true);

-- 允許 anon/authenticated 或透過 API Key 進行資料更新 (供上傳腳本使用)
CREATE POLICY "Enable all for upload"
ON stocks FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 註釋：
-- ALTER TABLE stocks DROP COLUMN IF EXISTS gift_value; -- 這是 SQL 移除欄位的寫法
-- 但為了確保架構乾淨，我們採用上述 DROP 並重新 CREATE 的「完全重寫」方案。
