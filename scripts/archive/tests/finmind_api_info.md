# FinMind API 使用參考文件

本文件紀錄 FinMind API 的基本調用方式、認證機制以及會員等級權限。

## 1. 認證與調用範例

### API 端點 (Endpoint)
`GET https://api.finmindtrade.com/api/v4/data`

### 認證方式
使用 `Authorization` Header 帶入 Bearer Token：
`Authorization: Bearer {token}`

### Python 實作範例
```python
import requests
import os
from dotenv import load_dotenv

load_dotenv()
token = os.getenv("FINMIND_TOKEN")

url = "https://api.finmindtrade.com/api/v4/data"
headers = {"Authorization": f"Bearer {token}"}
params = {
    "dataset": "TaiwanStockPrice",
    "data_id": "2330",
    "start_date": "2020-04-01",
    "end_date": "2020-04-12",
}

resp = requests.get(url, headers=headers, params=params)
data = resp.json()
print(data)
```

---

## 2. 會員等級與權限 (Membership Tiers)

| 等級 | 說明 | 限制與權限 |
| :--- | :--- | :--- |
| **Free** | 基礎數據集 | 每小時 600 次請求限制。 |
| **Backer** | 更多數據集 | 包含標註為 "Backer" 的數據，限額更高。 |
| **Sponsor** | 全功能存取 | 包含即時數據、券商分點資料、分 K 線資料。 |

---

## 3. 實用資料集參考
*   **`TaiwanStockPrice`**: 每日成交資訊（開高低收）。
*   **`TaiwanStockPER`**: 個股本益比、殖利率。
*   **`TaiwanStockInfo`**: 台股總覽與產業分類。
