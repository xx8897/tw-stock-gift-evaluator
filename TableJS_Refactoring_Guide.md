# 🛠️ 專案優化實作藍圖 (v2 + PWA)

本指南提供給 Gemini Pro 作為實作參考。目標是在保持現有穩定效能的前提下，提升代碼的「可維護性」與「離線使用者體驗」。

---

## 🎯 任務一：Table.js 過濾邏輯優化 (配置分離)

目前 `js/table.js` 運行順暢，但「判斷票券/實體物品」的關鍵字與例外的「錦明」規則皆硬編碼於函式中。我們不需要改動核心的迴圈或渲染架構，只需將「數據與邏輯拆開」。

### 1. 建立設定檔 (`js/config.js`)
建立一個新檔案，集中管理所有過濾關鍵字：

```javascript
// js/config.js
const APP_CONFIG = {
    giftCategories: {
        ticket: {
            positive: ['券', '劵', '卡', '門票', '點數', '抵用金', '購物金', '拿鐵', '美式'],
            negative: ['卡套', '卡包', '卡夾', '夾', '撲克牌', '賀卡', '馬卡龍', '打卡', '微波', '保卡', '金屬', '金盞', '黃金', '馬克杯', '合金', '吸掛卡', '打卡板', '記憶卡', '卡片', '指甲剪', '口罩', '提籃'],
            mandatory: ['錦明股東專屬會員卡']
        },
        empty: ['-', '未發放', '不發放']
    }
};

window.APP_CONFIG = APP_CONFIG;
```

### 2. 重構比對邏輯 (`js/table.js`)
修改 `checkGiftTypeMatch` 函式，改為讀取 `APP_CONFIG`：

```javascript
// js/table.js (修改 checkGiftTypeMatch 函式)
function checkGiftTypeMatch(row, ticketOnly, objectOnly) {
    if (!ticketOnly && !objectOnly) return true;

    const giftText = String(row.gift || '');
    const config = APP_CONFIG.giftCategories;

    // 1. 特殊規則優先 (如：錦明)
    let isTicket = config.ticket.mandatory.some(kw => giftText.includes(kw));

    // 2. 一般規則：包含 ticket 關鍵字，且不包含排除關鍵字
    if (!isTicket) {
        const hasPos = config.ticket.positive.some(kw => giftText.includes(kw));
        const hasNeg = config.ticket.negative.some(kw => giftText.includes(kw));
        isTicket = hasPos && !hasNeg;
    }

    if (ticketOnly) return isTicket;
    
    if (objectOnly) {
        const isEmpty = !giftText || config.empty.some(kw => giftText.includes(kw));
        return !isTicket && !isEmpty;
    }
    
    return true;
}
```

### 3. 整合
確認在 `index.html` 中，`<script src="js/config.js"></script>` 被放置於 `table.js` 之前。

---

## 📱 任務二：PWA 與離線體驗支援 (Service Worker)

為了讓使用者能在地下鐵等無網路環境開啟此工具，我們將導入基本的 PWA 架構。

### 1. 網頁清單 (`manifest.json`)
在專案根目錄建立 `manifest.json`：
```json
{
  "name": "台股股東會紀念品攻略",
  "short_name": "紀念品攻略",
  "start_url": "/tw-stock-gift-evaluator/index.html",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#1e293b",
  "icons": [
    {
      "src": "./assets/favicon.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./assets/favicon.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. 背景快取 (`service-worker.js`)
在專案根目錄建立 `service-worker.js`，實作基礎的「Cache First」策略，快取核心的 JS、CSS 與 HTML。

*   **Install 階段**：快取 `index.html`, `js/*`, `css/*`, `assets/*`。
*   **Activate 階段**：清理舊版本快取。
*   **Fetch 階段**：攔截請求，優先從快取回傳，若無快取再去網路抓取。

### 3. 註冊服務與 Meta Tags (`index.html`)
*   在 `<head>` 加入 Apple 相容性標籤與 manifest 連結：
    ```html
    <link rel="manifest" href="./manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="紀念品攻略">
    ```
*   在 `main.js` 或 HTML 底部加入註冊腳本：
    ```javascript
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => console.log('ServiceWorker 註冊成功', reg.scope))
                .catch(err => console.error('ServiceWorker 註冊失敗', err));
        });
    }
    ```

---
> 本指南將重構聚焦於「高性價比 (CP值)」的改動，避免過度工程化，確保專案穩定前進。
