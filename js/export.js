/**
 * export.js — 匯出持有清單模組
 * 功能：將已登入用戶的「已持有」清單匯出為 CSV 檔案。
 */

function exportPurchasedList() {
    if (!AppState.currentUser) return; // 未登入不可匯出

    // 1. 取得昵稱與日期，組成檔名
    const user = AppState.currentUser;
    const nickname = user.user_metadata?.nickname || user.email?.split('@')[0] || 'user';
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `${nickname}_stock_${yyyy}${mm}${dd}.csv`;

    // 2. 從 AppState 取出已持有股號
    const purchased = Array.from(AppState.purchasedStocks);
    if (purchased.length === 0) {
        alert('您的持有清單目前是空的，沒有可匯出的資料！');
        return;
    }

    // 3. 準備 CSV 標頭與資料列
    let csvContent = '\uFEFF'; // 加入 BOM 以支援 Excel 中文顯示
    csvContent += '股號,公司名稱\n';

    // 4. 尋找對應的公司名稱並加入 CSV
    purchased.forEach(stockId => {
        // 從 globalData 找公司資訊
        const stockData = AppState.globalData.find(s => s.id === stockId);
        const name = stockData ? stockData.name : '未知公司';
        
        // 為了避免名稱有逗號導致 CSV 跑版，將公司名稱用雙引號包起來
        csvContent += `${stockId},"${name}"\n`;
    });

    // 5. 透過 Blob 與 <a> 標籤觸發下載
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // 清理 DOM
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 註冊至全域
window.exportPurchasedList = exportPurchasedList;
