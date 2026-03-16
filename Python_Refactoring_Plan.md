# Python 估價邏輯去重重構計畫

## 執行規則
- 每個「找到這段」必須**完整比對後才刪除**，不可只刪局部。
- 若找不到完全一致的代碼，**停下來，不要修改**，向用戶回報。
- 步驟一和步驟二分開各自 commit，不要合併。

---

## 背景說明

`scripts/core/valuation.py` 是已存在的共用估值模組，提供以下四個函式：
- `estimate_gift_value(gift_name)` — 計算單項紀念品估值
- `estimate_5year_total(text)` — 計算五年總估值。**注意：此函式使用欄位名稱 `row['新版五總估']`**
- `calc_v4_cp(row)` — 計算性價比。**注意：此函式讀取 `row['新版五總估']`，不是 `row['五年紀念品總估值']`**
- `calc_v4_score(row)` — 計算星級推薦

目前 `evaluate_stocks.py` 和 `evaluate_stocks_supa.py` 各自複製貼上了一份完整的實作，造成三份重複。

**目標**：刪除兩支檔案內部的重複定義，改為引用 `valuation.py`。

---

## 步驟一：修改 `scripts/core/evaluate_stocks.py`

> ⚠️ **此步驟共有 5 個修改，必須全部完成才能進行驗證。**

---

### 修改 1（第 1–5 行）—— 新增 sys.path 與 import

**找到這段（檔案最開頭的 import 區）：**
```python
import pandas as pd
import requests
import re
import time
import os
```

**改為：**
```python
import pandas as pd
import requests
import re
import time
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from valuation import estimate_gift_value, estimate_5year_total, calc_v4_cp, calc_v4_score
```

---

### 修改 2（第 40–155 行）—— 刪除 `estimate_gift_value` 函式定義

