import requests
from bs4 import BeautifulSoup

url = "https://histock.tw/stock/gift.aspx"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
}

print(f"🚀 重新實測 HiStock 抓取 (適配 gvTB 結構)...")
try:
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # 根據偵錯結果，主要的表格類別包含 gvTB
    table = soup.find('table', class_='gvTB')
    if not table:
         # 嘗試搜尋包含 tb-stock 的表格
         table = soup.find('table', class_='tb-stock')

    if table:
        rows = table.find_all('tr')
        print(f"✅ 找到資料表格，共 {len(rows)} 列。")
        
        # 前幾列通常是 Header 或廣告，我們找有資料的列
        count = 0
        for row in rows:
            cols = row.find_all(['td', 'th'])
            if len(cols) >= 3:
                # 過濾掉 Header
                if cols[0].text.strip() == "代碼": continue
                
                stock_id = cols[0].get_text(strip=True)
                stock_name = cols[1].get_text(strip=True)
                gift_name = cols[2].get_text(strip=True)
                
                print(f"[{stock_id} {stock_name}] 🎁 {gift_name}")
                count += 1
                if count >= 10: break # 先看 10 筆
        print(f"\n--- 結論：解析成功，共抓取 {count} 筆樣品資料 ---")
    else:
        print("❌ 錯誤：仍然找不到資料表格。")

except Exception as e:
    print(f"❌ 實測失敗：{e}")
