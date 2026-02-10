// positions.js — REAL Positions Tab (Backend-driven)
(function () {
  'use strict';

  const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com';
  const ENDPOINT = `${API_BASE}/api/positions`;

  const els = {
    section: document.getElementById('tab-positions'),
    tbody: document.getElementById('pos-tbody'),
    pageInfo: document.getElementById('pos-pagination-info'),
    prev: document.getElementById('pos-prev'),
    next: document.getElementById('pos-next')
  };

  const state = {
    page: 1,
    pages: 1,
    pageSize: 10,
    initialized: false
  };

  /* ===============================
     HELPERS
  =============================== */
  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fmtMoney = (cents) =>
    cents == null ? '—' : `$${(Number(cents) / 100).toFixed(2)}`;

  const fmtPrice = (n) =>
    n == null ? '—' : Number(n).toFixed(2);

  const fmtQty = (n) =>
    Number(n || 0).toFixed(6);

  const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleString() : '—';

  const sidePill = (side) => {
    if (side === 'LONG') {
      return `<span class="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">LONG</span>`;
    }
    if (side === 'SHORT') {
      return `<span class="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-semibold">SHORT</span>`;
    }
    return '—';
  };

  const pnlCell = (cents) => {
    if (cents == null) return '—';
    const cls = cents >= 0 ? 'text-emerald-400' : 'text-rose-400';
    const sign = cents >= 0 ? '+' : '';
    return `<span class="font-bold ${cls}">${sign}${fmtMoney(cents)}</span>`;
  };

  function setEmpty(msg = 'No positions yet.') {
    els.tbody.innerHTML = `
      <tr>
        <td colspan="7" class="p-4 text-center text-white/60">${msg}</td>
      </tr>
    `;
    els.pageInfo.textContent = 'Page 1 of 1';
    els.prev.disabled = true;
    els.next.disabled = true;
  }

  /* ===============================
     DATA FETCH
  =============================== */
  async function loadPositions() {
    const token = localStorage.getItem('token');
    if (!token) {
      setEmpty('Sign in to view positions.');
      return;
    }

    const params = new URLSearchParams({
      page: state.page,
      page_size: state.pageSize
    });

    try {
      const res = await fetch(`${ENDPOINT}?${params}`, {
        headers: authHeaders()
      });

      if (!res.ok) throw new Error('Failed');

      const { data = [], page, pages, total } = await res.json();

      state.page = page;
      state.pages = pages;

      if (!data.length) {
        setEmpty();
        return;
      }

      els.tbody.innerHTML = data.map(p => `
        <tr class="hover:bg-black/20 transition">
          <td class="p-4 text-white/80 text-xs">
            ${fmtTime(p.opened_at)}
          </td>
          <td class="p-4 text-white/90">${p.symbol}</td>
          <td class="p-4">${sidePill(p.side)}</td>
          <td class="text-right p-4 text-white/90">${fmtQty(p.size)}</td>
          <td class="text-right p-4 text-white/90">${fmtPrice(p.entry_price)}</td>
          <td class="text-right p-4 text-white/90">${fmtPrice(p.exit_price)}</td>
          <td class="text-right p-4">
            ${pnlCell(p.pnl_cents)}
          </td>
        </tr>
      `).join('');

      els.pageInfo.textContent = `Page ${page} of ${pages} • ${total} total`;
      els.prev.disabled = page <= 1;
      els.next.disabled = page >= pages;

    } catch (err) {
      console.error('Positions error:', err);
      setEmpty('Failed to load positions.');
    }
  }

  /* ===============================
     PAGINATION
  =============================== */
  function bindPagination() {
    els.prev.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        loadPositions();
      }
    });

    els.next.addEventListener('click', () => {
      if (state.page < state.pages) {
        state.page++;
        loadPositions();
      }
    });
  }

  /* ===============================
     INIT (ON TAB OPEN)
  =============================== */
  function initOnce() {
    if (state.initialized) return;
    state.initialized = true;
    bindPagination();
    loadPositions();
  }

  if (els.section) {
    const obs = new MutationObserver(() => {
      if (!els.section.classList.contains('hidden')) {
        initOnce();
      }
    });
    obs.observe(els.section, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('positions:refresh', loadPositions);
})();
