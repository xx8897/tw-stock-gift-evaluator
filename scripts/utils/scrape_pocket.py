import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import os

async def scrape_pocket():
    url = "https://events.pocket.tw/pocketsmlist-34839#march"
    target_path = r'c:\Users\xx8897\codespace\antigravity\台股文件\data\3月領取資格.xlsx'
    
    # 排除清單
    excluded_keywords = ["可零股，需特定方式領取", "不限股數皆可領取"]

    async with async_playwright() as p:
        print("Launching browser...")
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="networkidle")
        
        # 等待表格渲染
        try:
            await page.wait_for_selector("table", timeout=10000)
        except Exception as e:
            print("Table not found or timeout.")
            await browser.close()
            return

        print("Extracting data...")
        # 執行 JavaScript 提取資料並過濾
        all_data = await page.evaluate(f"""() => {{
            const rows = Array.from(document.querySelectorAll("table tr")).slice(1); // 跳過標題行
            const excluded = {excluded_keywords};
            
            return rows.map(row => {{
                const cells = row.querySelectorAll("td");
                if (cells.length < 2) return null;
                
                const stock_id = cells[0].innerText.trim();
                const qualification = cells[cells.length - 1].innerText.trim();
                
                if (excluded.includes(qualification)) return null;
                
                return {{ "股號": stock_id, "領取資格": qualification }};
            }}).filter(item => item !== null);
        }}""")

        print(f"Extracted {{len(all_data)}} records after filtering.")
        
        # 轉成 DataFrame 並儲存
        if all_data:
            df = pd.DataFrame(all_data)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            df.to_excel(target_path, index=False)
            print(f"Success! Data saved to {{target_path}}")
        else:
            print("No matching data found.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_pocket())
