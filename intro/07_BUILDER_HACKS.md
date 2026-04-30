---
title: "建造者的 Hack"
subtitle: "金絲雀檢查、15 分鐘同步、7.2 秒載入、匿名 UUID"
document_type: narrative
version: 2.0
language: zh-TW
hacks:
  - name: "金絲雀檢查"
    problem: "假日跑 200 次 API 呼叫是浪費"
    solution: "先用台積電測試今天是交易日還是假日"
  - name: "15 分鐘 debounce 同步"
    problem: "每次點擊都呼叫 Supabase 太頻繁"
    solution: "localStorage 即時回應，debounce 15 分鐘後合併同步"
  - name: "7.2 秒載入動畫"
    problem: "Supabase 冷啟動需要 5-7 秒"
    solution: "用毛玻璃載入畫面遮罩等待時間"
  - name: "匿名 UUID 追蹤"
    problem: "不想強制登入，但需要統計"
    solution: "localStorage 生成 UUID，每次訪問寫入 site_visits"
  - name: "200 支輪流更新"
    problem: "免費 API 速率限制"
    solution: "每個工作日更新最久沒更新的 200 支"
  - name: "隨機延遲 0.1-0.2 秒"
    problem: "FinMind 短時間大量請求會限流"
    solution: "每次 API 呼叫後隨機 sleep"
  - name: "regex 剝離年份"
    problem: "\"2024 200元禮物卡\" 中 2024 的 20 會匹配到 20元"
    solution: "DFS 前先剝離年份前綴"
  - name: "五個分隔符拆分複合禮物"
    problem: "一個紀念品可能是 \"碗+杯子500ml&面紙\""
    solution: "re.split(r'[+&與和及]', gift_name)"
related_documents:
  - 03_LIVE_PRODUCT.md
  - 02_TREE_DEEP_DIVE.md
tags: [hacks, canary, debounce, loading, uuid, builder]
---

# 建造者的 Hack

> 這些不是架構決策。這些是在真實使用中遇到的問題，用最簡單的方法解決。

## 金絲雀檢查

**問題**：GitHub Actions 每週一三五 18:00 執行。如果遇到國定假日或週末補班，FinMind 沒有數據。跑 200 次 API 呼叫拿到 200 個 null，是浪費。

**解法**：

```python
# update_prices_finmind.py
canary = fetch_price("2330")  # 台積電確定有數據的股票
if canary is None:
    print("市場休市，跳過更新")
    sys.exit(0)
```

一個 API 呼叫，確認今天是不是交易日。不是先跑 200 次再發現是假日。用確定有數據的股票（台積電，台股流動性最高）做 Canary check。

**為什麼叫金絲雀**：煤礦工人帶金絲雀下礦坑，金絲雀先死，礦工就知道有毒氣。台積電就是金絲雀——它先測試，其他股票才開始更新。

## 15 分鐘 Debounce 同步

**問題**：使用者標記「買入」或「關注」時，如果每次點擊都呼叫 Supabase，10 次點擊 = 10 次 API 呼叫。免費方案的 API 限額很快就用完。

**解法**：

```javascript
// sync.js
let syncTimer = null;

function scheduleSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        syncToSupabase();
    }, 15 * 60 * 1000); // 15 分鐘
}
```

每次操作先寫入 localStorage（即時回應，零延遲），然後排程 15 分鐘後同步到 Supabase。15 分鐘內的操作會重置計時器——debounce 模式。最終效果：不管使用者點了多少次，15 分鐘的靜默期後才同步一次。

**頁面離開時的保險**：

```javascript
window.addEventListener('beforeunload', () => {
    if (syncTimer) {
        clearTimeout(syncTimer);
        syncToSupabase(); // 立即同步
    }
});
```

使用者關閉頁面時，如果還有未同步的操作，立即同步。不會丟失資料。

## 7.2 秒載入動畫

**問題**：Supabase 免費方案的第一個請求需要 5-7 秒冷啟動。第一個使用者看到的是空白頁面。

**解法**：7.2 秒的毛玻璃載入動畫。不是 UX 妝飾，是真實等待時間的遮罩。

為什麼是 7.2 不是 7.0？因為 7.2 秒不是四捨五入的數字，看起來像經過測試的精確值（雖然其實就是保守估計加一點 buffer）。

