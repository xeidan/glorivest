// transactions.js — Hybrid Ledger Version

(() => {
  'use strict';

  const API = window.API_BASE || '';
  const token = () => localStorage.getItem('token');

  const tableBody = document.getElementById('transaction-table-body');
  const mobileList = document.getElementById('transaction-mobile-list');

  if (!tableBody || !mobileList) return;

  const filterType = document.getElementById('filter-type');
  const datePresets = document.querySelectorAll('.date-pill');

  const prevBtn = document.getElementById('tx-prev');
  const nextBtn = document.getElementById('tx-next');
  const pageInfo = document.getElementById('tx-page-info');

  let allTransactions = [];
  let filteredTransactions = [];
  let currentPage = 1;
  const PAGE_SIZE = 8;
  let activeRange = 30;

  /* ===========================
     FETCH WRAPPER
  =========================== */

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

  function mapStatus(status) {
    const map = {
      SUCCESS: 'Completed',
      AWAITING_PAYMENT: 'Awaiting Payment',
      USER_MARKED_PAID: 'Processing',
      PENDING: 'Processing',
      CANCELLED: 'Cancelled',
      EXPIRED: 'Expired'
    };
    return map[status] || status;
  }

  function statusClass(status) {
    const map = {
      SUCCESS: 'bg-green-500/10 text-green-400',
      AWAITING_PAYMENT: 'bg-yellow-500/10 text-yellow-400',
      USER_MARKED_PAID: 'bg-yellow-500/10 text-yellow-400',
      PENDING: 'bg-yellow-500/10 text-yellow-400',
      CANCELLED: 'bg-red-500/10 text-red-400',
      EXPIRED: 'bg-white/5 text-white/40'
    };
    return map[status] || 'bg-white/5 text-white/50';
  }

  /* ===========================
     LOAD & NORMALIZE
  =========================== */

  async function loadTransactions() {
    const [deposits, withdrawals] = await Promise.all([
      secureFetch('/deposit'),
      secureFetch('/withdrawals')
    ]);

    const normalizedDeposits = deposits.map(d => ({
      kind: 'deposit',
      amount: Number(d.amount_exact_cents),
      status: d.status,
      created_at: d.created_at
    }));

    const normalizedWithdrawals = withdrawals.map(w => ({
      kind: 'withdrawal',
      amount: Number(w.amount_cents),
      status: w.status,
      created_at: w.created_at
    }));

    allTransactions = [...normalizedDeposits, ...normalizedWithdrawals]
      .sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

    applyFilters();
  }

  /* ===========================
     FILTERING
  =========================== */

  function applyFilters() {
    const type = filterType.value;

    filteredTransactions = [...allTransactions];

    // Type filter
    if (type !== 'all') {
      filteredTransactions = filteredTransactions.filter(
        tx => tx.kind === type
      );
    }

    // Date filter
    if (activeRange !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - activeRange);

      filteredTransactions = filteredTransactions.filter(
        tx => new Date(tx.created_at) >= cutoff
      );
    }

    currentPage = 1;
    render();
  }

  /* ===========================
     RENDERING
  =========================== */

  function render() {
    tableBody.innerHTML = '';
    mobileList.innerHTML = '';

    const totalPages = Math.max(
      1,
      Math.ceil(filteredTransactions.length / PAGE_SIZE)
    );

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    const pageItems = filteredTransactions.slice(start, end);

    pageItems.forEach(tx => {

      const amountPrefix = tx.kind === 'deposit' ? '+' : '-';

      // DESKTOP ROW
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-white/5 transition';

      tr.innerHTML = `
        <td class="py-3">${tx.kind === 'deposit' ? 'Deposit' : 'Withdrawal'}</td>
        <td class="text-right py-3 font-mono font-semibold">
          ${amountPrefix}${fmtUSD(tx.amount)}
        </td>
        <td class="text-right py-3">
          <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(tx.status)}">
            ${mapStatus(tx.status)}
          </span>
        </td>
        <td class="text-right py-3 text-white/50">
          ${formatDate(tx.created_at)}
        </td>
      `;

      tableBody.appendChild(tr);

      // MOBILE CARD
      const card = document.createElement('div');
      card.className = 'bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center';

      card.innerHTML = `
        <div class="space-y-1">
          <div class="font-semibold">
            ${tx.kind === 'deposit' ? 'Deposit' : 'Withdrawal'}
          </div>
          <div class="text-xs text-white/50">
            ${formatDate(tx.created_at)}
          </div>
        </div>

        <div class="text-right space-y-1">
          <div class="font-mono font-semibold">
            ${amountPrefix}${fmtUSD(tx.amount)}
          </div>
          <div>
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(tx.status)}">
              ${mapStatus(tx.status)}
            </span>
          </div>
        </div>
      `;

      mobileList.appendChild(card);

    });

    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
  }

  /* ===========================
     EVENTS
  =========================== */

  filterType.addEventListener('change', applyFilters);

  datePresets.forEach(btn => {
    btn.addEventListener('click', () => {
      datePresets.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const range = btn.getAttribute('data-range');
      activeRange = range === 'all' ? 'all' : Number(range);

      applyFilters();
    });
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      render();
    }
  });

  nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
    if (currentPage < totalPages) {
      currentPage++;
      render();
    }
  });

  // Load when modal opens
  document.querySelector('[data-open="modal-transactions"]')
    ?.addEventListener('click', loadTransactions);

})();