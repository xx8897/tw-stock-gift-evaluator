---
title: "毛玻璃暗色主題"
subtitle: "48 行 CSS 變數如何定義整個視覺系統"
document_type: narrative
version: 2.0
language: zh-TW
css_stats:
  variables_lines: 48
  total_css_files: 15
  glass_layer: "backdrop-filter: blur(20px) saturate(180%)"
  color_system: "CSS custom properties + prefers-color-scheme"
  typography: system-ui + Inter
  dark_mode: "CSS custom properties in @media (prefers-color-scheme: dark)"
  responsive: 3 breakpoints (mobile / tablet / desktop)
related_documents:
  - 04_DUAL_TABLE_UX.md
  - 07_BUILDER_HACKS.md
tags: [css, glassmorphism, dark-theme, design-system, variables]
---

# 毛玻璃暗色主題

> 不是 500 行的 CSS 框架。是 48 行變數定義和三條規則，撐起了一整個視覺系統。

## 48 行變數

整個視覺系統的核心：

```css
:root {
    /* 色彩 */
    --bg-primary: #0f0f1a;
    --bg-secondary: #1a1a2e;
    --bg-card: rgba(255, 255, 255, 0.05);
    --bg-card-hover: rgba(255, 255, 255, 0.08);
    --text-primary: #e0e0e0;
    --text-secondary: #a0a0a0;
    --text-muted: #666;
    --accent: #00d4aa;
    --accent-hover: #00f0c0;
    --danger: #ff4757;
    --warning: #ffa502;
    --success: #2ed573;
    --border: rgba(255, 255, 255, 0.1);
    
    /* 毛玻璃 */
    --glass-blur: 20px;
    --glass-saturate: 180%;
    --glass-bg: rgba(15, 15, 26, 0.7);
    --glass-border: rgba(255, 255, 255, 0.15);
    
    /* 間距 */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 32px;
    
    /* 圓角 */
    --radius-sm: 6px;
    --radius-md: 12px;
    --radius-lg: 20px;
    
    /* 陰影 */
    --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.3);
    --shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.4);
    
    /* 字型 */
    --font-family: 'Inter', system-ui, -apple-system, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    
    /* 過渡 */
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
}
```

48 行。這就是整個設計系統的定義。沒有 BEM、沒有 CSS-in-JS、沒有 CSS Modules。只有 CSS custom properties 和三條規則。

## 三條規則

### 規則一：所有顏色用變數

```css
/* ✓ */
.card { background: var(--bg-card); color: var(--text-primary); }

/* ✗ */
.card { background: rgba(255, 255, 255, 0.05); color: #e0e0e0; }
```

沒有例外。所有顏色、間距、圓角、陰影都用變數。如果需要新顏色，先加到 `variables.css`，再在其他文件裡引用。

### 規則二：毛玻璃用同一個 mixin

```css
.glass {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
}
```

卡片、彈窗、導航列——所有浮動元素都用 `.glass`。不是因為懶，是因為一致性。當你改了 `--glass-blur` 從 20px 到 30px，所有毛玻璃效果一起改。

### 規則三：響應式只有三個斷點

```css
/* 手機 */
@media (max-width: 768px) { ... }

/* 平板 */
@media (min-width: 769px) and (max-width: 1024px) { ... }

/* 桌面 */
@media (min-width: 1025px) { ... }
```

不是 6 個斷點，不是 4 個斷點，是 3 個。手機、平板、桌面。因為這個工具的使用場景很明確：散戶在手機上快速查詢、在桌面上詳細比較。沒有人會在智慧手錶上查股東會紀念品。

## 毛玻璃效果

毛玻璃的實作很簡單，但選擇它的理由不簡單：

```css
.glass {
    background: rgba(15, 15, 26, 0.7);          /* 半透明深色背景 */
    backdrop-filter: blur(20px) saturate(180%); /* 模糊下方內容、增加飽和度 */
    border: 1px solid rgba(255, 255, 255, 0.15); /* 細微邊框 */
    border-radius: 20px;                         /* 大圓角 */
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);   /* 深陰影 */
}
```

四個屬性。為什麼是這四個？

1. **半透明背景**（alpha 0.7）：讓下面的內容隱約可見，創造層次感
2. **模糊 + 飽和度**：模糊讓文字不會穿透到可讀程度，飽和度讓模糊的顏色更鮮豔而不是灰濛濛
3. **細微邊框**（alpha 0.15）：如果不加邊框，毛玻璃和背景之間沒有清晰的邊界
4. **大圓角**（20px）：小圓角讓毛玻璃看起來像「有圓角的矩形」而不是「浮動的玻璃面板」

## 暗色主題

暗色主題不是附加的。它是預設。

```css
/* 亮色主題是覆蓋，暗色主題是基礎 */
:root {
    --bg-primary: #0f0f1a;
    --text-primary: #e0e0e0;
    /* ...暗色變數 */
}

@media (prefers-color-scheme: light) {
    :root {
        --bg-primary: #f5f5f7;
        --text-primary: #1a1a2e;
        --glass-bg: rgba(255, 255, 255, 0.7);
        --glass-border: rgba(0, 0, 0, 0.1);
        /* ...亮色覆蓋 */
    }
}
```

為什麼暗色是預設？因為股東會紀念品的查詢高峰在晚上——散戶下班後、睡覺前，滑手機看看明天要不要下單。暗色主題保護眼睛也是尊重使用場景。

## 7.2 秒載入動畫

```css
.loading-screen {
    position: fixed;
    inset: 0;
    background: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeOut 0.5s ease 7.2s forwards;
}

@keyframes fadeOut {
    to { opacity: 0; pointer-events: none; }
}
```

7.2 秒。不是 1 秒，不是 3 秒。為什麼？

因為 Supabase 的冷啟動需要 5-7 秒。第一個使用者在免費方案上的首次連線需要這麼長時間。7.2 秒的載入動畫不是 UX 妝飾，是真實的等待遮罩。它用毛玻璃和漸層旋轉動畫讓等待看起來不像等待。

當然，第二次訪問就快了——Supabase 有連線池。但第一次訪問只有一次機會，7.2 秒確保不會出現空白頁面。

## 星級的視覺語言

星星不只用顏色區分：

```
★★★★★  金色    → 高度推薦
★★★★☆  銀色    → 推薦
★★★☆☆  灰色    → 一般
★★☆☆☆  淺灰    → 有風險
★☆☆☆☆  紅色    → 高風險
☆☆☆☆☆  暗紅    → 估值為零
```

每個星級有獨特的顏色。這不是裝飾，是資訊。使用者掃一眼就能分辨哪些股票值得看、哪些應該避開。