載入動畫的內容：

```html
<div class="loading-screen">
    <div class="loading-content">
        <div class="loading-logo"><!-- 漸層旋轉的毛玻璃圓形 --></div>
        <p>正在載入市場數據...</p>
        <div class="loading-bar"><!-- 進度條 --></div>
    </div>
</div>
```

漸層旋轉 + 進度條 + 提示文字。三個元素讓等待時間感覺更短。

## 匿名 UUID 追蹤

**問題**：想知道有多少人用、哪些股票最受歡迎。但不想強制登入——強制登入會趕走 80% 的訪客。

**解法**：

```javascript
// analytics.js
function getOrCreateVisitorId() {
    let id = localStorage.getItem('visitor_uuid');
    if (!id) {
        id = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('visitor_uuid', id);
    }
    return id;
}
```

每個首次訪問的使用者得到一個隨機 UUID，存在 localStorage。每次頁面載入，UUID 寫入 `site_visits` 表。每次股票被點擊，UUID + stock_id 寫入 `stock_events` 表。

**不完美**：清除 localStorage 會生成新 UUID。換裝置是新的 UUID。同一個人用兩個瀏覽器會被算成兩個訪客。

**夠用**：對於零成本的近似統計來說，這些誤差可以接受。不需要 100% 準確，只需要知道大方向——哪支股票最多人看、每天有多少訪客。

## 200 支輪流更新

**問題**：FinMind API 每次請求間隔至少 0.1 秒，1,600 支股票 = 160 秒 + 處理時間。GitHub Actions 有 6 分鐘超時限制。

**解法**：

```python
stocks = fetch_oldest_updated(200)  # 取最久沒更新的 200 支
for stock in stocks:
    update_single_stock(stock)
    time.sleep(random.uniform(0.1, 0.2))  # 隨機延遲
```

每次只更新 200 支。不是固定 200 支，是「最久沒更新的 200 支」。5 個工作日 × 200 支 = 1,000 支，大約兩週輪流完所有股票。

**為什麼隨機延遲而不是固定延遲**：FinMind 的限流算法可能偵測到固定間隔的請求模式。隨機延遲（0.1-0.2 秒）讓請求看起來更不像自動化腳本。

## 正則剝離年份

**問題**：五年紀錄的格式是 `(2024) 200元禮物卡`。不剝離年份的話，`2024` 裡的 `20` 會匹配到「20元禮物卡」節點。

**解法**：

```python
# 在 DFS 搜尋之前先剝離年份前綴
item_name = re.sub(r'^\(?\d{4}\)?', '', item_name.strip())
# "(2024) 200元禮物卡" → "200元禮物卡"
```

一行正則，解決一個微妙的 bug。如果沒有這行，「2024年全聯200元禮物卡」會先匹配到「20元禮物卡」，因為 `20` 出現在 `200` 前面。DFS 找最深匹配，但如果 `2024` 裡的 `20` 先匹配到了，結果就錯了。

## 五個分隔符拆分複合禮物

**問題**：台灣股東會紀念品經常是複合的：「不鏽鋼碗+保溫杯500ml&衛生紙」。

**解法**：

```python
parts = re.split(r'[+&與和及]', item_name)
# "不鏽鋼碗+保溫杯500ml&衛生紙" → ["不鏽鋼碗", "保溫杯500ml", "衛生紙"]
```

五個分隔符：`+`、`&`、`與`、`和`、`及`。每個部分獨立 DFS 搜尋，估值加總，代領成本只扣一次。

為什麼是這五個？因為這是台灣股東會紀念品的常見寫法。不是英文的 `and`，不是日文的 `と`，是中文的「與」、「和」、「及」，加上符號 `+` 和 `&`。

## 這些 Hack 的共同特徵

1. **問題是真實的**：每個 hack 都是因為真實使用中遇到了問題
2. **解法是最簡的**：金絲雀檢查是一行 if、15 分鐘 debounce 是 setTimeout、7.2 秒是 CSS animation-delay
3. **不是預先設計的**：這些 hack 是在開發和使用過程中長出來的，不是一開始就規劃好的
4. **都有權衡**：匿名 UUID 不完美但夠用、200 支不即時但可接受、7.2 秒等待但體驗更好