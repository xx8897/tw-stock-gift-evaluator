import pandas as pd
import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_gift_details(gift_name):
    # 複製 valuation.py 的邏輯以計算明細
    gift = str(gift_name).strip()
    val = 0
    utility_multiplier = 1.0
    brand_multiplier = 1.0
    cost = 20 # 預設實體
    is_digital = False
    is_voucher = False

    # 1. 面額捕捉
    m = re.search(r'(\d[\d,]*)元', gift)
    if m: val = min(int(m.group(1).replace(',', '')), 5000)
    else:
        m = re.search(r'\$\s*(\d[\d,]*)', gift)
        if m: val = min(int(m.group(1).replace(',', '')), 5000)
        else:
            m = re.search(r'抵用.*?(\d[\d,]*)', gift)
            if m: val = min(int(m.group(1).replace(',', '')), 5000)
            else:
                m = re.search(r'(\d[\d,]*)點', gift)
                if m: val = min(int(m.group(1).replace(',', '')), 5000)

    base_val = val
    if val == 0:
        # 票券與高價特賞
        if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '提貨卡', '提用券', '購物金', '折扣券', '兌換卷', '兌換券', '貴賓券', '抵用', '折價', '優惠', '體驗', '沖印卷', 'fun玩卡', '會員卡', '餐券', '兌換卡']): val = 100
        elif any(k in gift for k in ['大魯閣']): val = 800
        elif any(k in gift for k in ['王品']): val = 400
        elif any(k in gift for k in ['六福', '劍湖山', '動物園', '門票', '主題樂園']): val = 1199
        elif any(k in gift for k in ['佐登妮絲', '柏文']): val = 300
        elif any(k in gift for k in ['電風扇', '循環扇', '捕蚊燈', '舒緩儀', '按摩儀', '檯燈', '按摩', '吸塵器', '電子鍋', '研磨器', '果汁機']): val = 400
        elif any(k in gift for k in ['行動電源', '耳機', '藍芽', '體重計', '冰壩杯', '計算機']): val = 300
        elif any(k in gift for k in ['法蘭絨', '珊瑚絨', '毯', '被', '圍巾', '披肩', '頸枕', '圍脖', '脖圍']): val = 250
        elif any(k in gift for k in ['炒鍋', '平底鍋', '鑄鐵鍋', '烤盤', '煎鍋', '砂鍋']): val = 400
        elif any(k in gift for k in ['湯鍋', '燉鍋', '壓力鍋']): val = 300
        elif any(k in gift for k in ['隨身碟', '記憶卡', 'SIM卡', 'SIM']): val = 150
        elif any(k in gift for k in ['線', '充電', 'USB', 'Type-C', '傳輸線', '快充', '電池']): val = 150
        elif any(k in gift for k in ['工具組', '工具套裝', '螺絲起子', '五金', '開瓶器', '開罐器', '刨刀', '剪刀', '削皮', '磨刀', '手套', '膠帶', '手電筒', '照明', '夜燈', '警示燈', '電子秤', '行李秤', '捲尺']): val = 180
        elif any(k in gift for k in ['露營燈', '帳篷', '野餐墊', '休閒椅', '折疊椅', '摺疊椅', '摺疊座', '小板凳', '護膝', '雨衣', '保溫瓶', '冰壩杯', '扣環', '隨身杯']): val = 200
        elif any(k in gift for k in ['不鏽鋼', '不銹鋼', '304', '316', '真空', '保溫', '隔熱']): val = 120
        elif any(k in gift for k in ['便當盒', '餐盒', '飯盒']): val = 150
        elif any(k in gift for k in ['包', '袋', '提袋', '背包', '提籃', '保冷', '收納', '束口', '零錢包', '化妝包', '置衣籃', '束帶', '綁帶']): val = 100  
        elif any(k in gift for k in ['陶瓷', '瓷', '骨瓷', '耐熱玻璃', '強化玻璃', '康寧', '樂美雅', 'Luminarc', '真瓷', '白玉玻璃', '玻璃']): val = 120
        elif any(k in gift for k in ['杯', '頂', '馬克杯', '冷水壺', '水壺', '水瓶', '胖胖瓶', '沖茶', '儲物罐', '保鮮盒', '保鮮密封', '保鮮罐', '密封扣', '控油壺', '分裝瓶', '瓶', '壺', '罐', '餐墊', '杯墊', '砧板', '洗漱墊', '珪藻土', '對杯', '杯組', '碗盤組', '碗組', '瓷碗', '餐寶', '導磁盤', '豐收盤', '斗笠碗']): val = 100
        elif any(k in gift for k in ['碗', '盅']): val = 80
        elif any(k in gift for k in ['修容', '指甲剪', '指甲鉗', '梳', '刷', '修甲', '美容']): val = 80
        elif '傘' in gift: val = 150
        elif any(k in gift for k in ['毛巾', '擦手巾', '運動巾', '浴巾', '方巾', '涼感巾', '拭鏡布', '抹布', '擦拭布', '清潔棉', '清潔布', '3C布']): val = 80
        elif any(k in gift for k in ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油', '醬油', '油膏', '料理海鹽', '鹽', '調味', '調味瓶', '密封罐', '海鹽']): val = 120
        elif any(k in gift for k in ['米', '白米', '香米', '糙米', '麵條', '長麵', '粉絲', '乾拌麵', '泡麵', '碗麵', '義大利麵', '高湯麵', '桶麵', '湯麵']): val = 70
        elif any(k in gift for k in ['禮盒', '組', '體驗']) and any(f in gift for f in ['食', '麵', '粥', '湯', '泡', '米', '茶', '咖啡', '燕麥', '餅乾', '零食']): val = 60
        elif any(k in gift for k in ['肉鬆', '蛋捲', '餅乾', '堅果', '零食', '罐頭', '粥', '麵', '泡菜', '豆腐', '果汁', '甘栗', '海苔', '海燕', '滴魚精', '燕窩', '伴手禮', '火鍋', '湯', '禮品', '膳食', '系列', '仙草', '花生仁湯', '咖哩', '鮪魚', '休閒食品', '調理包']): val = 60
        elif any(k in gift for k in ['茶葉', '茶包', '咖啡', '沖泡', '飲品', '梅', '莓', '桔梗飲', '美式', '中熱美']): val = 80
        elif any(k in gift for k in ['防疫', '口罩', '面罩', '酒精', '洗手', '手工皂', '香皂', '茶摳', '石鹼', '沐浴', '洗髮', '潔手', '牙膏', '潔牙', '牙線', '護手霜', '保養', '精華', '面膜', '化妝', '彩妝', '洗面', '潔面', '洗臉', '噴霧', '精油', '軟膏', '抗菌液', '除菌液', '防護粉', '防護噴霧', '潤澤粉', '清廢茶', '皂', '洗淨', '染髮']): val = 60
        elif any(k in gift for k in ['洗衣', '洗碗', '清潔劑', '皂', '洗潔', '小蘇打粉', '除霉', '防霉', '除黴', '去污', '抹布', '海綿', '菜瓜布', '洗滌', '清潔棉', '保鮮膜', '抗菌液', '清淨', '日用品']): val = 50
        elif any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '抽取式', '柔濕巾', '水濕巾']): val = 30
        elif any(k in gift for k in ['錠', '維他命', '膠囊', '益生菌', '葉黃素', '魚油', '牛樟芝', '保健', '酵素', '發泡錠', '精萃', '精粹', '舒衛粉', '蓉憶記', '精華', '膠原', '倍力莓']): val = 100
        elif any(k in gift for k in ['筆', '原子筆', '鋼珠筆', '螢光筆', '便利貼', '筆記本', '捲尺', '扑克牌', '襪', '袖套', '帽', '飾品', '工作圍裙', '掛勾', '號碼牌', '相片', '電池', '警示燈', '鑰匙圈', '額溫', '防蚊', '牙籤', '掛勾', 'N次貼', '飾品', '扣環', '綁帶', '課程']): val = 50
        elif any(k in gift for k in ['手機架', '支架', '手機座', '手機環', '掛繩']): val = 50
        elif any(k in gift for k in ['餐具', '筷', '匙', '叉']): val = 60
        else: val = 40

    base_val = val

    # 3. 實用性懲罰
    penalize_keywords = [
        '折價券', '優惠券', '體驗券', '抵用卡', '沖印卷', '會員卡', '餐券', '兌換卡', '折扣券',
        '手工皂', '香皂', '茶摳', '石鹼', '洗碗精', '小蘇打粉', '除霉', '防霉', '除黴', '去污', '抹布', '海綿', '菜瓜布', '清潔棉', '清淨', '抗菌液', '洗淨', '自來水',
        '錠', '維他命', '膠囊', '益生菌', '葉黃素', '魚油', '牛樟芝', '保健', '精萃', '精粹', '粉', '滴魚精', '膠原', '清廢茶', '蓉憶記',
        '面膜', '精華', '護手霜', '化妝', '彩妝', '沐浴', '洗手', '潔手', '護髮', '染髮', '軟膏', '凝露', '噴霧', '精油', '護膚', '藥', '保養', '洗面', '潔面', '洗臉', '倍力莓',
        '包', '袋', '提袋', '背包', '保冷', '收納', '束口', '夾鏈袋', '置衣籃', '束帶', '綁帶', '提籃', '置物盒',
        '筆', '便利貼', '筆記本', '捲尺', '支架', '手機座', '手機架', '掛繩', '鑰匙', '指甲', '修容', '襪', '袖套', '工作圍裙', '掛勾', '額溫', '防蚊', '牙籤', 'N次貼', '鏡', '布', '號碼牌', '飾品', '修甲', '美容', '衣架', '刷'
    ]
    safe_vouchers = ['全家', '7-11', '統一', '超商', '禮物卡', '禮券', '商品卡', '現金']
    if any(k in gift for k in penalize_keywords) and not any(k in gift for k in safe_vouchers):
        utility_multiplier = 0.3
    if ('抵用' in gift or '折價' in gift or '優惠' in gift or '體驗' in gift) and not any(k in gift for k in safe_vouchers):
        utility_multiplier = 0.3

    # 4. 品牌聯名加成
    premium_brands = ['Kitty', 'Snoopy', '史努比', '迪士尼', 'Disney', 'LINE', '角落小夥伴', '卡娜赫拉', '拉拉熊', '小小兵', '皮克斯', '咖波', '雙人', '康寧', '樂美雅']
    if any(k.lower() in gift.lower() for k in premium_brands): 
        brand_multiplier = 1.25

    val_after_mult = int(base_val * utility_multiplier * brand_multiplier)

    # 5. 成本
    is_digital = any(k in gift for k in ['電子', '簡訊', 'APP', '點數', '虛擬'])
    is_voucher = any(k in gift for k in ['禮券', '商品卡', '提貨券', '購物金', '折扣券', '兌換卷', '兌換券', '貴賓券', '票券', '商品券', '抵用', '提貨卡', '折價券', '優惠券'])
    
    if is_digital: cost = 0
    elif is_voucher: cost = 15
    else: cost = 20

    final_val = max(val_after_mult - cost, 0)

    return {
        "base": base_val,
        "utility": utility_multiplier,
        "brand": brand_multiplier,
        "cost": cost,
        "final": final_val,
        "is_penalized": utility_multiplier == 0.3,
        "is_premium": brand_multiplier == 1.25
    }

