import requests
import pandas as pd
import json

def test_latest_market_data():
    """結構化測試：獲取上市與上櫃的原始資料範例"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    print("--- [TWSE 上市資料測試] ---")
    twse_url = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
    try:
        twse_resp = requests.get(twse_url, headers=headers, timeout=10)
        twse_data = twse_resp.json()
        print(f"狀態: 成功, 資料總數: {len(twse_data)}")
        print(f"欄位: {list(twse_data[0].keys())}")
        print(f"範例資料 (1101 台泥): {next(item for item in twse_data if item['Code'] == '1101')}")
    except Exception as e:
        print(f"上市抓取出錯: {e}")

    print("\n--- [TPEx 上櫃資料測試] ---")
    tpex_url = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
    try:
        tpex_resp = requests.get(tpex_url, headers=headers, timeout=10)
        tpex_data = tpex_resp.json()
        print(f"狀態: 成功, 資料總數: {len(tpex_data)}")
        print(f"欄位: {list(tpex_data[0].keys())}")
        # 找一個常見的上櫃股票範例，例如 1240 茂生農經 (如果有的話)
        print(f"範例資料 (第一筆): {tpex_data[0]}")
    except Exception as e:
        print(f"上櫃抓取出錯: {e}")

if __name__ == "__main__":
    test_latest_market_data()
