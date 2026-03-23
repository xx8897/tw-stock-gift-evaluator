-- 2026 年度股東會資料表
-- 取代 announcements 表，新增條件欄位，移除會議性質

DROP TABLE IF EXISTS "2026" CASCADE;

CREATE TABLE "2026" (
    stock_id      TEXT        NOT NULL,           -- 股號, e.g. '2330'
    name          TEXT        NOT NULL,           -- 公司名稱
    last_buy_date DATE,                           -- 最後買進日
    meeting_date  DATE        NOT NULL,           -- 股東會日期
    gift          TEXT,                           -- 股東會紀念品
    cond          TEXT,                           -- 領取條件
    updated_at    TIMESTAMPTZ DEFAULT NOW(),      -- 更新時間

    -- 同一股票在同一天只有一筆
    PRIMARY KEY (stock_id, meeting_date)
);

-- 設定 Row Level Security (RLS)
ALTER TABLE "2026" ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取
CREATE POLICY "Public read 2026"
ON "2026" FOR SELECT
TO anon, authenticated
USING (true);

-- 允許透過 API Key 進行資料上傳更新
CREATE POLICY "Enable all for upload 2026"
ON "2026" FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
