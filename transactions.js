// transactions.js — Upgraded Mobile + Segmented Filters Version

(() => {
  'use strict';

  const API = window.API_BASE || '';
  const token = () => localStorage.getItem('token');

  const tableBody = document.getElementById('transaction-table-body');
  const mobileList = document.getElementById('transaction-mobile-list');
  const filterWrap = document.getElementById('filter-type');
  const prevBtn = document.getElementById('tx-prev');
  const nextBtn = document.getElementById('tx-next');
  const pageInfo = document.getElementById('tx-page-info');

  if (!tableBody || !mobileList || !filterWrap) return;

  let allTransactions = [];
  let filteredTransactions = [];
  let currentPage = 1;

  const PAGE_SIZE = 8;

  let activeType = 'all';

  /* =====================================
     API
  ===================================== */

  async function secureFetch(url) {
    const res = await fetch(`${API}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Request failed');
    }

    return res.json();
  }

  /* =====================================
     HELPERS
  ===================================== */

  function fmtUSD(cents) {
    return `$${(Number(cents) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatDate(date) {
    return new Date(date).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatMobileDate(date) {
    return new Date(date).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short'
    });
  }

  function mapStatus(status) {
    const map = {
      SUCCESS: 'Completed',
      APPROVED: 'Completed',
      PENDING: 'Processing',
      USER_MARKED_PAID: 'Processing',
      AWAITING_PAYMENT: 'Awaiting Payment',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired'
    };

    return map[status] || status;
  }

  function statusClass(status) {
    const map = {
      SUCCESS: 'bg-green-500/10 text-green-400',
      APPROVED: 'bg-green-500/10 text-green-400',
      PENDING: 'bg-yellow-500/10 text-yellow-400',
      USER_MARKED_PAID: 'bg-yellow-500/10 text-yellow-400',
      AWAITING_PAYMENT: 'bg-yellow-500/10 text-yellow-400',
      CANCELLED: 'bg-red-500/10 text-red-400',
      EXPIRED: 'bg-white/5 text-white/40'
    };

    return map[status] || 'bg-white/5 text-white/50';
  }

  /* =====================================
     FILTER UI (SEGMENTED)
  ===================================== */

function buildFilterBar() {
  filterWrap.outerHTML = `
    <div
      id="tx-filter-bar"
      class="gv-segment"
    >
      <button
        type="button"
        data-type="all"
        class="tx-filter-btn active"
      >
        All
      </button>

      <button
        type="button"
        data-type="deposit"
        class="tx-filter-btn"
      >
        Deposits
      </button>

      <button
        type="button"
        data-type="withdrawal"
        class="tx-filter-btn"
      >
        Withdrawals
      </button>
    </div>
  `;

  const style = document.createElement('style');

style.textContent = `
  #tx-filter-bar{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:0;
    padding:0;
    overflow:hidden;
    border-radius:24px;
    background:rgba(255,255,255,.05);
    border:1px solid rgba(255,255,255,.06);
  }

  .tx-filter-btn{
    width:100%;
    border:none;
    background:transparent;
    padding:16px 10px;
    font-size:14px;
    font-weight:700;
    color:rgba(255,255,255,.85);
    transition:all .2s ease;
    border-radius:0;
  }

  .tx-filter-btn.active{
    background:#18d2c3;
    color:#000;
  }
`;

  document.head.appendChild(style);

  document.querySelectorAll('.tx-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {

      document
        .querySelectorAll('.tx-filter-btn')
        .forEach(x => x.classList.remove('active'));

      btn.classList.add('active');

      activeType = btn.dataset.type;

      applyFilters();
    });
  });
}

  /* =====================================
     LOAD DATA
  ===================================== */

  async function loadTransactions() {
    renderLoading();

    try {
      const [deposits, withdrawals] = await Promise.all([
        secureFetch('/deposit'),
        secureFetch('/withdrawals')
      ]);

      const dep = deposits.map(d => ({
        kind: 'deposit',
        amount: Number(d.amount_exact_cents || 0),
        status: d.status,
        created_at: d.created_at
      }));

      const wd = withdrawals.map(w => ({
        kind: 'withdrawal',
        amount: Number(w.amount_cents || 0),
        status: w.status,
        created_at: w.created_at
      }));

      allTransactions = [...dep, ...wd].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      applyFilters();

    } catch (err) {
      renderError(err.message || 'Failed to load transactions');
    }
  }

  /* =====================================
     FILTERING
  ===================================== */

  function applyFilters() {
    filteredTransactions = [...allTransactions];

    if (activeType !== 'all') {
      filteredTransactions = filteredTransactions.filter(
        tx => tx.kind === activeType
      );
    }

    currentPage = 1;
    render();
  }

  /* =====================================
     RENDER STATES
  ===================================== */

  function renderLoading() {
    tableBody.innerHTML = '';
    mobileList.innerHTML = `
      <div class="bg-white/5 rounded-2xl p-6 text-center text-white/50">
        Loading transactions...
      </div>
    `;
  }

  function renderError(msg) {
    tableBody.innerHTML = '';
    mobileList.innerHTML = `
      <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center text-red-300">
        ${msg}
      </div>
    `;
  }

  function renderEmpty() {
    tableBody.innerHTML = '';
    mobileList.innerHTML = `
      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/50">
        No transactions found
      </div>
    `;

    pageInfo.textContent = '0 results';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }

  /* =====================================
     MAIN RENDER
  ===================================== */

  function render() {
    tableBody.innerHTML = '';
    mobileList.innerHTML = '';

    if (!filteredTransactions.length) {
      renderEmpty();
      return;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(filteredTransactions.length / PAGE_SIZE)
    );

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    const items = filteredTransactions.slice(start, end);

    items.forEach(tx => {
      const label =
        tx.kind === 'deposit'
          ? 'Deposit'
          : 'Withdrawal';

      const prefix =
        tx.kind === 'deposit'
          ? '+'
          : '-';

      /* Desktop Row */
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-white/5 transition';

      tr.innerHTML = `
        <td class="py-3">${label}</td>

        <td class="text-right py-3 font-mono font-semibold">
          ${prefix}${fmtUSD(tx.amount)}
        </td>

        <td class="text-right py-3">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass(tx.status)}">
            ${mapStatus(tx.status)}
          </span>
        </td>

        <td class="text-right py-3 text-white/45">
          ${formatDate(tx.created_at)}
        </td>
      `;

      tableBody.appendChild(tr);

      /* Mobile Card */
      const card = document.createElement('div');

      card.className =
        'bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3';

      card.innerHTML = `
        <div class="flex justify-between items-start gap-3">

          <div>
            <div class="font-semibold text-sm">${label}</div>

            <div class="text-xs text-white/45 mt-1">
              ${formatMobileDate(tx.created_at)}
            </div>
          </div>

          <span class="px-2.5 py-1 rounded-full text-[11px] font-medium ${statusClass(tx.status)}">
            ${mapStatus(tx.status)}
          </span>

        </div>

        <div class="flex justify-between items-end">

          <div class="text-xs text-white/45">
            Amount
          </div>

          <div class="font-semibold text-base font-mono">
            ${prefix}${fmtUSD(tx.amount)}
          </div>

        </div>
      `;

      mobileList.appendChild(card);
    });

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  /* =====================================
     PAGINATION
  ===================================== */

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      render();
    }
  });

  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(
      filteredTransactions.length / PAGE_SIZE
    );

    if (currentPage < totalPages) {
      currentPage++;
      render();
    }
  });

  /* =====================================
     OPEN MODAL
  ===================================== */

  document
    .querySelector('[data-open="modal-transactions"]')
    ?.addEventListener('click', loadTransactions);

  buildFilterBar();

})();