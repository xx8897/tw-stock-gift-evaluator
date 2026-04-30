---
title: "一個活的產品"
subtitle: "零後端部署、增量更新、即時排名、倒數計時"
document_type: narrative
version: 2.0
language: zh-TW
deployment_stack:
  frontend: "GitHub Pages（靜態部署，零成本）"
  database: "Supabase（BaaS，免費方案）"
  auth: "Supabase Auth（Google OAuth + Email）"
  etl: "GitHub Actions（每週一三五，零成本）"
  knowledge_engine: "Flask 本地編輯器（開發時用）"
  backend_server: "無（面向使用者沒有後端伺服器）"
related_documents:
  - 07_BUILDER_HACKS.md
  - 08_REAL_LESSONS.md
tags: [deployment, live-product, zero-backend, github-actions, supabase]
---

# 一個活的產品

> 沒有 Kubernetes，沒有 Docker，沒有微服務。GitHub Pages + Supabase + GitHub Actions = 每月成本接近零。但有人真的每天在用它。

## 零後端部署

公開給使用者的架構：

```
使用者瀏覽器
    │
    ├── index.html（GitHub Pages 靜態部署）
    ├── 12+ JS 文件
    ├── 15+ CSS 文件
    ├── 6 個 HTML 組件
    │
    ├──→ Supabase（免費方案）
    │    ├── stocks 表（股價、紀念品、CP+、星級）
    │    ├── "2026" 表（當年度公告）
    │    ├── user_stocks 表（買入/關注）
    │    ├── stock_events 表（事件追蹤）
    │    ├── site_visits 表（訪客計數）
    │    └── 排名視圖（30天熱門、最多人買、最多人關注）
    │
    └──→ Google Analytics 4（流量分析）

         ↕（每週一三五 18:00 TST）
         
GitHub Actions
    │
    └── update_prices_finmind.py
         ├──→ FinMind API（股價數據）
         └──→ valuation_v5.py + tree.json（重新計算 CP+ 和星級）
              └──→ Supabase（upsert 更新結果）
```

**沒有面向使用者的後端伺服器。** 16 個 JS 文件、15 個 CSS 文件、6 個 HTML 組件——全部靜態部署在 GitHub Pages。Supabase 處理所有動態功能：資料庫、認證、即時同步。

## 增量更新：200 支輪流

`update-prices_finmind.py` 不是一次更新所有股票。它的策略是：

```python
# 1. Canary check：用台積電測試今天是交易日還是假日
tsmc_price = fetch_price("2330")
if tsmc_price is None:
    # 今天是假日，退出
    sys.exit(0)

# 2. 取 200 支最久沒更新的股票
stocks = fetch_oldest_updated(200)

# 3. 逐支更新
for stock in stocks:
    price = fetch_price(stock.id)
    cp = calc_v4_cp(five_year_total, price, frequency)
    score = calc_v4_score(cp, frequency, cond, odd_lot)
    upsert(stock)

    # 4. 隨機延遲 0.1-0.2 秒
    time.sleep(random.uniform(0.1, 0.2))
```

為什麼是 200 而不是全部？因為 FinMind API 有速率限制。每個工作日更新 200 支，5 個工作日就是 1,000 支，幾週就能輪流完所有股票。

為什麼要隨機延遲？因為 FinMind 會在短時間內大量請求時限流。

為什麼要用台積電做 Canary check？因為如果今天是國定假日，FinMind 不會有數據，跑 200 次 API 呼叫是浪費。

## 即時排名：SQL VIEW 而不是即時計算

排行榜不是每次有人訪問時都重新計算。Supabase 的 SQL VIEW：

```sql
-- 30 天熱門（基於 stock_events 點擊）
CREATE VIEW top_stocks_30d AS
SELECT s.stock_id, s.name, s.gift, s.cp, s.score,
       COUNT(e.id) as click_count
FROM stocks s
JOIN stock_events e ON s.stock_id = e.stock_id
WHERE e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.stock_id
ORDER BY click_count DESC
LIMIT 50;

-- 最多人買（基於 user_stocks type='purchased'）
CREATE VIEW top_owned_stocks AS
SELECT s.stock_id, s.name, ...
FROM stocks s
JOIN user_stocks us ON s.stock_id = us.stock_id
WHERE us.type = 'purchased'
GROUP BY s.stock_id
ORDER BY COUNT(us.id) DESC
LIMIT 50;
```

前端讀取 VIEW 而不是計算——排行榜的效能是 O(1)。

## 匿名追蹤：UUID 在 localStorage

不需要登入也能追蹤熱門股票。`analytics.js` 生成一個匿名 UUID：

```javascript
function getOrCreateVisitorId() {
    let id = localStorage.getItem('visitor_uuid');
    if (!id) {
        id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now();
        localStorage.setItem('visitor_uuid', id);
    }
    return id;
}
```

每次頁面載入，UUID 寫入 `site_visits` 表。每次點擊股票，UUID + stock_id 寫入 `stock_events` 表。

不完美——清除 localStorage 會生成新的 UUID，換裝置是新的 UUID。但對於零成本的近似統計來說，夠用了。

## 15 分鐘同步：Debounce 模式

使用者標記「買入」或「關注」時：

```
1. 立即寫入 localStorage（即時回應）
2. 排程 15 分鐘後同步到 Supabase（debounced）
3. 如果 15 分鐘內又操作，重置計時器
```

15 分鐘內的所有操作會被合併成一次 API 呼叫。這是 debounce 模式的經典應用——平衡資料即時性和 API 成本。

## 金絲雀檢查：先測是不是交易日

```python
# 用台積電（2330）測試今天是不是交易日
canary = fetch_price("2330")
if canary is None:
    print("今天是假日或休市，跳過更新")
    sys.exit(0)
```

不是先跑 200 次 API 再發現今天是假日，而是先用一個確定有數據的股票測試。如果台積電沒有數據，今天一定是假日。

## 產品的「活」在哪裡

這個工具不是一個靜態的展示頁面。它是一個每天有人用的產品：

- **每天**：股東會季節（3-6月），使用者每天查看最新公告
- **每週**：GitHub Actions 更新 200 支股票的股價和 CP+
- **即時**：排名、買入/關注、點擊追蹤
- **跨裝置**：登入後 Supabase 同步，不登入也能用 localStorage

沒有後端伺服器、沒有 Docker、沒有 Kubernetes。GitHub Pages + Supabase + GitHub Actions。每月成本接近零。但有人真的每天在用它決定要買哪支股票。