**找到這段（從注解標題到函式最後一行 `    return val`）：**
```python
# ============================================================
# 3. 紀念品估值邏輯
# ============================================================
def estimate_gift_value(gift_name):
    """
    紀念品估值模型 v3.1 — 高精細度保守版
    支援複合品項加總、更細緻的材質與品項分類。
    【保守策略】：禮券類扣除 15 元，物品類扣除 20 元 (預估代領花費)。
    """
    if not gift_name or gift_name in ['無', '-', '未發放', '不發放', 'nan', '']:
        return 0
    
    # ─── 0. 內層遞迴處理 (不在此層執行代領費扣除) ───
    is_top_level = not str(gift_name).startswith("__internal__")
    name_clean = str(gift_name).replace("__internal__", "").strip()

    delimiters = r'\+|\&|與|和|及'
    if re.search(delimiters, name_clean):
        parts = re.split(delimiters, name_clean)
        # 標記為內層計算，避免重複扣除代領費
        raw_total = sum(estimate_gift_value(f"__internal__{p.strip()}") for p in parts if p.strip())
        if is_top_level:
            # 判斷是否全為禮券類
            is_voucher_only = all(any(k in p for k in ['禮券', '商品卡', '提貨券', '購物金', '兌換卷']) for p in parts)
            cost = 15 if is_voucher_only else 20
            return max(raw_total - cost, 0)
        return raw_total

    gift = name_clean
    
    # ─── 第一層：直接抓取金額 ───
    m = re.search(r'(\d[\d,]*)元', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'\$\s*(\d[\d,]*)', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'抵用券.*?(\d[\d,]*)', gift)
    if m:
        return min(int(m.group(1).replace(',', '')), 5000)
    if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券']):
        return 100

    # ─── 第二層：特殊高價神股 ───
    if '大魯閣' in gift: return 800
    if '王品' in gift: return 400
    if '六福村' in gift or '六福' in gift: return 1199
    if '佐登妮絲' in gift: return 300

    # ─── 第三層：精細分類估值 ───
    
    # 【小家電類】 200~500 元
    if any(k in gift for k in ['電風扇', '循環扇', '捕蚊燈', '電熱毯']): val = 400
    elif any(k in gift for k in ['行動電源', '耳機', '藍芽']): val = 300
    elif any(k in gift for k in ['USB風扇', '手持扇', '體重計', '吸塵器']): val = 200
    
    # 【鍋具類深度細分】
    elif any(k in gift for k in ['炒鍋', '平底鍋', '鑄鐵鍋']): val = 400
    elif any(k in gift for k in ['湯鍋', '燉鍋', '壓力鍋']): val = 300
    elif any(k in gift for k in ['雪平鍋', '奶鍋', '單把鍋']): val = 150
    
    # 【餐具材質細分】
    elif any(k in gift for k in ['陶瓷', '骨瓷', '強化玻璃', '耐熱玻璃']):
        if any(k in gift for k in ['盤', '碟']): val = 100
        elif any(k in gift for k in ['碗', '盅']): val = 80
        else: val = 120 # 其它陶瓷品
    
    elif any(k in gift for k in ['不鏽鋼', '不銹鋼', '304', '316']):
        if any(k in gift for k in ['保溫杯', '保溫瓶']): val = 200
        elif any(k in gift for k in ['便當盒', '隔熱碗']): val = 150
        else: val = 120 # 其它不鏽鋼件
    
    # 【五金工具/戶外】
    elif any(k in gift for k in ['工具組', '工具套裝', '螺絲起子組']): val = 180
    elif any(k in gift for k in ['露營燈', '帳篷', '野餐墊']): val = 200
    elif any(k in gift for k in ['修容', '指甲剪']): val = 80

    # 【紡織品深度細分】
    elif any(k in gift for k in ['法蘭絨', '珊瑚絨', '毯']): val = 250
    elif any(k in gift for k in ['浴巾', '大毛巾']): val = 120
    elif any(k in gift for k in ['毛巾', '擦手巾', '運動巾']): val = 60
    elif '傘' in gift:
        if any(k in gift for k in ['自動', '抗UV', '折傘']): val = 200
        else: val = 150
        
    # 【食飲品類】
    elif any(k in gift for k in ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油']): val = 120
    elif any(k in gift for k in ['米', '白米', '香米', '糙米']) and '洗米' not in gift: val = 70
    elif any(k in gift for k in ['火鍋', '鍋燒', '拌麵', '泡麵', '醬油', '罐頭', '咖啡', '零食']): val = 50

    # 其他基礎生活類
    elif any(k in gift for k in ['洗衣', '洗碗', '清潔劑', '皂', '洗髮', '牙膏']): val = 50
    elif any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '抽取式']): val = 30
    else:
        val = 40 # 基礎保底

    # 【品牌/聯名加成】 1.25x
    premium_brands = ['Kitty', 'Snoopy', '史努比', '迪士尼', 'Disney', 'LINE', '角落小夥伴', '卡娜赫拉', '拉拉熊', '小小兵', '皮克斯']
    if any(b in gift for b in premium_brands):
        val = int(val * 1.25)

    # 【保守扣除】
    if is_top_level:
        # 決定類型：是否為電子或純票券
        is_voucher = any(k in gift for k in ['禮券', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券'])
        # 新增：電子票券不扣代領費 (若名稱含電子、簡訊、APP、點數等)
        is_digital = any(k in gift for k in ['電子', '簡訊', 'APP', '點數', '虛擬'])
        
        if is_digital:
            cost = 0
        else:
            cost = 15 if is_voucher else 20
        
        val = max(val - cost, 0)

    return val
```

**改為（用一段注解取代整段）：**
```python
# ============================================================
# 3. 紀念品估值邏輯（由 valuation.py 模組提供）
# ============================================================
# estimate_gift_value 已由頂部 `from valuation import ...` 匯入，此處不再定義。
```

---

### 修改 3（第 160–174 行）—— 刪除 `estimate_5year_total` 定義，並同時改欄位名稱

> ⚠️ 此修改同時做兩件事：1. 刪除 `estimate_5year_total` 的定義；2. 將欄位名稱 `'五年紀念品總估值'` 改為 `'新版五總估'`（與 `valuation.py` 一致，否則 `calc_v4_cp` 會崩潰）。

**找到這段（含評估說明注解、函式定義、以及緊接的 df 操作行）：**
```python
# ============================================================
# 4. 計算評分 (含有保守估算說明)
# ============================================================
# 【評估說明】：五年紀念品總估值採用保守估算。
# 每次(每年)發放之價值皆已預先扣除「代領花費」(禮券類-15元，物品類-20元)。
# 電子類券(電子/點數/APP) 則不扣除代領費，因不須委託代領。
print("Calculating CP scores based on V4.2 Model (Bug Fix & Digital Support)...")
df['紀念品預估價值'] = df['上次紀念品'].apply(estimate_gift_value)

def estimate_5year_total(text):
    if pd.isna(text) or str(text).strip() in ['', 'nan']: return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        item = re.sub(r'^\(\d{4}\)', '', item.strip()).strip()
        if not item or item in ['無', '-', '未發放', '不發放']: continue
        total += estimate_gift_value(item)
    return total

df['五年紀念品總估值'] = df['五年發放紀念品'].apply(estimate_5year_total)
```

