-- 台股紀念品評估 - stocks 主資料表
-- 在 Supabase SQL Editor 執行此腳本

CREATE TABLE IF NOT EXISTS stocks (
    stock_id        TEXT PRIMARY KEY,       -- 股號, e.g. '2330'
    name            TEXT NOT NULL,          -- 公司名稱
    price           NUMERIC(10, 2),         -- 最新股價
    gift            TEXT,                   -- 上次紀念品
    freq            SMALLINT,               -- 五年內發放次數
    cp              NUMERIC(8, 4),          -- 新版性價比
    score           TEXT,                   -- 新版推薦評分 e.g. '5 星'
    five_year_gifts TEXT,                   -- 五年發放紀念品 (含換行)
    cond            TEXT,                   -- 去年條件
    gift_value      NUMERIC(10, 2),         -- 紀念品預估價值
    five_year_total NUMERIC(10, 2),         -- 五年紀念品總估值
    last_issued     TEXT,                   -- 最近一次發放 (年份)
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 所有人可以讀取股票資料（公開資料）
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stocks"
ON stocks FOR SELECT
TO anon, authenticated
USING (true);

-- anon key 可以寫入（供 upload_stocks.py 上傳使用）
CREATE POLICY "Anon can insert"
ON stocks FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can update"
ON stocks FOR UPDATE
TO anon
USING (true);
