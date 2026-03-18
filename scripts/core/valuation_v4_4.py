import re

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
            is_voucher_only = all(any(k in p for k in ['禮券', '商品卡', '提貨券', '購物金', '兌換卷', '兌換券', '點數', '抵用卡']) for p in parts)
            is_digital = all(any(k in p for k in ['電子', '簡訊', 'APP', '點數', '虛擬']) for p in parts)
            if is_digital: cost = 0
            else: cost = 15 if is_voucher_only else 20
            return max(int(raw_total) - cost, 0)
        return raw_total

    gift = name_clean
    val = 0
    utility_multiplier = 1.0
    
    # === 1. 面額捕捉 ===
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
    
    # === 2. 基礎市價 (含 100+ 項分類) ===
    if val == 0:
        # 票券與高價特賞
        if any(k in gift for k in ['禮物卡', '商品卡', '提貨券', '提貨卡', '提用券', '購物金', '折扣券', '兌換卷', '兌換券', '貴賓券', '抵用', '折價', '優惠', '體驗', '沖印卷', 'fun玩卡', '會員卡', '餐券', '兌換卡']): val = 100
        elif any(k in gift for k in ['大魯閣']): val = 800
        elif any(k in gift for k in ['王品']): val = 400
        elif any(k in gift for k in ['六福', '劍湖山', '動物園', '門票', '主題樂園']): val = 1199
        elif any(k in gift for k in ['佐登妮絲', '柏文']): val = 300
        
        # 家電與高階寢具
        elif any(k in gift for k in ['電風扇', '循環扇', '捕蚊燈', '舒緩儀', '按摩儀', '檯燈', '按摩', '吸塵器', '電子鍋', '研磨器', '果汁機']): val = 400
        elif any(k in gift for k in ['行動電源', '耳機', '藍芽', '體重計', '冰壩杯', '計算機']): val = 300
        elif any(k in gift for k in ['法蘭絨', '珊瑚絨', '毯', '被', '圍巾', '披肩', '頸枕', '圍脖', '脖圍']): val = 250
        elif any(k in gift for k in ['炒鍋', '平底鍋', '鑄鐵鍋', '烤盤', '煎鍋', '砂鍋']): val = 400
        
        # 3C, 工具, 廚具
        elif any(k in gift for k in ['湯鍋', '燉鍋', '壓力鍋']): val = 300
        elif any(k in gift for k in ['隨身碟', '記憶卡', 'SIM卡', 'SIM']): val = 150
        elif any(k in gift for k in ['線', '充電', 'USB', 'Type-C', '傳輸線', '快充', '電池']): val = 150
        elif any(k in gift for k in ['工具組', '工具套裝', '螺絲起子', '五金', '開瓶器', '開罐器', '刨刀', '剪刀', '削皮', '磨刀', '手套', '膠帶', '手電筒', '照明', '夜燈', '警示燈', '電子秤', '行李秤', '捲尺']): val = 180
        elif any(k in gift for k in ['露營燈', '帳篷', '野餐墊', '休閒椅', '折疊椅', '摺疊椅', '摺疊座', '小板凳', '護膝', '雨衣', '保溫瓶', '冰壩杯', '扣環', '隨身杯']): val = 200
        
        # 鋼鐵與包袋
        elif any(k in gift for k in ['不鏽鋼', '不銹鋼', '304', '316', '真空', '保溫', '隔熱']):
            if any(k in gift for k in ['保溫杯', '保溫瓶', '燜燒罐', '隨行杯']): val = 200
            elif any(k in gift for k in ['便當盒', '餐盒', '飯盒']): val = 150
            else: val = 120
        elif any(k in gift for k in ['包', '袋', '提袋', '背包', '提籃', '保冷', '收納', '束口', '零錢包', '化妝包', '置衣籃', '束帶', '綁帶']): val = 100  
        
        # 玻璃瓷器餐具
        elif any(k in gift for k in ['雪平鍋', '奶鍋', '單把鍋']): val = 150
        elif any(k in gift for k in ['陶瓷', '瓷', '骨瓷', '耐熱玻璃', '強化玻璃', '康寧', '樂美雅', 'Luminarc', '真瓷', '白玉玻璃', '玻璃']):
            if any(k in gift for k in ['盤', '碟']): val = 100
            elif any(k in gift for k in ['碗', '盅']): val = 80
            else: val = 120
        elif any(k in gift for k in ['杯', '頂', '馬克杯', '冷水壺', '水壺', '水瓶', '胖胖瓶', '沖茶', '儲物罐', '保鮮盒', '保鮮密封', '保鮮罐', '密封扣', '控油壺', '分裝瓶', '瓶', '壺', '罐', '餐墊', '杯墊', '砧板', '洗漱墊', '珪藻土', '對杯', '杯組', '碗盤組', '碗組', '瓷碗', '餐寶', '導磁盤', '豐收盤', '斗笠碗']): val = 100
        
        # 雜物與雨傘
        elif any(k in gift for k in ['修容', '指甲剪', '指甲鉗', '梳', '刷', '修甲', '美容']): val = 80
        elif '傘' in gift:
            if any(k in gift for k in ['自動', '抗UV', '折傘']): val = 200
            else: val = 150
        elif any(k in gift for k in ['毛巾', '擦手巾', '運動巾', '浴巾', '方巾', '涼感巾', '拭鏡布', '抹布', '擦拭布', '清潔棉', '清潔布', '3C布']): val = 80
        elif any(k in gift for k in ['橄欖油', '葵花油', '苦茶油', '食用油', '麻油', '醬油', '油膏', '料理海鹽', '鹽', '調味', '調味瓶', '密封罐', '海鹽']): val = 120
        elif any(k in gift for k in ['米', '白米', '香米', '糙米', '麵條', '長麵', '粉絲', '乾拌麵', '泡麵', '碗麵', '義大利麵', '高湯麵', '桶麵', '湯麵']): val = 70
        elif any(k in gift for k in ['禮盒', '組', '體驗']) and any(f in gift for f in ['食', '麵', '粥', '湯', '泡', '米', '茶', '咖啡', '燕麥', '餅乾', '零食']): val = 60
        elif any(k in gift for k in ['肉鬆', '蛋捲', '餅乾', '堅果', '零食', '罐頭', '粥', '麵', '泡菜', '豆腐', '果汁', '甘栗', '海苔', '海燕', '滴魚精', '燕窩', '伴手禮', '火鍋', '湯', '禮品', '膳食', '系列', '仙草', '花生仁湯', '咖哩', '鮪魚', '休閒食品', '調理包']): val = 60
        elif any(k in gift for k in ['茶葉', '茶包', '咖啡', '沖泡', '飲品', '梅', '莓', '桔梗飲', '美式', '中熱美']): val = 80
        
        # 洗護防護保健
        elif any(k in gift for k in ['防疫', '口罩', '面罩', '酒精', '洗手', '手工皂', '香皂', '茶摳', '石鹼', '沐浴', '洗髮', '潔手', '牙膏', '潔牙', '牙線', '護手霜', '保養', '精華', '面膜', '化妝', '彩妝', '洗面', '潔面', '洗臉', '噴霧', '精油', '軟膏', '抗菌液', '除菌液', '防護粉', '防護噴霧', '潤澤粉', '清廢茶', '皂', '洗淨', '染髮']): val = 60
        elif any(k in gift for k in ['洗衣', '洗碗', '清潔劑', '皂', '洗潔', '小蘇打粉', '除霉', '防霉', '除黴', '去污', '抹布', '海綿', '菜瓜布', '洗滌', '清潔棉', '保鮮膜', '抗菌液', '清淨', '日用品']): val = 50
        elif any(k in gift for k in ['濕紙巾', '衛生紙', '面紙', '抽取式', '柔濕巾', '水濕巾']): val = 30
        
        # 保健品
        elif any(k in gift for k in ['錠', '維他命', '膠囊', '益生菌', '葉黃素', '魚油', '牛樟芝', '保健', '酵素', '發泡錠', '精萃', '精粹', '舒衛粉', '蓉憶記', '精華', '膠原', '倍力莓']): val = 100
        
        # 文具與其他廢物
        elif any(k in gift for k in ['筆', '原子筆', '鋼珠筆', '螢光筆', '便利貼', '筆記本', '捲尺', '撲克牌', '襪', '袖套', '帽']): val = 50
        elif any(k in gift for k in ['手機架', '支架', '手機座', '手機環', '掛繩', '停車號碼牌']): val = 50
        elif any(k in gift for k in ['餐具', '筷', '匙', '叉']): val = 60
        
        else: val = 40
        
    # === 3. 實用性懲罰 (0.3x) ===
    # 定義缺乏實用價值、難以轉手的物品
    penalize_keywords = [
        # 限制級折價券 (需付費使用)
        '折價券', '優惠券', '體驗券', '抵用卡',
        # 清潔過剩
        '手工皂', '香皂', '茶摳', '石鹼', '洗碗精', '小蘇打粉', '除霉', '防霉', '除黴', '去污', '抹布', '海綿', '菜瓜布',
        # 不明保健與護膚品
        '錠', '維他命', '膠囊', '益生菌', '葉黃素', '魚油', '牛樟芝', '保健', '精萃', '精粹', '滴魚精',
        '面膜', '精華', '護手霜', '化妝', '彩妝', '沐浴', '洗手', '潔手', '護髮', '染髮', '軟膏',
        # 無用包袋與雜物
        '包', '袋', '提袋', '背包', '保冷', '收納', '束口', '夾鏈袋',
        '筆', '便利貼', '筆記本', '捲尺', '支架', '手機座', '手機架', '掛繩', '鑰匙', '指甲', '修容', '襪', '袖套'
    ]
    # 保險名單：現金券與抵用券不受影響
    safe_vouchers = ['全家', '7-11', '統一', '超商', '禮物卡', '禮券', '商品卡', '現金']
    if any(k in gift for k in penalize_keywords):
        if not any(k in gift for k in safe_vouchers):
            utility_multiplier = 0.3
            
    # 面額類如果包含「抵用/折價/體驗」，常常需要高額消費，也需要懲罰
    if '抵用' in gift or '折價' in gift or '優惠' in gift or '體驗' in gift:
        if not any(k in gift for k in safe_vouchers):
            utility_multiplier = 0.3

    # === 4. 品牌聯名加成 (1.25x) ===
    premium_brands = ['Kitty', 'Snoopy', '史努比', '迪士尼', 'Disney', 'LINE', '角落小夥伴', '卡娜赫拉', '拉拉熊', '小小兵', '皮克斯', '咖波', '雙人', '康寧', '樂美雅']
    if any(k.lower() in gift.lower() for k in premium_brands): 
        val = int(val * 1.25)
        
    # 套用實用性懲罰
    val = int(val * utility_multiplier)
        
    # === 5. 取領成本扣除 (大於0才能扣) ===
    if is_top_level:
        is_digital = any(k in gift for k in ['電子', '簡訊', 'APP', '點數', '虛擬'])
        is_voucher = any(k in gift for k in ['禮券', '商品卡', '提貨券', '購物金', '折扣券', '兌換卷', '兌換券', '貴賓券', '票券', '商品券', '抵用', '提貨卡', '折價券', '優惠券'])
        if is_digital: cost = 0
        else: cost = 15 if is_voucher else 20
        val = max(val - cost, 0)
        
    return val

def estimate_5year_total(text):
    if text is None or str(text).strip() in ['', 'nan', 'None']: return 0
    items = str(text).split('\n')
    total = 0
    for item in items:
        item = re.sub(r'^\(\d{4}\)', '', item.strip()).strip()
        if not item or item in ['無', '-', '未發放', '不發放']: continue
        total += estimate_gift_value(item)
    return total

def calc_v4_cp(row):
    price, total_val, freq = row['最近股價'], row['新版五總估'], row['五年內發放次數']
    if price <= 0 or total_val <= 0: return 0.0
    w_freq = freq / 5.0
    cp = (total_val * w_freq) / price
    return round(cp, 2)

def calc_v4_score(row):
    cp, freq, cond = row['新版性價比'], row['五年內發放次數'], str(row.get('去年條件', ''))
    is_convenient = not ('身分證' in cond or '本人' in cond)
    if cp >= 2.0 and freq >= 5 and is_convenient: return '5 星'
    elif cp >= 1.0 and freq >= 4 and is_convenient: return '4 星'
    elif cp >= 0.5 and freq >= 3: return '3 星'
    elif cp >= 0.1: return '2 星'
    else: return '1 星'
