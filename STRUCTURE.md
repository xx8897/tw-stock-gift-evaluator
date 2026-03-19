# 📂 專案目錄結構說明 (v4.18)

> 本文件描述本專案的完整目錄結構、各檔案職責，以及各層架構的設計決策。

---

## 完整目錄樹

```
台股文件/
│
├── index.html                      # 🌐 網站主頁面（SPA 骨架，動態載入組件）
├── privacy.html                    # 🔒 隱私權政策頁面（獨立完整頁面）
├── README.md                       # 📄 專案說明（功能介紹、使用方式）
├── STRUCTURE.md                    # 📂 目錄結構說明（本文件）
├── ROADMAP.md                      # 🗺️ 版本規劃與開發藍圖
├── LICENSE                         # ⚖️ 版權授權聲明
├── requirements.txt                # 🐍 Python 相依套件清單
├── .env                            # 🔑 環境變數（不進 Git）
├── .env.example                    # 🔑 環境變數範例（供複製使用）
├── .gitignore                      # Git 忽略清單
│
├── .venv/                          # 🐍 Python 虛擬環境（本機用）
│
├── .github/
│   └── workflows/                  # ⚙️ GitHub Actions 自動化流程
│       └── update_prices.yml       #    每週三次自動爬取股價並更新 Supabase
│
├── assets/                         # 🖼️ 靜態資源（favicon 等）
│
├── components/                     # 🧱 HTML 組件片段（由 components-loader.js 動態載入）
│   ├── auth-modal.html             #    Google OAuth 登入彈窗
│   ├── feedback-modal.html         #    意見回饋表單彈窗
│   ├── info-modals.html            #    評估說明與贊助說明彈窗
│   ├── nickname-modal.html         #    修改暱稱彈窗
│   ├── ranking-modal.html          #    完整排行榜彈窗
│   └── footer.html                 #    頁尾（免責聲明、版權）
│
├── css/                            # 🎨 樣式表模組
│   ├── variables.css               #    設計 Token（顏色、字型、陰影等 CSS 變數）
│   ├── base.css                    #    全域重置與基礎排版
│   ├── layout.css                  #    頁面整體框架佈局
│   ├── components.css              #    組件入口（@import 各分模組）
│   ├── toolbar.css                 #    表格工具列、篩選按鈕色彩系統（含各 Tag 顏色）
│   ├── ranking.css                 #    排行榜清單樣式
│   ├── modal.css                   #    所有彈窗共用殼體
│   ├── auth.css                    #    登入/驗證系統專屬樣式
│   ├── utilities.css               #    動畫、通用輔助 class
│   └── components/                 # 細分組件樣式
│       ├── table.css               #    表格核心樣式與 RWD 卡片轉換邏輯
│       ├── buttons.css             #    Glass 按鈕、GitHub Star 按鈕等
│       ├── badges.css              #    星級徽章、狀態標籤
│       ├── sections.css            #    intro、guide 等區塊容器
│       ├── user-menu.css           #    使用者下拉選單樣式
│       ├── controls.css            #    搜尋框與星級過濾器樣式
│       └── history-popup.css       #    五年歷史彈窗樣式
│
├── js/                             # ⚙️ JavaScript 模組
│   ├── main.js                     #    程式進入點（協調初始化順序）
│   ├── data.js                     #    全域狀態 AppState、Supabase 資料載入
│   ├── table.js                    #    表格渲染、過濾邏輯彙整（checkXXXMatch 函式群）
│   ├── components-loader.js        #    異步 fetch HTML 組件並注入 DOM
│   ├── ui.js                       #    UI 模組啟動入口（匯聚並執行 ui/*.js）
│   ├── ui/
│   │   ├── modals.js               #    所有彈窗開關事件、全域點擊偵測
│   │   ├── filters.js              #    搜尋欄、星級、所有 checkbox 過濾器事件綁定
│   │   └── table-events.js         #    表格欄位排序、分頁切換事件
│   ├── ranking-ui.js               #    排行榜（熱度榜、小資選）渲染與控制
│   ├── analytics.js                #    GA4 事件追蹤埋點（stock_view、購買狀態切換等）
│   ├── sync.js                     #    同步決策：防抖計時、localStorage ↔ Supabase
│   ├── export.js                   #    CSV 持有清單匯出邏輯
│   ├── feedback-modal.js           #    意見回饋表單控制
│   ├── supabase-config.js          #    Supabase Client 初始化設定
│   ├── auth/                       # 🔐 模組化驗證系統
│   │   ├── auth-state.js           #    驗證狀態機（登入/登出狀態切換）
│   │   ├── auth-ui.js              #    驗證相關 UI 更新（顯示/隱藏按鈕等）
│   │   ├── auth-api.js             #    Supabase Auth API 呼叫封裝
│   │   └── auth-utils.js           #    Email 縮短、暱稱取得等輔助函式
│   └── auth.js                     #    驗證總控制器（整合上述四個模組）
│
├── gift_tree/                      # 🌳 知識分類樹（V5 估值引擎的「大腦」）
│   ├── tree.json                   #    紀念品分類規則（JSON 樹狀結構）
│   └── app.py                      #    本機視覺化編輯器（Flask，http://127.0.0.1:5001）
│
├── data/                           # 📊 歷史資料備份
│   └── 2021-2025_推薦v2.xlsx       #    Excel 備援資料源（Supabase 掛掉時使用）
│
├── docs/                           # 📖 開發與設定教學文件
│   ├── ai_agent_customization_guide.md
│   ├── google_oauth_setup_guide.md
│   └── uuid_versions_guide.md
│
├── debug/                          # 🛠️ 前端偵錯工具
│   └── debug_auth.html             #    驗證流程偵錯頁面
│
├── scripts/                        # 🐍 後端 Python 工具腳本
│   │
│   ├── core/                       # 核心自動化腳本（由 GitHub Actions 排程執行）
│   │   ├── valuation_v5.py         #    🧠 V5 估值引擎（DFS 分類樹演算法）
│   │   ├── update_prices_finmind.py#    每日股價更新（FinMind API → Supabase）
│   │   ├── update_special_cond.py  #    特殊領取條件同步（Excel → Supabase cond 欄位）
│   │   └── evaluate_stocks_supa.py #    全量重算 CP 值並批次更新 Supabase
│   │
│   ├── utils/                      # 輔助工具腳本（手動執行，不進 CI/CD）
│   │   ├── generate_stock_excel.py #    產生試算 Excel 報表
│   │   ├── generate_mindmap.py     #    將分類樹視覺化為思維導圖
│   │   ├── filter_stocks.py        #    依篩選條件過濾並輸出清單
│   │   ├── scrape_pocket.py        #    爬取 Pocket 頁面資料
│   │   ├── process_pocket_data.py  #    清洗 Pocket 爬蟲輸出資料
│   │   ├── separate_emerging_stocks.py  # 從主表分離興櫃股票清單
│   │   ├── update_emerging_prices.py    # 更新興櫃股票最新價格
│   │   └── upload_emerging_to_supa.py   # 將興櫃資料同步至 Supabase
│   │
│   └── archive/                    # 📦 封存區（已停用，保留作參考）
│       ├── valuation.py            #    舊版 V4 估值引擎（if-else 硬編碼，已被 V5 取代）
│       ├── valuation_v4_4.py       #    同上，V4.4 版本
│       ├── evaluate_stocks.py      #    舊版全量評估腳本
│       ├── debug/                  #    偵錯與手動測試腳本
│       └── tests/                  #    歷史單元測試與 API 驗證腳本
│
└── sql/                            # 🗄️ Supabase 資料庫定義與管理
    ├── create_stocks_table.sql     #    主表 `stocks` 建置（當前完整 Schema）
    ├── setup_ranking_system.sql    #    排行榜系統（熱度統計、事件記錄）
    ├── setup_analytics.sql         #    使用分析系統（訪客事件追蹤）
    └── migrations/                 #    歷史遷移與修補紀錄（僅供參考，不再執行）
        ├── patch_ranking_system.sql
        ├── v4_8_ranking_overhaul.sql
        ├── v4_9_ranking_physics.sql
        ├── v4_10_sync_fix.sql
        └── v4_11_fix_unique_constraint.sql
```