def generate():
    df_main = pd.read_excel('data/2021-2025_推薦v2.xlsx')
    df_em = pd.read_excel('data/興櫃的資料_updated.xlsx')

    all_gifts_raw = []
    def extract(text):
        if pd.isna(text): return []
        return [re.sub(r'^\(\d{4}\)', '', i.strip()).strip() for i in str(text).split('\n') if i.strip()]

    for t in df_main['五年發放紀念品'].tolist() + df_em['五年發放紀念品'].tolist():
        all_gifts_raw.extend(extract(t))

    unique_gifts = sorted(set(all_gifts_raw))
    
    categories = {
        "🎫 票券與高價特賞 (1199-100元)": {
            "門票 (1199元)": ['六福', '劍湖山', '動物園', '門票', '主題樂園'],
            "大魯閣 (800元)": ['大魯閣'],
            "王品 (400元)": ['王品'],
            "體驗券 (300元)": ['佐登妮絲', '柏文'],
            "禮券/卡券 (100元)": ['禮物卡', '商品卡', '提貨券', '提貨卡', '提用券', '購物金', '折扣券', '兌換卷', '兌換券', '貴賓券', '抵用', '折價', '優惠', '體驗', '沖印卷', 'fun玩卡', '會員卡', '餐券', '兌換卡']
        },
        "⚡ 3C 與家用電器 (400-150元)": {
            "小型家電 (400元)": ['電風扇', '循環扇', '捕蚊燈', '舒緩儀', '按摩儀', '檯燈', '按摩', '吸塵器', '電子鍋', '研磨器', '果汁機'],
            "個人電子/冰壩杯 (300元)": ['行動電源', '耳機', '藍芽', '體重計', '冰壩杯', '計算機'],
            "記憶體/線材/電池 (150元)": ['隨身碟', '記憶卡', 'SIM卡', 'SIM', '線', '充電', '充電線', 'USB', 'Type-C', '傳輸線', '快充', '電池']
        },
        "🍳 寢具與大型烹飪器具 (400-150元)": {
            "大型煎炒鍋 (400元)": ['炒鍋', '平底鍋', '鑄鐵鍋', '烤盤', '煎鍋', '砂鍋'],
            "大型燉煮鍋 (300元)": ['湯鍋', '燉鍋', '壓力鍋'],
            "保暖布飾 (250元)": ['法蘭絨', '珊瑚絨', '毯', '被', '圍巾', '披肩', '頸枕', '圍脖', '脖圍'],
            "小型烹飪鍋 (150元)": ['雪平鍋', '奶鍋', '單把鍋']
        },
        "🛠️ 五金工具與戶外用品 (200-150元)": {
            "戶外配件與機能傘物 (200元)": ['露營燈', '帳篷', '野餐墊', '休閒椅', '折疊椅', '摺疊椅', '摺疊座', '小板凳', '護膝', '雨衣', '保溫瓶', '冰壩杯', '扣環', '隨身杯', '自動傘', '抗UV傘', '折傘'],
            "五金工具/捲尺燈具 (180元)": ['工具組', '工具套裝', '螺絲起子', '五金', '開瓶器', '開罐器', '刨刀', '剪刀', '削皮', '磨刀', '手套', '膠帶', '手電筒', '照明', '夜燈', '警示燈', '電子秤', '行李秤', '捲尺', '板手', '工具箱', '磨刀器'],
            "普通傘 (150元)": ['傘']
        },
        "🍽️ 不鏽鋼與收納包袋/餐具 (200-60元)": {
            "不鏽鋼保溫/瓶杯 (200元)": ['保溫杯', '保溫瓶', '燜燒罐', '隨行杯'],
            "不鏽鋼餐便當盒 (150元)": ['便當盒', '餐盒', '飯盒'],
            "包包與提袋 (100元)": ['包', '袋', '提袋', '背包', '提籃', '保冷', '收納', '束口', '零錢包', '化妝包', '置衣籃', '束帶', '綁帶'],
            "有牌玻璃陶瓷/控油壺 (100元)": ['盤', '碟', '杯', '頂', '馬克杯', '冷水壺', '水壺', '水瓶', '胖胖瓶', '沖茶', '儲物罐', '保鮮盒', '保鮮密封', '保鮮罐', '密封扣', '控油壺', '分裝瓶', '瓶', '壺', '罐', '餐墊', '杯墊', '砧板', '洗漱墊', '珪藻土', '對杯', '杯組', '碗盤組', '碗組', '瓷碗', '餐寶', '導磁盤', '豐收盤', '斗笠碗', '陶瓷', '瓷', '骨瓷', '耐熱玻璃', '強化玻璃', '康寧', '樂美雅', 'Luminarc', '真瓷', '白玉玻璃', '玻璃'],
            "陶瓷玻璃碗盅 (80元)": ['碗', '盅'],
            "餐具組 (60元)": ['餐具', '筷', '匙', '叉']
        },
        "🍔 食品生鮮與日用雜貨 (120-30元)": {
            "食用油與調味品 (120元)": ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油', '醬油', '油膏', '料理海鹽', '鹽', '調味', '調味瓶', '密封罐', '海鹽'],
            "布織品與沖泡飲品 (80元)": ['毛巾', '擦手巾', '運動巾', '浴巾', '方巾', '涼感巾', '拭鏡布', '抹布', '擦拭布', '清潔棉', '清潔布', '3C布', '茶葉', '茶包', '咖啡', '沖泡', '飲品', '梅', '莓', '桔梗飲', '美式', '中熱美'],
            "個人修容 (80元)": ['修容', '指甲剪', '指甲鉗', '梳', '刷', '修甲', '美容'],
            "主食類米麵 (70元)": ['米', '白米', '香米', '糙米', '麵條', '長麵', '粉絲', '乾拌麵', '泡麵', '碗麵', '義大利麵', '高湯麵', '桶麵', '湯麵'],
            "零食與加工食品 (60元)": ['肉鬆', '蛋捲', '餅乾', '堅果', '零食', '休閒食品', '罐頭', '滴魚精', '燕窩', '仙草', '花生仁湯', '咖哩', '粥', '鮪魚', '調理包', '泡菜', '豆腐', '果汁', '甘栗', '伴手禮', '火鍋', '湯', '禮盒', '組', '體驗', '海苔', '海燕', '禮品', '膳食', '系列'],
            "防護清理保健 (60元)": ['防疫', '口罩', '面罩', '酒精', '洗手', '手工皂', '香皂', '茶摳', '石鹼', '沐浴', '洗髮', '潔手', '牙膏', '潔牙', '牙線', '護手霜', '保養', '精華', '面膜', '化妝', '彩妝', '洗面', '潔面', '洗臉', '噴霧', '精油', '軟膏', '抗菌液', '除菌液', '防護粉', '防護噴霧', '潤澤粉', '清廢茶', '皂', '洗淨', '染髮'],
            "家政清潔劑組 (50元)": ['洗衣', '洗碗', '清潔劑', '皂', '洗潔', '小蘇打粉', '除霉', '防霉', '除黴', '去污', '抹布', '海綿', '菜瓜布', '洗滌', '清潔棉', '保鮮膜', '抗菌液', '清淨', '日用品'],
            "文具小物配件 (50元)": ['筆', '原子筆', '鋼珠筆', '螢光筆', '便利貼', '筆記本', '捲尺', '扑克牌', '襪', '袖套', '帽', '飾品', '工作圍裙', '掛勾', '號碼牌', '相片', '警示燈', '鑰匙圈', '額溫', '防蚊', '牙籤', '掛勾', 'N次貼', '課程', '手機架', '支架', '手機座', '手機環', '掛繩'],
            "衛生紙類 (30元)": ['濕紙巾', '衛生紙', '面紙', '抽取式', '柔濕巾', '水濕巾']
        },
        "💊 保健品專區 (100元)": {
            "保健食品 (100元)": ['錠', '維他命', '膠囊', '益生菌', '葉黃素', '魚油', '牛樟芝', '保健', '酵素', '發泡錠', '精萃', '精粹', '舒衛粉', '蓉憶記', '精華', '膠原', '倍力莓']
        }
    }

    distribution = { cat: { subcat: [] for subcat in categories[cat] } for cat in categories }
    unclassified = []

    for g in unique_gifts:
        if g in ['無', '-', '未發放', '不發放']: continue
        details = get_gift_details(g)
        
        if re.search(r'(\d[\d,]*)元|\$|抵用.*?\d|(\d[\d,]*)點', g):
            distribution.setdefault("1️⃣ 面額直接捕捉區", {}).setdefault("精準提取項", []).append((g, details))
            continue

        matched = False
        for cat, subcats in categories.items():
            for subcat, keywords in subcats.items():
                if any(k in g for k in keywords):
                    distribution[cat][subcat].append((g, details))
                    matched = True
                    break
            if matched: break
            
        if not matched:
            if details['base'] == 40:
                unclassified.append((g, details))
            else:
                distribution.setdefault("♻️ 其他低階或衍生品項", {}).setdefault("衍生歸類項", []).append((g, details))

    with open('valuation_v4_4_mindmap.md', 'w', encoding='utf-8') as f:
        f.write("# 📊 股東會紀念品估值模型 V4.4 (全品項葉節點展開版)\n\n")
        f.write("這份文件將模型中的分類一層層剝開，您可以點擊 ► 展開各類別，直到看見**每一件歷史物品的完整名稱**，並展開看**計算明細**。\n\n---\n\n")

        for cat, subcats in distribution.items():
            f.write(f"<details>\n<summary><b>{cat}</b></summary>\n<br>\n\n")
            for subcat, items in subcats.items():
                f.write(f"<details style='margin-left: 20px;'>\n<summary><i>{subcat} - 共 {len(items)} 件</i></summary>\n<br>\n\n")
                if not items:
                    f.write("無品項\n")
                else:
                    for item, d in items:
                        flag_penalized = " ⚠️(扣分)" if d['is_penalized'] else ""
                        flag_premium = " ✨(加分)" if d['is_premium'] else ""
                        title = f"{item}{flag_penalized}{flag_premium} ➜ 最終價: {d['final']} 元"
                        
                        f.write(f"<details style='margin-left: 40px;'>\n")
                        f.write(f"<summary>{title}</summary>\n")
                        f.write(f"<ul style='margin-left: 60px;'>\n")
                        f.write(f"<li>基礎市價: {d['base']} 元</li>\n")
                        if d['is_penalized']:
                            f.write(f"<li>實用性懲罰: x 0.3</li>\n")
                        if d['is_premium']:
                            f.write(f"<li>品牌加成: x 1.25</li>\n")
                        f.write(f"<li>領取成本: - {d['cost']} 元</li>\n")
                        f.write(f"<li><b>公式計算</b>: ({d['base']} * {d['utility']} * {d['brand']}) - {d['cost']} = {d['final']} </li>\n")
                        f.write(f"</ul>\n")
                        f.write(f"</details>\n")
                f.write("\n</details>\n\n")
            f.write("</details>\n\n")

        # 未分類
        f.write("<details>\n<summary><b>🗑️ 剩餘未分類漏網之魚 (保底40元區) - 共 " + str(len(unclassified)) + " 件</b></summary>\n<br>\n\n")
        f.write("<ul style='margin-left: 20px;'>\n")
        for item, d in unclassified:
            flag_penalized = " ⚠️(扣分)" if d['is_penalized'] else ""
            title = f"{item}{flag_penalized} ➜ 最終價: {d['final']} 元"
            f.write(f"<li><details><summary>{title}</summary><ul>")
            f.write(f"<li>基礎市價: {d['base']} 元</li>")
            if d['is_penalized']: f.write("<li>實用性懲罰: x 0.3</li>")
            f.write(f"<li>領取成本: - {d['cost']} 元</li>")
            f.write(f"<li>公式: ({d['base']} * {d['utility']}) - {d['cost']} = {d['final']}</li>")
            f.write("</ul></details></li>\n")
        f.write("</ul>\n")
        f.write("\n</details>\n")

if __name__ == '__main__':
    generate()
