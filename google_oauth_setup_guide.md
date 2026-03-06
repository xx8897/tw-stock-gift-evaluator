# 🔑 Google OAuth 設定指南 (Supabase)

這份文件記錄了如何將 Google 登入功能介接到你的台股紀念品網站。

---

## 1. Google Cloud Console 設定
前往：[Google Cloud Console](https://console.cloud.google.com/)

### A. 建立專案
1. 點擊左上角「選取專案」。
2. 點擊「新增專案」，輸入名稱（如 `tw-stock-gift`）。

### B. 設定 OAuth 同意畫面 (Consent Screen)
1. 進入「API 和服務」 > 「OAuth 同意畫面」。
2. 使用者類型選擇 **外部 (External)**。
3. 填寫應用程式名稱 (如：`台股紀念品同步`) 與你的電子郵件。
4. 一路儲存到底即可。

### C. 建立憑證 (Credentials)
1. 進入「API 和服務」 > 「用戶端」。
2. 點擊「建立 OAuth 用戶端 ID」。
3. 應用程式類型選 **網頁應用程式 (Web application)**。
4. **已授權的 JavaScript 來源**：填入 `http://localhost:8080`。
5. **已授權的重新導向 URI**：填入 Supabase 提供的 Callback URL (見下節)。
6. 點擊「建立」按鈕。
7. **系統會彈出視窗顯示結果**：請從該視窗中**複製 `Client ID` 與 `Client Secret`** (這就是設定 Supabase 的關鍵鑰匙)。

---

## 2. Supabase 設定
前往：[Supabase Dashboard](https://supabase.com/dashboard/)

### A. 取得 Callback URL
1. 點擊左邊選單的 **人像圖示 (Authentication)**。
2. 點擊 **URL Configuration**。
3. 找到 **Callback URL (OAuth)**，這串網址要貼回 Google Cloud Console 的重新導向 URI。

### B. 設定 Google Provider
1. 在 Authentication 頁面點擊 **Providers**。
2. 展開 **Google** 選項並啟用「Enable Google Proxy」。
3. 貼上剛才從 Google 拿到的 **Client ID** 與 **Client Secret**。
4. 儲存設定。

---

## 3. 本機測試
1. 啟動你的 Python Server：`python -m http.server 8080`。
2. 開放網頁：`http://localhost:8080`。
3. 點擊「雲端同步」按鈕，即可開始 Google 登入流程。

---

> [!NOTE]
> 如果未來部署到 GitHub Pages (如 `https://user.github.io/repo`)，記得要把這個網址也加到 Google Cloud 的「JavaScript 來源」與「重新導向 URI」中，否則線上版登入會失敗。
