# 📂 專案目錄結構說明 (v2)

> 本文件描述本專案的完整目錄結構與各檔案用途。

```
台股文件/
├── index.html                  # 網站主頁面（單頁應用程式，含說明＆贊助彈窗）
├── evaluate_stocks.py          # 核心 Python 評分腳本（股價抓取 + CP 值計算）
├── README.md                   # 專案說明文件
├── STRUCTURE.md                # 專案目錄結構說明（本文件）
├── LICENSE                     # 版權授權聲明
├── .gitignore                  # Git 忽略清單
│
├── .venv/                      # 🐍 Python 虛擬環境（本地開發用，不進 Git）
│
├── docs/                       # 📖 專案文件與教學
│   ├── ai_agent_customization_guide.md # AI Agent (Antigravity) 規則與技能設定指南
│   ├── google_oauth_setup_guide.md
│   └── uuid_versions_guide.md
│
├── debug/                      # 🛠️ 偵錯工具與暫存檔
│   └── debug_auth.html         # 驗證流程偵錯工具
│
├── data/                       # 📊 資料檔案目錄（Excel）
│   ├── 2021-2025_推薦評分.xlsx # evaluate_stocks.py 讀寫：完整評分名單（網站讀取此檔）
│   └── 2021-2025_年年發放.xlsx # evaluate_stocks.py 產出：僅五年年年發放的篩選版
│
├── css/                        # 🎨 樣式表模組
│   ├── variables.css           # CSS 自訂變數：顏色、星級、漸層等設計 token
│   ├── base.css                # 全域重置、body、字體、背景 blob 動畫
│   ├── layout.css              # 容器、標頭、頁尾、控制區排版 + 完整 RWD 斷點
│   ├── components.css          # 表格、按鈕、星級篩選、分頁器、彈窗、手機版佈局
│   ├── modal.css               # 說明彈窗、贊助彈窗、估值表格
│   └── utilities.css           # 通用類別、金幣爆炸特效動畫
│
├── js/                         # ⚙️ JavaScript 模組
│   ├── data.js                 # 資料層：Excel 載入、AppState 全域狀態
│   ├── table.js                # 表格層：渲染、排序、過濾、分頁、彈窗
│   ├── ui.js                   # 介面層：事件綁定、彈窗控制、特效
│   └── main.js                 # 程式進入點
│
├── assets/                     # 🖼️ 靜態資源
│   └── favicon.png             # 瀏覽器分頁縮圖 icon
│
└── .github/
    └── workflows/
        ├── static.yml          # GitHub Actions：自動部署至 GitHub Pages
        └── update-prices.yml   # GitHub Actions：自動更新股價
```

---

## 📌 各模組職責說明

### 資料流程
```
Excel (data/*.xlsx)
    ↓  SheetJS 解析
data.js → AppState.globalData (全域狀態)
    ↓  搜尋 / 星級 / 連續5年 / 已買未買 篩選
table.js → 排序 → 分頁 → 渲染 DOM
    ↓  互動事件
ui.js → 彈窗控制 / 排序按鈕 / 買入標記 / 金幣特效
```

### 前端架構（v2）

| 層級 | 檔案 | 職責 |
|---|---|---|
| 進入點 | `main.js` | 啟動 `initUI()` 和 `loadData()` |
| 資料層 | `data.js` | Excel 解析、股價時間戳、全域狀態管理、localStorage |
| 表格層 | `table.js` | 資料過濾、排序、分頁渲染、歷史彈窗 |
| 介面層 | `ui.js` | 事件綁定、彈窗、特效、使用者互動 |

### 最後更新時間邏輯（data.js）
1. 優先讀取 HTTP Header 的 `Last-Modified`
2. 若為無效日期，改呼叫 [GitHub Commits API](https://api.github.com/repos/xx8897/tw-stock-gift-evaluator/commits) 取得最新 commit 時間
3. 若仍取得失敗，顯示「同步至最新版」

### Python 腳本路徑設計（evaluate_stocks.py）
- 使用 `os.path.dirname(os.path.abspath(__file__))` 取得腳本所在目錄作為根目錄
- 所有輸出輸入均透過 `data/` 相對路徑，無需修改即可跨機器執行

---

> 最後更新：2026-03-04 (v2)
