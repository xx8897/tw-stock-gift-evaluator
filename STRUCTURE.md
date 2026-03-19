# 📂 專案目錄結構說明 (v4.18)

> 本文件描述本專案的完整目錄結構與各檔案用途。

```
台股文件/
│
├── index.html                  # 網站主頁面（骨架頁面，透過 JS 動態載入組件）
├── README.md                   # 專案說明文件
├── STRUCTURE.md                # 專案目錄結構說明（本文件）
├── LICENSE                     # 版權授權聲明
├── .gitignore                  # Git 忽略清單
├── .secret                     # 金鑰設定檔
│
├── .venv/                      # 🐍 Python 虛擬環境
│
├── components/                 # 🧱 HTML 組件片段 (由 components-loader.js 載入)
│   ├── auth-modal.html         # 驗證彈窗結構
│   ├── info-modals.html        # 評估說明與贊助說明彈窗
│   ├── feedback-modal.html     # 意見回饋表單
│   ├── ranking-modal.html      # 完整排行榜彈窗
│   ├── nickname-modal.html     # 修改暱稱彈窗
│   └── footer.html             # 頁尾免責聲明與版權資訊
│
├── docs/                       # 📖 專案文件與教學
│   ├── ai_agent_customization_guide.md 
│   ├── google_oauth_setup_guide.md
│   └── uuid_versions_guide.md
│
├── data/                       # 📊 資料檔案目錄
│   ├── 2021-2025_推薦評分.xlsx
│   └── 2021-2025_年年發放.xlsx
│
├── css/                        # 🎨 樣式表模組
│   ├── variables.css           # CSS 變數設計 token
│   ├── base.css                # 全域基礎樣式
│   ├── layout.css              # 頁面大框架佈局
│   ├── components.css          # 組件樣式入口 (匯入 components/*.css)
│   ├── components/             # 🧩 細分組件樣式
│   │   ├── table.css           # 表格核心樣式與 RWD 轉卡片邏輯
│   │   ├── buttons.css         # 各類按鈕、Glassmorphism 樣式
│   │   ├── badges.css          # 標籤、星級、狀態徽章
│   │   ├── sections.css        # 區塊容器、導引文案樣式
│   │   ├── user-menu.css       # 使用者選單與頭像
│   │   └── history-popup.css   # 歷史贈品彈窗樣式
│   ├── modal.css               # 彈窗殼體通用樣式
│   ├── auth.css                # 驗證系統專用樣式
│   ├── ranking.css             # 排行榜清單樣式
│   └── utilities.css           # 動畫與通用類別
│
├── js/                         # ⚙️ JavaScript 模組
│   ├── main.js                 # 程式進入點 (協調初始化順序)
│   ├── data.js                 # 資料層：全域狀態與資料載入
│   ├── table.js                # 表格層：渲染邏輯與動態 DOM 生成
│   ├── components-loader.js    # 載入層：異步 fetch HTML 片段並注入
│   ├── ui.js                   # 介面入口：匯入並執行 ui/*.js 事件初始化
│   ├── ui/                     # 🖱️ 細分介面事件處理
│   │   ├── modals.js           # 彈窗開關、全域點擊事件
│   │   ├── filters.js          # 搜尋、星級、多種過濾器邏輯
│   │   └── table-events.js     # 表格排序、分頁、特效觸發
│   ├── ranking-ui.js           # 排行層邏輯
│   ├── analytics.js            # GA4 追蹤埋點
│   ├── sync.js                 # 資料同步決策
│   ├── export.js               # CSV 持有清單匯出邏輯
│   ├── feedback-modal.js       # 回饋表單控制
│   ├── auth/                   # 🔐 模組化驗證系統
│   │   ├── auth-state.js       
│   │   ├── auth-ui.js          
│   │   ├── auth-api.js         
│   │   └── auth-utils.js       
│   └── auth.js                 # 驗證總控制器
│
├── assets/                     # 🖼️ 靜態資源
│
├── scripts/                    # 🐍 工具腳本與雲端整合模組
│   ├── core/                   # 核心邏輯腳本（如 update_prices_finmind.py 每日股價爬取）
│   ├── utils/                  # 工具類腳本（檢測 DB Scheme、取得環境變數等）
│   └── archive/                # 📦 歷史與封存區
│       ├── debug/              # 測試與偵錯專區（從根目錄移入）
│       └── tests/              # 歷史單元測試與 API 測試腳本
│
├── sql/                        # 🗄️ Supabase 資料庫規劃與部署
│   ├── migrations/             # 歷史修補檔與特定版本升級腳本
│   ├── create_stocks_table.sql
│   ├── setup_ranking_system.sql
│   └── setup_analytics.sql
│
└── .github/
    └── workflows/              # GitHub Actions 自動化流程
```

---

## 📌 各模組職責說明 (v4.13 模組化升級)

### 建築結構 (HTML Modularization)
`index.html` 現在變得很輕量，大多數重複性或大型區塊（如頁尾、各種 Modal）都移動到了 `components/` 目錄。這是為了：
1. **減少單一檔案長度**：使 `index.html` 專注於頁面骨架。
2. **提高可維護性**：修改彈窗內容時不再需要滾動千行程式碼。

### 樣式系統 (Deep CSS Modularization)
`css/components/` 的建立解決了樣式表過於臃腫的問題。`components.css` 現在扮演轉接器的角色，使用 `@import` 組織所有粒子化的 CSS 模組。

### 互動邏輯 (JS Functional Splitting)
`js/ui/` 將原先混雜在 `ui.js` 裡的數百行事件監聽器，按職責（彈窗、過濾、表格操作）重新分類。這使得 Bug 追蹤更容易，且避免了單一 `initUI` 函式過於龐大的問題。

---

> 最後更新：2026-03-16 (v4.15)
