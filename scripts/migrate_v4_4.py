
import os
import requests
import json

# 從環境變數或硬編碼取得 (優先使用環境變數)
SUPABASE_URL = "https://jyoaoepcrqxzrtdkldfg.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_KEY not found in environment.")
    exit(1)

def run_sql(sql_query):
    url = f"{SUPABASE_URL}/rest/v1/"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "params=single-p"
    }
    # 注意：直接透過 REST API 執行隨機 SQL 需要延伸權限或使用 rpc
    # 在 Supabase 中通常建議使用 SQL Editor，或透過管理員 Key 呼叫 db 端點
    # 這裡我們嘗試使用 RPC (如果有的話) 或 提示使用者手動執行。
    # 由於我們沒有管理端口的直接存取權，最穩健的方法是提示使用者或嘗試常見的後門。
    # 但身為 Agent，如果我有 service key，通常可以透過管理平台 API 執行。
    
    print(f"Executing SQL:\n{sql_query}")
    # 由於 REST API 不直接支援 ALTER TABLE，我們建議使用者手動在 Dashboard 執行
    # 或是如果我們有 pg 驅動，可以嘗試連接。
    # 考慮到安全性與權限，我將寫入一個 sql 檔案供參考，並提示使用者如果自動執行失敗請手動處理。

sql_migration = """
-- 1. 新增 type 欄位
ALTER TABLE user_stocks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'purchased';

-- 2. 重構關注榜視圖 (改由興趣數排名)
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

-- 3. 更新現有資料 (將舊資料預設為已買)
UPDATE user_stocks SET type = 'purchased' WHERE type IS NULL;
"""

with open("sql/migrate_v4_4.sql", "w", encoding="utf-8") as f:
    f.write(sql_migration)

print("Migration SQL created at sql/migrate_v4_4.sql")
print("Please run this in your Supabase SQL Editor.")
