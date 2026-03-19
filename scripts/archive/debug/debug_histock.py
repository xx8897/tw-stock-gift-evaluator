import requests
from bs4 import BeautifulSoup

url = "https://histock.tw/stock/gift.aspx"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
}

print(f"Debug: Connecting to {url}")
try:
    resp = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {resp.status_code}")
    print(f"Response Headers: {resp.headers.get('Content-Type')}")
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # 檢查是否有任何 table
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables on page.")
    
    for i, t in enumerate(tables):
        cls = t.get('class', [])
        print(f"Table {i}: class={cls}")
        if 'hv-table-list' in cls:
            print("Target table found!")
            rows = t.find_all('tr')
            print(f"Total rows: {len(rows)}")
            if len(rows) > 1:
                print("First data row sample:", rows[1].get_text(strip=True)[:50])

except Exception as e:
    print(f"Error during debug: {e}")