---

## 📌 架構設計說明

### 前端：HTML 組件化 (components/)
`index.html` 是輕量骨架，主要的彈窗與頁尾區塊都拆到 `components/` 目錄。`components-loader.js` 在頁面載入後異步 fetch 並注入，好處是：
- `index.html` 保持簡短易讀，只呈現骨架結構
- 各彈窗獨立維護，不需要在千行 HTML 中尋找片段

### 前端：CSS Token 系統 (css/variables.css)
所有顏色、字型、陰影都定義為 CSS 變數。各篩選按鈕的獨特顏色（紫、玫瑰紅、橘、天藍、粉紅、金黃、翠綠、靛青、藍綠）則集中定義在 `toolbar.css`，方便管理且不重複。

### 前端：JS 職責分層 (js/)
| 層次 | 檔案 | 職責 |
|---|---|---|
| 狀態層 | `data.js` | 全域 `AppState`、Supabase 資料載入 |
| 渲染層 | `table.js` | DOM 生成、過濾函式彙整 |
| 事件層 | `ui/*.js` | 各種使用者操作的事件監聽器 |
| 服務層 | `sync.js`, `analytics.js`, `export.js` | 背景服務邏輯 |
| 驗證層 | `auth/*.js` | 拆分的 Auth 狀態機 |

### 後端：V5 估值引擎 (scripts/core/)
最核心的設計，詳見 README.md 中的說明。關鍵原則是：`tree.json` 負責知識，`valuation_v5.py` 負責演算法，兩者徹底解耦。

### 後端：歸檔策略 (scripts/archive/)
所有已停用但有參考價值的腳本統一移入此目錄，主目錄始終保持整潔，且不遺失歷史。

### 資料庫：SQL 分層 (sql/)
- **根目錄**：只放「目前資料庫的完整初始 Schema」，代表當前正確狀態
- **migrations/**：存放所有歷史修補 patch，按版本命名，僅供追溯用

---

> 最後更新：2026-03-19 (v4.18)
