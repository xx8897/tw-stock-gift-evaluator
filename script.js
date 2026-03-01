const EXCEL_URL = '2021-2025_推薦評分.xlsx';
let globalData = [];
let currentSort = { column: 'score', direction: 'desc' };

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('tableBody');
    const loadingState = document.getElementById('loadingState');
    const dataTable = document.getElementById('dataTable');
    const noResults = document.getElementById('noResults');
    const lastUpdated = document.getElementById('lastUpdated');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn input[type="radio"]');
    const annualFilter = document.getElementById('annualFilter');
    const sortableHeaders = document.querySelectorAll('th.sortable');

    try {
        // Fetch Excel File
        const response = await fetch(EXCEL_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        const arrayBuffer = await response.arrayBuffer();

        // Process File Details for Last Updated
        const lastMod = response.headers.get('Last-Modified');
        if (lastMod) {
            const date = new Date(lastMod);
            lastUpdated.innerHTML = `<i class="fa-regular fa-calendar-check"></i> 最後更新: ${date.toLocaleDateString('zh-TW')} ${date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            lastUpdated.innerHTML = `<i class="fa-solid fa-check"></i> 同步至最新版`;
        }

        // Parse Excel with SheetJS
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        // Map data to clean objects
        globalData = rawData.map(row => ({
            id: String(row['股號'] || ''),
            name: String(row['公司'] || ''),
            price: parseFloat(row['最新股價']) || 0,
            gift: String(row['上次紀念品'] || ''),
            freq: parseInt(row['五年內發放次數']) || 0,
            cp: parseFloat(row['新版性價比']) || 0,
            score: String(row['新版推薦評分'] || '1 星')
        }));

        loadingState.classList.add('hidden');
        dataTable.classList.remove('hidden');

        // Setup Event Listeners
        searchInput.addEventListener('input', renderTable);
        filterBtns.forEach(btn => btn.addEventListener('change', (e) => {
            // Update active styling
            document.querySelectorAll('.filter-btn').forEach(l => l.classList.remove('active'));
            if (e.target.checked) e.target.parentElement.classList.add('active');
            renderTable();
        }));
        annualFilter.addEventListener('change', renderTable);

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'desc'; // Default to desc for new sorts
                }

                // Update header classes
                sortableHeaders.forEach(h => h.classList.remove('active'));
                header.classList.add('active');

                const icon = header.querySelector('i');
                icon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';

                renderTable();
            });
        });

        // Set default sort state visually
        const defaultHeader = document.querySelector('th[data-sort="score"]');
        defaultHeader.classList.add('active');
        defaultHeader.querySelector('i').className = 'fa-solid fa-sort-down';

        renderTable();

    } catch (error) {
        console.error("Error loading Excel:", error);
        loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;"></i>
            <p>無法載入股票資料</p>
            <p style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.5rem;">${error.message}</p>
        `;
    }

    function renderTable() {
        const query = searchInput.value.toLowerCase();
        const starFilter = document.querySelector('input[name="star-filter"]:checked').value;
        const isAnnualOnly = annualFilter.checked;

        // 1. Filter
        let filteredData = globalData.filter(row => {
            // Search Match
            const matchesSearch = row.id.includes(query) ||
                row.name.toLowerCase().includes(query) ||
                row.gift.toLowerCase().includes(query);

            // Star Match
            let matchesStar = true;
            if (starFilter === '5') {
                matchesStar = row.score.includes('5');
            } else if (starFilter === '4') {
                matchesStar = row.score.includes('5') || row.score.includes('4');
            }

            // Annual Match
            const matchesAnnual = isAnnualOnly ? row.freq >= 5 : true;

            return matchesSearch && matchesStar && matchesAnnual;
        });

        // 2. Sort
        filteredData.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];

            // Special handling for string scores
            if (currentSort.column === 'score') {
                valA = parseInt(valA.charAt(0)) || 0;
                valB = parseInt(valB.charAt(0)) || 0;
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Render
        tableBody.innerHTML = '';

        if (filteredData.length === 0) {
            dataTable.classList.add('hidden');
            noResults.classList.remove('hidden');
        } else {
            dataTable.classList.remove('hidden');
            noResults.classList.add('hidden');

            filteredData.forEach(row => {
                const tr = document.createElement('tr');

                // Get Star Number for Badge
                const starNum = parseInt(row.score.charAt(0)) || 1;
                let badgeClass = `badge-${starNum}`;

                // Truncate Gift if too long
                const displayGift = row.gift.length > 20 ? row.gift.substring(0, 20) + '...' : row.gift;
                const giftTooltip = row.gift.length > 20 ? `title="${row.gift}"` : '';

                tr.innerHTML = `
                    <td class="stock-id">${row.id}</td>
                    <td class="stock-name">${row.name}</td>
                    <td class="price">${row.price.toFixed(2)}</td>
                    <td ${giftTooltip}>${displayGift}</td>
                    <td>${row.freq} <span style="opacity:0.5; font-size: 0.8em">/ 5</span></td>
                    <td class="cp-value">${row.cp.toFixed(2)}</td>
                    <td><span class="badge ${badgeClass}">${row.score}</span></td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }
});
