-- 年度股東會公告資料表
-- 用於存放各公司歷年來每一次發布的股東會紀念品細節
-- 允許一年多次發放 (常會/臨時會)

DROP TABLE IF EXISTS announcements CASCADE;

CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id        TEXT NOT NULL,          -- 股號, e.g. '2330'
    name            TEXT NOT NULL,          -- 公司名稱
    last_buy_date   DATE,                   -- 最後買進日
    meeting_date    DATE NOT NULL,          -- 股東會日期
    meeting_type    TEXT,                   -- 會議性質 (常會/臨時會)
    gift            TEXT,                   -- 股東會紀念品
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- 確保同一股票在同一天只有一筆會議紀錄
    UNIQUE(stock_id, meeting_date)                  
);

-- 設定 Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取公開的公告資料
CREATE POLICY "Public read announcements"
ON announcements FOR SELECT
TO anon, authenticated
USING (true);

-- 允許透過 API Key 進行資料上傳更新
CREATE POLICY "Enable all for upload announcements"
ON announcements FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