**改為（刪除函式定義，並將欄位名稱由 `'五年紀念品總估值'` 改為 `'新版五總估'`）：**
```python
# ============================================================
# 4. 計算評分 (含有保守估算說明)
# ============================================================
# 【評估說明】：五年紀念品總估值採用保守估算。
# 每次(每年)發放之價值皆已預先扣除「代領花費」(禮券類-15元，物品類-20元)。
# 電子類券(電子/點數/APP) 則不扣除代領費，因不須委託代領。
print("Calculating CP scores based on V4.2 Model (Bug Fix & Digital Support)...")
df['紀念品預估價值'] = df['上次紀念品'].apply(estimate_gift_value)

# estimate_5year_total 已由頂部 `from valuation import ...` 匯入，此處不再定義。
df['新版五總估'] = df['五年發放紀念品'].apply(estimate_5year_total)
```

---

### 修改 4（第 178–222 行）—— 刪除 `calc_v4_cp` 與 `calc_v4_score` 定義

**找到這段（兩個函式定義與其 df.apply 呼叫）：**
```python
def calc_v4_cp(row):
    """
    V4.2 CP 指數：五年期望回報率
    公式：((五年總估值 / 5) * (次數 / 5)) / 最近股價
    """
    price = row['最近股價']
    total_val = row['五年紀念品總估值']
    freq = row['五年內發放次數']
    
    if price <= 0 or total_val <= 0: return 0.0
    
    # 穩定度權重 (次數 / 5)
    w_freq = freq / 5.0
    
    # 預期五年總收益率 (倍數)
    cp = (total_val * w_freq) / price
    
    # 網頁呈現時上限鎖定 10.0，但 Excel 保留原始值供分析
    return round(cp, 2)

df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

def calc_v4_score(row):
    """
    V4.2 星級篩選器：金標五星門檻
    """
    cp = row['新版性價比']
    freq = row['五年內發放次數']
    cond = str(row.get('去年條件', ''))
    
    # 便利性過濾：排除需要身分證或本人的標的
    is_convenient = not ('身分證' in cond or '本人' in cond)
    
    if cp >= 2.0 and freq >= 5 and is_convenient:
        return '5 星'
    elif cp >= 1.0 and freq >= 4 and is_convenient:
        return '4 星'
    elif cp >= 0.5 and freq >= 3:
        return '3 星'
    elif cp >= 0.1:
        return '2 星'
    else:
        return '1 星'

df['新版推薦評分'] = df.apply(calc_v4_score, axis=1)
```

**改為（只保留 df.apply 呼叫，刪除兩個函式定義）：**
```python
# calc_v4_cp、calc_v4_score 已由頂部 `from valuation import ...` 匯入，此處不再定義。
df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

df['新版推薦評分'] = df.apply(calc_v4_score, axis=1)
```

---

### 修改 5（第 231–235 行）—— 更新輸出欄位清單

**找到這段（final_columns 列表）：**
```python
final_columns = [
    '股號', '公司', '五年內發放次數', '最近一次發放', '上次紀念品',
    '最近股價', '五年紀念品總估值', '新版性價比', '新版推薦評分',
    '去年條件', '五年發放紀念品'
]
```

**改為（將 `'五年紀念品總估值'` 改為 `'新版五總估'`）：**
```python
final_columns = [
    '股號', '公司', '五年內發放次數', '最近一次發放', '上次紀念品',
    '最近股價', '新版五總估', '新版性價比', '新版推薦評分',
    '去年條件', '五年發放紀念品'
]
```

---

### 步驟一驗證

完成以上 5 個修改後，執行：
```
python scripts/core/evaluate_stocks.py
```

**成功的輸出應該包含（沒有任何 Error 或 KeyError）：**
```
Loaded XX rows from ...
Calculating CP scores based on V4.2 Model...
Success! Evaluated XX stocks. Sorted by Stock ID. Saved to ...
```

