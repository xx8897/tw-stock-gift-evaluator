# 📂 專案目錄結構說明

> 本文件由 Antigravity 自動生成，描述本專案的完整目錄結構與各檔案用途。

```
台股文件/
├── index.html                  # 網站主頁面（單頁應用程式）
├── evaluate_stocks.py          # 核心 Python 評分腳本
├── README.md                   # 專案說明文件
├── LICENSE                     # 版權授權聲明
├── .gitignore                  # Git 忽略清單
│
├── data/                       # 📊 資料檔案目錄（Excel）
│   ├── 2021-2025.xlsx          # 原始全台股紀念品歷史資料（881筆）
│   ├── 2021-2025_推薦評分.xlsx # evaluate_stocks.py 產出：完整評分名單（網站讀取此檔）
│   └── 2021-2025_年年發放.xlsx # evaluate_stocks.py 產出：僅五年年年發放的篩選版
│
├── css/                        # 🎨 樣式表（由 style.css 拆分而成）
│   ├── variables.css           # CSS 自訂變數（顏色、星級等設計 token）
│   ├── base.css                # 全域重置、body、背景特效（blobs）
│   ├── layout.css              # 整體容器、標頭、頁尾、控制區排版與 RWD
│   ├── components.css          # 按鈕、卡片、表格、搜尋框、過濾器、星級標籤等元件
│   ├── modal.css               # 彈出視窗（說明彈窗、贊助彈窗）與估值表格
│   └── utilities.css           # 通用樣式類別（.hidden、.spinner）與金幣爆炸特效
│
├── js/                         # ⚙️ JavaScript 邏輯（由 script.js 拆分而成）
│   ├── data.js                 # 資料層：載入 Excel、GitHub API 時間備援、AppState 全域狀態
│   ├── table.js                # 表格層：渲染表格、排序、過濾、分頁、歷史彈窗
│   ├── ui.js                   # 介面層：彈出視窗控制、金幣特效、排序按鈕初始化
│   └── main.js                 # 程式進入點：DOMContentLoaded 時呼叫 initUI() + loadData()
│
├── assets/                     # 🖼️ 靜態資源
│   └── favicon.png             # 瀏覽器分頁縮圖 icon
│
└── .github/
    └── workflows/
        ├── static.yml          # GitHub Actions：自動部署至 GitHub Pages
        └── update-prices.yml   # GitHub Actions：每週自動評估股價並更新資料
```

---

## 📌 各模組職責說明

### 資料流程
```
Excel (data/) → data.js 讀取 → AppState.globalData
                                    ↓
                              table.js 過濾/排序/渲染 → DOM
```

### 最後更新時間邏輯（data.js）
1. 優先讀取 HTTP Header 的 `Last-Modified`
2. 若為無效日期，改呼叫 [GitHub Commits API](https://api.github.com/repos/xx8897/tw-stock-gift-evaluator/commits) 取得最新 commit 時間
3. 若仍取得失敗，顯示「同步至最新版」

### Python 腳本路徑設計（evaluate_stocks.py）
- 使用 `os.path.dirname(os.path.abspath(__file__))` 取得腳本所在目錄作為根目錄
- 所有輸出輸入均透過 `data/` 相對路徑，無需修改即可跨機器執行

---

> 最後更新：2026-03-03
