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
    const sortHeaders = document.querySelectorAll('th.sortable');
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const resultCount = document.getElementById('resultCount');
    const pagination = document.getElementById('pagination');
    const infoModal = document.getElementById('infoModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');

    // ── Modal ─────────────────────────────────────────────────────────
    openModalBtn?.addEventListener('click', () => infoModal.classList.remove('hidden'));
    closeModalBtn?.addEventListener('click', () => infoModal.classList.add('hidden'));
    infoModal?.addEventListener('click', e => { if (e.target === infoModal) infoModal.classList.add('hidden'); });

    // Close history popups when clicking elsewhere
    document.addEventListener('click', () => {
        document.querySelectorAll('.history-popup.open').forEach(el => el.classList.remove('open'));
    });

    // ── Load Data ─────────────────────────────────────────────────────
    try {
        const response = await fetch(EXCEL_URL);
        if (!response.ok) throw new Error('無法載入 Excel 檔案，請確認檔案是否存在於儲存庫中。');
        const arrayBuffer = await response.arrayBuffer();

        const lastMod = response.headers.get('Last-Modified');
        if (lastMod) {
            const d = new Date(lastMod);
            lastUpdated.innerHTML = `<i class="fa-regular fa-calendar-check"></i> 最後更新: ${d.toLocaleDateString('zh-TW')} ${d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            lastUpdated.innerHTML = `<i class="fa-solid fa-check"></i> 同步至最新版`;
        }

        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);

        globalData = rawData.map(row => ({
            id: String(row['股號'] || ''),
            name: String(row['公司'] || ''),
            price: parseFloat(row['最新股價']) || 0,
            gift: String(row['上次紀念品'] || ''),
            freq: parseInt(row['五年內發放次數']) || 0,
            cp: parseFloat(row['新版性價比']) || 0,
            score: String(row['新版推薦評分'] || '1 星'),
            fiveYearGifts: String(row['五年發放紀念品'] || ''),
            cond: String(row['去年條件'] || '')
        }));

        loadingState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');

        // ── Event Listeners ───────────────────────────────────────────
        searchInput.addEventListener('input', () => { currentPage = 1; renderTable(); });

        filterBtns.forEach(btn => btn.addEventListener('change', e => {
            document.querySelectorAll('.filter-btn').forEach(l => l.classList.remove('active'));
            if (e.target.checked) e.target.parentElement.classList.add('active');
            currentPage = 1;
            renderTable();
        }));

        annualFilter.addEventListener('change', () => { currentPage = 1; renderTable(); });

        pageSizeSelect.addEventListener('change', () => {
            pageSize = parseInt(pageSizeSelect.value, 10);
            currentPage = 1;
            renderTable();
        });

        sortHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const col = header.dataset.sort;
                if (currentSort.column === col) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = col;
                    currentSort.direction = 'desc';
                }
                sortHeaders.forEach(h => {
                    h.classList.remove('active');
                    const si = h.querySelector('i.fa-solid');
                    if (si) si.className = 'fa-solid fa-sort';
                });
                header.classList.add('active');
                const si = header.querySelector('i.fa-solid');
                if (si) si.className = currentSort.direction === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down';
                currentPage = 1;
                renderTable();
            });
        });

        // Default sort icon
        const defaultHeader = document.querySelector('th[data-sort="score"]');
        if (defaultHeader) {
            defaultHeader.classList.add('active');
            const si = defaultHeader.querySelector('i.fa-solid');
            if (si) si.className = 'fa-solid fa-sort-down';
        }

        renderTable();

    } catch (error) {
        console.error('Error loading Excel:', error);
        loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem;color:#ef4444;margin-bottom:1rem;"></i>
            <p>無法載入股票資料</p>
            <p style="font-size:0.85rem;opacity:0.7;margin-top:0.5rem;">${error.message}</p>
        `;
    }

    // ── Render ────────────────────────────────────────────────────────
    function renderTable() {
        const query = searchInput.value.toLowerCase().trim();
        const starFilter = document.querySelector('input[name="star-filter"]:checked')?.value || 'all';
        const isAnnualOnly = annualFilter.checked;

        filteredData = globalData.filter(row => {
            const matchSearch = !query ||
                row.id.includes(query) ||
                row.name.toLowerCase().includes(query) ||
                row.gift.toLowerCase().includes(query);

            const matchStar =
                starFilter === '5' ? row.score.startsWith('5') :
                    starFilter === '4' ? (row.score.startsWith('5') || row.score.startsWith('4')) :
                        true;

            const matchAnnual = isAnnualOnly ? row.freq >= 5 : true;
            return matchSearch && matchStar && matchAnnual;
        });

        filteredData.sort((a, b) => {
            let va = a[currentSort.column];
            let vb = b[currentSort.column];
            if (currentSort.column === 'score') {
                va = parseInt(va) || 0;
                vb = parseInt(vb) || 0;
            }
            if (va < vb) return currentSort.direction === 'asc' ? -1 : 1;
            if (va > vb) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        const total = filteredData.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (currentPage > totalPages) currentPage = 1;

        resultCount.textContent = `共 ${total} 筆結果`;

        if (total === 0) {
            noResults.classList.remove('hidden');
            tableBody.innerHTML = '';
            pagination.innerHTML = '';
            return;
        }
        noResults.classList.add('hidden');

        const start = (currentPage - 1) * pageSize;
        const pageData = filteredData.slice(start, start + pageSize);

        tableBody.innerHTML = '';
        pageData.forEach(row => {
            const starNum = parseInt(row.score.charAt(0)) || 1;
            const displayGift = row.gift.length > 22 ? row.gift.slice(0, 22) + '…' : row.gift;

            // Five-year history popup
            let historyHtml = '';
            const raw5y = row.fiveYearGifts;
            if (raw5y && raw5y !== 'nan' && raw5y.trim()) {
                // Trim \r as well (Excel exports sometimes use CRLF) so the regex matches correctly on every line
                const lines = raw5y.split(/\r?\n/).filter(l => l.trim());
                historyHtml = lines.map(l => {
                    const clean = l.trim();
                    const m = clean.match(/^\((\d{4})\)(.*)$/);
                    if (m) {
                        return `<div class="hist-row"><span class="hist-year">${m[1]}</span><span class="hist-gift">${m[2].trim() || '（未發放）'}</span></div>`;
                    }
                    return `<div class="hist-row"><span class="hist-gift">${clean}</span></div>`;
                }).join('');
            }
            const historyTag = historyHtml
                ? `<button class="history-btn" onclick="event.stopPropagation();this.nextElementSibling.classList.toggle('open')" title="查看五年歷史"><i class="fa-solid fa-clock-rotate-left"></i></button><div class="history-popup">${historyHtml}</div>`
                : '';

            // Frequency: just the number, no dots
            const condText = (row.cond && row.cond !== 'nan' && row.cond.trim()) ? row.cond.trim() : '—';
            const condDisplay = condText.length > 16 ? condText.slice(0, 16) + '…' : condText;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="股號" class="stock-id">${row.id}</td>
                <td data-label="公司" class="stock-name">${row.name}</td>
                <td data-label="最新股價" class="price">${row.price.toFixed(2)}</td>
                <td data-label="上次紀念品">
                    <div class="gift-cell">${displayGift}${historyTag}</div>
                </td>
                <td data-label="五年內發放" class="freq-cell">
                    <span class="freq-num">${row.freq}<span class="freq-slash">/5</span></span>
                </td>
                <td data-label="CP 值" class="cp-value">${row.cp.toFixed(2)}</td>
                <td data-label="去年條件" class="cond-cell" title="${condText}">${condDisplay}</td>
                <td data-label="推薦評分"><span class="badge badge-${starNum}">${row.score}</span></td>
            `;
            tableBody.appendChild(tr);
        });

        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        pagination.innerHTML = '';
        if (totalPages <= 1) return;

        const mkBtn = (label, page, active, disabled) => {
            const btn = document.createElement('button');
            btn.className = 'page-btn' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
            btn.innerHTML = label;
            btn.disabled = disabled;
            if (!disabled && !active) {
                btn.addEventListener('click', () => {
                    currentPage = page;
                    renderTable();
                    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
            return btn;
        };

        const mkEllipsis = () => {
            const s = document.createElement('span');
            s.className = 'page-ellipsis';
            s.textContent = '…';
            return s;
        };

        // Prev
        pagination.appendChild(mkBtn('<i class="fa-solid fa-chevron-left"></i>', currentPage - 1, false, currentPage === 1));

        // Page numbers with ellipsis — show ±3 pages around current
        let pages;
        if (totalPages <= 11) {
            pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            pages = [1];
            if (currentPage > 4) pages.push('...');
            for (let i = Math.max(2, currentPage - 3); i <= Math.min(totalPages - 1, currentPage + 3); i++) pages.push(i);
            if (currentPage < totalPages - 3) pages.push('...');
            pages.push(totalPages);
        }
        pages.forEach(p => {
            pagination.appendChild(p === '...' ? mkEllipsis() : mkBtn(p, p, p === currentPage, false));
        });

        // Next
        pagination.appendChild(mkBtn('<i class="fa-solid fa-chevron-right"></i>', currentPage + 1, false, currentPage === totalPages));

        // ── Page Jump Input ───────────────────────────────────────────
        const jumpWrap = document.createElement('div');
        jumpWrap.className = 'page-jump';
        jumpWrap.innerHTML = `
            <span>跳至</span>
            <input id="pageJumpInput" type="number" min="1" max="${totalPages}" value="${currentPage}" title="輸入頁碼後按 Enter">
            <span>/ ${totalPages}</span>
        `;
        pagination.appendChild(jumpWrap);

        const jumpInput = jumpWrap.querySelector('#pageJumpInput');
        const doJump = () => {
            const v = parseInt(jumpInput.value, 10);
            if (v >= 1 && v <= totalPages && v !== currentPage) {
                currentPage = v;
                renderTable();
                document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        jumpInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJump(); });
        jumpInput.addEventListener('blur', doJump);
        jumpInput.addEventListener('click', e => e.stopPropagation()); // prevent closing popups
    }
});