**如果看到以下錯誤，停下來回報給用戶，不要繼續步驟二：**
- `ModuleNotFoundError: No module named 'valuation'` → sys.path 設定有問題
- `KeyError: '新版五總估'` → 修改 3 的欄位名稱沒有改到
- `KeyError: '五年紀念品總估值'` → 修改 5 的 final_columns 沒有更新

Git 指令（驗證成功後執行）：
```
git add scripts/core/evaluate_stocks.py
git commit -m "refactor(core): remove duplicate valuation logic, use valuation.py module"
git push origin master
```

---

## 步驟二：修改 `scripts/core/evaluate_stocks_supa.py`

> ⚠️ **此步驟共有 3 個修改。**

---

### 修改 1（第 1–7 行）—— 新增 sys.path 與 import

**找到這段（檔案最開頭的 import 區）：**
```python
import pandas as pd
import requests
import re
import time
import os
import json
from dotenv import load_dotenv
```

**改為：**
```python
import pandas as pd
import requests
import re
import time
import os
import json
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from valuation import estimate_gift_value, estimate_5year_total, calc_v4_cp, calc_v4_score
```

---

### 修改 2（第 71–147 行）—— 刪除 `estimate_gift_value` 和 `estimate_5year_total` 定義

**找到這段（從注解標題到 `return val` 的最後一行，含兩個函式）：**
```python
# ============================================================
# 2. 紀念品估值模型 v3.1 — 核心邏輯
# ============================================================
def estimate_gift_value(gift_name):
    if not gift_name or gift_name in ['無', '-', '未發放', '不發放', 'nan', '']:
        return 0
    is_top_level = not str(gift_name).startswith("__internal__")
    name_clean = str(gift_name).replace("__internal__", "").strip()
    delimiters = r'\+|\&|與|和|及'
    if re.search(delimiters, name_clean):
        parts = re.split(delimiters, name_clean)
        raw_total = sum(estimate_gift_value(f"__internal__{p.strip()}") for p in parts if p.strip())
        if is_top_level:
            is_voucher_only = all(any(k in p for k in ['禮券', '商品卡', '提貨券', '購物金', '兌換卷']) for p in parts)
            cost = 15 if is_voucher_only else 20
            return max(raw_total - cost, 0)
        return raw_total
    gift = name_clean
    m = re.search(r'(\d[\d,]*)元', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'\$\s*(\d[\d,]*)', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    m = re.search(r'抵用券.*?(\d[\d,]*)', gift)
    if m: return min(int(m.group(1).replace(',', '')), 5000)
    if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券']): return 100
    if '大魯閣' in gift: return 800
    if '王品' in gift: return 400
    if '六福' in gift: return 1199
    if '佐登妮絲' in gift: return 300
    if any(k in gift for k in ['電風扇', '循環扇', '捕蚊燈', '電熱毯']): val = 400
    elif any(k in gift for k in ['行動電源', '耳機', '藍芽']): val = 300
    elif any(k in gift for k in ['USB風扇', '手持扇', '體重計', '吸塵器']): val = 200
    elif any(k in gift for k in ['炒鍋', '平底鍋', '鑄鐵鍋']): val = 400
    elif any(k in gift for k in ['湯鍋', '燉鍋', '壓力鍋']): val = 300
    elif any(k in gift for k in ['雪平鍋', '奶鍋', '單把鍋']): val = 150
    elif any(k in gift for k in ['陶瓷', '骨瓷', '強化玻璃', '耐熱玻璃']):
        if any(k in gift for k in ['盤', '碟']): val = 100
        elif any(k in gift for k in ['碗', '盅']): val = 80
        else: val = 120
    elif any(k in gift for k in ['不鏽鋼', '不銹鋼', '304', '316']):
        if any(k in gift for k in ['保溫杯', '保溫瓶']): val = 200
        elif any(k in gift for k in ['便當盒', '隔熱碗']): val = 150
        else: val = 120
    elif any(k in gift for k in ['工具組', '工具套裝', '螺絲起子組']): val = 180
    elif any(k in gift for k in ['露營燈', '帳篷', '野餐墊']): val = 200
    elif any(k in gift for k in ['修容', '指甲剪']): val = 80
    elif any(k in gift for k in ['法蘭絨', '珊瑚絨', '毯']): val = 250
    elif any(k in gift for k in ['浴巾', '大毛巾']): val = 120
    elif any(k in gift for k in ['毛巾', '擦手巾', '運動巾']): val = 60
    elif '傘' in gift:
        if any(k in gift for k in ['自動', '抗UV', '折傘']): val = 200
        else: val = 150
    elif any(k in gift for k in ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油']): val = 120
    elif any(k in gift for k in ['米', '白米', '香米', '糙米']) and '洗米' not in gift: val = 70
    elif any(k in gift for k in ['火鍋', '鍋燒', '拌麵', '泡麵', '醬油', '罐頭', '咖啡', '零食']): val = 50
    elif any(k in gift for k in ['洗衣', '洗碗', '清潔劑', '皂', '洗髮', '牙膏']): val = 50
    elif any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '抽取式']): val = 30
    else: val = 40
    premium_brands = ['Kitty', 'Snoopy', '史努比', '迪士尼', 'Disney', 'LINE', '角落小夥伴', '卡娜赫拉', '拉拉熊', '小小兵', '皮克斯']
    if any(k.lower() in gift.lower() for k in premium_brands): val = int(val * 1.25)
    if is_top_level:
        is_voucher = any(k in gift for k in ['禮券', '商品卡', '提貨券', '購物金', '折扣券', '兌換券', '貴賓券'])
        is_digital = any(k in gift for k in ['電子', '簡訊', 'APP', '點數', '虛擬'])
        if is_digital: cost = 0
        else: cost = 15 if is_voucher else 20
        val = max(val - cost, 0)
    return val

def estimate_5year_total(text):
    if pd.isna(text) or str(text).strip() in ['', 'nan']: return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        item = re.sub(r'^\(\d{4}\)', '', item.strip()).strip()
        if not item or item in ['無', '-', '未發放', '不發放']: continue
        total += estimate_gift_value(item)
    return total
```

