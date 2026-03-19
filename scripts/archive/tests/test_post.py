import requests
import os
import json
from dotenv import load_dotenv

# 讀取 .env 中的 Token
load_dotenv()
token = os.getenv("FINMIND_TOKEN")

def test_specific_date():
    """
    測試特定日期 (2026-03-13) 的 2330 股價資訊
    """
    print("--- [FinMind API 特定日期測試: 2330 @ 2026-03-13] ---")
    
    url = "https://api.finmindtrade.com/api/v4/data"
    headers = {"Authorization": f"Bearer {token}"}
    
    # 使用 2026-03-13 作為測試日期
    # 注意：start_date 與 end_date 相同通常可獲取單日資料
    params = {
        "dataset": "TaiwanStockPrice",
        "data_id": "2330",
        "start_date": "2026-03-13",
        "end_date": "2026-03-13",
    }
    
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        if resp.status_code == 200:
            result = resp.json()
            if result.get('status') == 200:
                data = result.get('data', [])
                print(f"狀態: 成功, 回傳資料筆數: {len(data)}")
                if data:
                    print("\n詳細資訊 (JSON):")
                    print(json.dumps(data[0], indent=4, ensure_ascii=False))
                else:
                    print("訊息: 該日期無資料回傳。")
            else:
                print(f"API 錯誤: {result.get('msg')}")
        else:
            print(f"HTTP 錯誤: {resp.status_code}")
            print(resp.text)
            
    except Exception as e:
        print(f"發生異常: {e}")

if __name__ == "__main__":
    if not token:
        print("錯誤: 找不到 FINMIND_TOKEN，請檢查 .env 檔案。")
    else:
        test_specific_date()
