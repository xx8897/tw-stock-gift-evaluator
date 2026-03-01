const EXCEL_URL = '2021-2025_推薦評分.xlsx';
let globalData = [];
let filteredData = [];
let currentSort = { column: 'score', direction: 'desc' };
let currentPage = 1;
let pageSize = 25;

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('tableBody');
    const loadingState = document.getElementById('loadingState');
    const tableWrapper = document.getElementById('tableWrapper');
    const noResults = document.getElementById('noResults');
    const lastUpdated = document.getElementById('last-updated');
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn input[type="radio"]');
    const annualFilter = document.getElementById('annualFilter');
    const sortableHeaders = document.querySelectorAll('th.sortable');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const resultCount = document.getElementById('resultCount');
    const pagination = document.getElementById('pagination');

    // Modal Elements
    const infoModal = document.getElementById('infoModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    try {
        // Fetch Excel File
        const response = await fetch(EXCEL_URL);
        if (!response.ok) throw new Error('無法載入 Excel 檔案，請確認檔案是否存在於儲存庫中。');
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
        tableWrapper.classList.remove('hidden');

        // Setup Event Listeners
        searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });
        filterBtns.forEach(btn => btn.addEventListener('change', (e) => {
            document.querySelectorAll('.filter-btn').forEach(l => l.classList.remove('active'));
            if (e.target.checked) e.target.parentElement.classList.add('active');
            currentPage = 1;
            renderTable();
        }));
        annualFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });

        pageSizeSelect.addEventListener('change', () => {
            pageSize = parseInt(pageSizeSelect.value);
            currentPage = 1;
            renderTable();
        });

        // Modal Event Listeners
        if (openModalBtn && closeModalBtn && infoModal) {
            openModalBtn.addEventListener('click', () => infoModal.classList.remove('hidden'));
            closeModalBtn.addEventListener('click', () => infoModal.classList.add('hidden'));
            infoModal.addEventListener('click', (e) => {
                if (e.target === infoModal) infoModal.classList.add('hidden');
            });
        }

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'desc';
                }

                sortableHeaders.forEach(h => {
                    h.classList.remove('active');
                    h.querySelector('i.fa-solid.fa-sort-up, i.fa-solid.fa-sort-down')?.classList?.replace('fa-sort-up', 'fa-sort')?.replace('fa-sort-down', 'fa-sort');
                });
                header.classList.add('active');

                const sortIcon = header.querySelector('i.fa-solid');
                if (sortIcon) sortIcon.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';

                currentPage = 1;
                renderTable();
            });
        });

        // Set default sort state visually
        const defaultHeader = document.querySelector('th[data-sort="score"]');
        if (defaultHeader) {
            defaultHeader.classList.add('active');
            const icon = defaultHeader.querySelector('i.fa-solid');
            if (icon) icon.className = 'fa-solid fa-sort-down';
        }

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
        filteredData = globalData.filter(row => {
            const matchesSearch = row.id.includes(query) ||
                row.name.toLowerCase().includes(query) ||
                row.gift.toLowerCase().includes(query);

            let matchesStar = true;
            if (starFilter === '5') matchesStar = row.score.startsWith('5');
            else if (starFilter === '4') matchesStar = row.score.startsWith('5') || row.score.startsWith('4');

            const matchesAnnual = isAnnualOnly ? row.freq >= 5 : true;
            return matchesSearch && matchesStar && matchesAnnual;
        });

        // 2. Sort
        filteredData.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];

            if (currentSort.column === 'score') {
                valA = parseInt(valA.charAt(0)) || 0;
                valB = parseInt(valB.charAt(0)) || 0;
            }

            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        const total = filteredData.length;
        const totalPages = Math.ceil(total / pageSize);
        if (currentPage > totalPages) currentPage = 1;

        // 3. Update result count
        resultCount.textContent = `共 ${total} 筆結果`;

        if (total === 0) {
            tableWrapper.classList.add('hidden');
            noResults.classList.remove('hidden');
            pagination.innerHTML = '';
            return;
        }

        tableWrapper.classList.remove('hidden');
        noResults.classList.add('hidden');

        // 4. Render current page rows
        const start = (currentPage - 1) * pageSize;
        const pageData = filteredData.slice(start, start + pageSize);

        tableBody.innerHTML = '';
        pageData.forEach(row => {
            const tr = document.createElement('tr');
            const starNum = parseInt(row.score.charAt(0)) || 1;
            const displayGift = row.gift.length > 25 ? row.gift.substring(0, 25) + '…' : row.gift;
            const giftTooltip = row.gift.length > 25 ? `title="${row.gift.replace(/"/g, '&quot;')}"` : '';

            tr.innerHTML = `
                <td class="stock-id">${row.id}</td>
                <td class="stock-name">${row.name}</td>
                <td class="price">${row.price.toFixed(2)}</td>
                <td ${giftTooltip}>${displayGift}</td>
                <td>${row.freq} <span style="opacity:0.5; font-size: 0.8em">/ 5</span></td>
                <td class="cp-value">${row.cp.toFixed(2)}</td>
                <td><span class="badge badge-${starNum}">${row.score}</span></td>
            `;
            tableBody.appendChild(tr);
        });

        // 5. Render pagination
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        pagination.innerHTML = '';
        if (totalPages <= 1) return;

        const createBtn = (label, page, isActive = false, isDisabled = false) => {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (isActive ? ' active' : '') + (isDisabled ? ' disabled' : '');
            btn.innerHTML = label;
            btn.disabled = isDisabled;
            if (!isDisabled) {
                btn.addEventListener('click', () => {
                    currentPage = page;
                    renderTable();
                    // Scroll table into view
                    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
            return btn;
        };

        pagination.appendChild(createBtn('<i class="fa-solid fa-chevron-left"></i>', currentPage - 1, false, currentPage === 1));

        // Show limited page numbers with ellipsis
        let pages = [];
        if (totalPages <= 7) {
            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            pages = [1];
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        pages.forEach(p => {
            if (p === '...') {
                const span = document.createElement('span');
                span.className = 'page-ellipsis';
                span.textContent = '…';
                pagination.appendChild(span);
            } else {
                pagination.appendChild(createBtn(p, p, p === currentPage));
            }
        });

        pagination.appendChild(createBtn('<i class="fa-solid fa-chevron-right"></i>', currentPage + 1, false, currentPage === totalPages));
    }
});