**改為（用注解取代整段）：**
```python
# ============================================================
# 2. 紀念品估值模型（由 valuation.py 模組提供）
# ============================================================
# estimate_gift_value、estimate_5year_total 已由頂部 `from valuation import ...` 匯入，此處不再定義。
```

---

### 修改 3（第 155–171 行）—— 刪除 `calc_v4_cp` 與 `calc_v4_score` 定義

**找到這段：**
```python
def calc_v4_cp(row):
    price, total_val, freq = row['最近股價'], row['新版五總估'], row['五年內發放次數']
    if price <= 0 or total_val <= 0: return 0.0
    w_freq = freq / 5.0
    cp = (total_val * w_freq) / price
    return round(cp, 2)

df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

def calc_v4_score(row):
    cp, freq, cond = row['新版性價比'], row['五年內發放次數'], str(row.get('去年條件', ''))
    is_convenient = not ('身分證' in cond or '本人' in cond)
    if cp >= 2.0 and freq >= 5 and is_convenient: return '5 星'
    elif cp >= 1.0 and freq >= 4 and is_convenient: return '4 星'
    elif cp >= 0.5 and freq >= 3: return '3 星'
    elif cp >= 0.1: return '2 星'
    else: return '1 星'

df['新版推薦評分'] = df.apply(calc_v4_score, axis=1)
```

**改為（只保留 df.apply 呼叫，刪除函式定義）：**
```python
# calc_v4_cp、calc_v4_score 已由頂部 `from valuation import ...` 匯入，此處不再定義。
df['新版性價比'] = df.apply(calc_v4_cp, axis=1)

df['新版推薦評分'] = df.apply(calc_v4_score, axis=1)
```

---

### 步驟二驗證

完成以上 3 個修改後，執行：
```
python scripts/core/evaluate_stocks_supa.py
```

**成功的輸出應該包含（沒有任何 Error）：**
```
Fetching latest data from Supabase...
Successfully loaded XX rows from Supabase.
Evaluating Model V4.2 calculations...
Evaluation complete for XX stocks.
Successfully updated all records in Supabase.
Process finished.
```

**如果看到以下錯誤，停下來回報給用戶，不要繼續：**
- `ModuleNotFoundError: No module named 'valuation'` → sys.path 設定有問題
- `KeyError: '新版五總估'` → 修改 2 的刪除範圍找錯，或 valuation.py 本身有問題

Git 指令（驗證成功後執行）：
```
git add scripts/core/evaluate_stocks_supa.py
git commit -m "refactor(core): remove duplicate valuation logic from evaluate_stocks_supa.py"
git push origin master
```
