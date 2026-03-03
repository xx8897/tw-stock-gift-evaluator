function renderTable() {
    const searchInput = document.getElementById('searchInput');
    const annualFilter = document.getElementById('annualFilter');
    const resultCount = document.getElementById('resultCount');
    const noResults = document.getElementById('noResults');
    const tableBody = document.getElementById('tableBody');
    const pagination = document.getElementById('pagination');

    const query = searchInput.value.toLowerCase().trim();
    const starFilter = document.querySelector('input[name="star-filter"]:checked')?.value || 'all';
    const isAnnualOnly = annualFilter.checked;

    AppState.filteredData = AppState.globalData.filter(row => {
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

    AppState.filteredData.sort((a, b) => {
        let va = a[AppState.currentSort.column];
        let vb = b[AppState.currentSort.column];
        if (AppState.currentSort.column === 'score') {
            va = parseInt(va) || 0;
            vb = parseInt(vb) || 0;
        }
        if (va < vb) return AppState.currentSort.direction === 'asc' ? -1 : 1;
        if (va > vb) return AppState.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const total = AppState.filteredData.length;
    const totalPages = Math.max(1, Math.ceil(total / AppState.pageSize));
    if (AppState.currentPage > totalPages) AppState.currentPage = 1;

    resultCount.textContent = `共 ${total} 筆結果`;

    if (total === 0) {
        noResults.classList.remove('hidden');
        tableBody.innerHTML = '';
        pagination.innerHTML = '';
        return;
    }
    noResults.classList.add('hidden');

    const start = (AppState.currentPage - 1) * AppState.pageSize;
    const pageData = AppState.filteredData.slice(start, start + AppState.pageSize);

    tableBody.innerHTML = '';
    pageData.forEach(row => {
        const starNum = parseInt(row.score.charAt(0)) || 1;
        const displayGift = row.gift.length > 22 ? row.gift.slice(0, 22) + '…' : row.gift;

        let historyHtml = '';
        const raw5y = row.fiveYearGifts;
        if (raw5y && raw5y !== 'nan' && raw5y.trim()) {
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
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

    const mkBtn = (label, page, active, disabled) => {
        const btn = document.createElement('button');
        btn.className = 'page-btn' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
        btn.innerHTML = label;
        btn.disabled = disabled;
        if (!disabled && !active) {
            btn.addEventListener('click', () => {
                AppState.currentPage = page;
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

    pagination.appendChild(mkBtn('<i class="fa-solid fa-chevron-left"></i>', AppState.currentPage - 1, false, AppState.currentPage === 1));

    let pages;
    if (totalPages <= 11) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        pages = [1];
        if (AppState.currentPage > 4) pages.push('...');
        for (let i = Math.max(2, AppState.currentPage - 3); i <= Math.min(totalPages - 1, AppState.currentPage + 3); i++) pages.push(i);
        if (AppState.currentPage < totalPages - 3) pages.push('...');
        pages.push(totalPages);
    }
    pages.forEach(p => {
        pagination.appendChild(p === '...' ? mkEllipsis() : mkBtn(p, p, p === AppState.currentPage, false));
    });

    pagination.appendChild(mkBtn('<i class="fa-solid fa-chevron-right"></i>', AppState.currentPage + 1, false, AppState.currentPage === totalPages));

    const jumpWrap = document.createElement('div');
    jumpWrap.className = 'page-jump';
    jumpWrap.innerHTML = `
        <span>跳至</span>
        <input id="pageJumpInput" type="number" min="1" max="${totalPages}" value="${AppState.currentPage}" title="輸入頁碼後按 Enter">
        <span>/ ${totalPages}</span>
    `;
    pagination.appendChild(jumpWrap);

    const jumpInput = jumpWrap.querySelector('#pageJumpInput');
    const doJump = () => {
        const v = parseInt(jumpInput.value, 10);
        if (v >= 1 && v <= totalPages && v !== AppState.currentPage) {
            AppState.currentPage = v;
            renderTable();
            document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    jumpInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJump(); });
    jumpInput.addEventListener('blur', doJump);
    jumpInput.addEventListener('click', e => e.stopPropagation());
}
