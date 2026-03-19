-- ============================================================
-- V4.11.0: 修復 user_stocks unique constraint
-- 問題：原本 UNIQUE(user_id, stock_id) 只允許一支股票一筆記錄
--       導致同一支股票同時標記「持有」+「感興趣」時 syncToCloud 回傳 409
-- 修復：改為 UNIQUE(user_id, stock_id, type)，允許兩種類型並存
-- ============================================================

-- 1. 移除舊的 unique constraint（只針對 user_id + stock_id）
ALTER TABLE user_stocks
    DROP CONSTRAINT IF EXISTS user_stocks_user_id_stock_id_key;

-- 2. 建立新的 unique constraint（user_id + stock_id + type）
ALTER TABLE user_stocks
    ADD CONSTRAINT user_stocks_user_id_stock_id_type_key
    UNIQUE (user_id, stock_id, type);

-- 3. 確認 type 欄位有 NOT NULL + DEFAULT，避免 NULL 讓 unique constraint 失效
ALTER TABLE user_stocks
    ALTER COLUMN type SET DEFAULT 'purchased',
    ALTER COLUMN type SET NOT NULL;

-- 4. 修正已存在的 NULL type 記錄（若有）
UPDATE user_stocks SET type = 'purchased' WHERE type IS NULL;
