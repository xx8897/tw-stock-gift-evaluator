-- ============================================================
-- 台股紀念品指南 - 同步系統權限與架構終極修復 (V4.10.0)
-- 目標：確保 user_stocks 具備完整欄位、自動 ID 與正確權限
-- ============================================================

-- 1. 確保 type 欄位存在 (關鍵修復)
ALTER TABLE user_stocks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'purchased';

-- 2. 確保 id 欄位具備自動生成功能，避免 insert 失敗
-- 如果原本沒有預設值，這裡補上
ALTER TABLE user_stocks ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. 確保 RLS (行級安全控制) 權限開放，讓使用者能增刪查改自己的資料
ALTER TABLE user_stocks ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策以避免衝突
DROP POLICY IF EXISTS "Users can manage their own stocks" ON user_stocks;

-- 建立新政策：使用者只能操作自己的 stock_id 與 type
CREATE POLICY "Users can manage their own stocks" ON user_stocks
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. 再次確認 top_stocks_30d 視圖權限
GRANT SELECT ON top_stocks_30d TO anon, authenticated;

-- 5. 再次確認 site_visits 權限 (訪客計數用)
GRANT INSERT ON site_visits TO anon, authenticated;
GRANT SELECT ON site_visits TO anon, authenticated;
