import requests
import pandas as pd
import os

# --- 設定路徑 ---
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXCEL_PATH = os.path.join(_BASE_DIR, 'data', '2021-2025_推薦v2.xlsx')

def update_stock_prices():
    """
    從 OpenAPI 抓取最新收盤價並更新 Excel 檔案
    僅負責更新「最近股價」欄位
    """
    print(f"--- 開始更新最新股價 (目標: {os.path.basename(EXCEL_PATH)}) ---")
    
    if not os.path.exists(EXCEL_PATH):
        print(f"錯誤: 找不到檔案 {EXCEL_PATH}")
        return

    # 1. 抓取上市 (TWSE) 資料
    print("正在請求上市 (TWSE) OpenAPI...")
    twse_url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
    prices = {}
    try:
        twse_data = requests.get(twse_url, timeout=30).json()
        for item in twse_data:
            stock_id = str(item.get('Code', '')).strip()
            price_str = str(item.get('ClosingPrice', '')).replace(',', '')
            try:
                if price_str and price_str != '-':
                    prices[stock_id] = float(price_str)
            except ValueError:
                pass
        print(f"  -> 成功獲取 {len(twse_data)} 筆上市股票資料")
    except Exception as e:
        print(f"  [Error] 上市 API 失敗: {e}")

    # 2. 抓取上櫃 (TPEx) 資料
    print("正在請求上櫃 (TPEx) OpenAPI...")
    tpex_url = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        tpex_data = requests.get(tpex_url, headers=headers, timeout=30).json()
        for item in tpex_data:
            stock_id = str(item.get('SecuritiesCompanyCode', '')).strip()
            price_str = str(item.get('Close', '')).replace(',', '')
            try:
                if price_str and price_str != '-':
                    prices[stock_id] = float(price_str)
            except ValueError:
                pass
        print(f"  -> 成功獲取 {len(tpex_data)} 筆上櫃股票資料")
    except Exception as e:
        print(f"  [Error] 上櫃 API 失敗: {e}")

    # 3. 更新 Excel 檔案
    try:
        df = pd.read_excel(EXCEL_PATH)
        df.columns = df.columns.astype(str)
        
        if '股號' not in df.columns:
            print("錯誤: Excel 檔案中找不到『股號』欄位")
            return

        # 確保有「最近股價」欄位
        if '最近股價' not in df.columns:
            df['最近股價'] = 0.0

        # 比對並更新
        df['股號'] = df['股號'].astype(str).str.strip()
        update_count = 0
        
        for idx, row in df.iterrows():
            sid = row['股號']
            if sid in prices:
                df.at[idx, '最近股價'] = prices[sid]
                update_count += 1
        
        df.to_excel(EXCEL_PATH, index=False)
        print(f"成功更新 {update_count} 筆股價，檔案已存檔。")
        
    except Exception as e:
        print(f"更新 Excel 時出錯: {e}")

    print("--- 股價更新任務結束 ---")

if __name__ == "__main__":
    update_stock_prices()
