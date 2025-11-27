// ======================================================================
// DASHBOARD.JS — FRONTEND LOGIC FOR DASHBOARD PAGE
// ======================================================================

(function () {
  'use strict';

  // ============================================================
  // SECTION 1 — SMALL HELPER UTILITIES
  // ============================================================


  async function rawFetch(path, opts = {}) {
    const base = ''; // if your front-end proxies API, otherwise use full host in apiFetch
    const headers = Object.assign({ 'Content-Type': 'application/json' }, tokenHeader(), opts.headers || {});
    const res = await fetch((path.startsWith('http') ? path : base + path), Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let json = null;
      try { json = JSON.parse(txt); } catch(e){}
      const err = new Error((json && json.message) || res.statusText || 'HTTP error');
      err.status = res.status;
      err.body = json || txt;
      throw err;
    }
    return res.json().catch(()=>null);
  }

  // If apiFetch exists, use it, otherwise fallback
  const APIFETCH = (typeof apiFetch === 'function') ? apiFetch : rawFetch;
  window.APIFETCH = APIFETCH;

  // ============================================================
  // SECTION 2 — MONEY + NUMBER FORMATTING
  // ============================================================
  function centsToNumber(cents) {
    if (cents === null || cents === undefined) return 0;
    return Number(cents || 0) / 100;
  }
  function money(n) {
    return `$${Number(n||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }


  // ============================================================
  // SECTION 3 — TAB SWITCHING + NAV HIGHLIGHT LOGIC
  // ============================================================


  // Close modal/tab → return to dashboard
  window.closeTab = function (btn) {
    const modal = btn.closest('.modal-overlay');
    if (modal) {
      modal.classList.add('hidden');
      return;
    }

    const dashNav = document.querySelector('[data-tab="dashboard"]');
    document.querySelectorAll('[data-tab]').forEach(n => n.classList.remove('active-tab'));
    if (dashNav) dashNav.classList.add('active-tab');

    const tab = btn.closest('.tab-content');
    if (tab) tab.classList.add('hidden');

    const dash = document.getElementById('tab-dashboard');
    if (dash) dash.classList.remove('hidden');
  };


 


  // ============================================================
  // SECTION 5 — LOAD USER + ACCOUNTS + RENDER INTO UI
  // ============================================================
  const state = { user: null, accounts: [], currentAccount: null };

  async function loadFullUser() {
    try {
      const user = await APIFETCH('/auth/me');
      const accounts = await APIFETCH('/accounts');

      state.user = user || null;
      state.accounts = Array.isArray(accounts) ? accounts : [];

      const saved = Number(localStorage.getItem('currentAccountId') || 0);

      let account = saved
        ? state.accounts.find(a => a.id === saved)
        : (user && user.default_account_id
            ? state.accounts.find(a => a.id === user.default_account_id)
            : state.accounts[0]);

      state.currentAccount = account;
      return { user: state.user, account: state.currentAccount };
    } catch (err) {
      console.warn('loadFullUser error', err);
      return { user: null, account: null };
    }
  }

  function computeAndRender(user, account) {
    if (!user || !account) return;

    const total = centsToNumber(account.balance_cents);
    const botProfit = centsToNumber(account.profit_cents);
    const referral = Number(user.referral_earnings || user.reward_balance || 0);

    const available = Math.max(0, total + referral - botProfit);
    const percentage = total > 0
      ? ((botProfit / (total || 1)) * 100)
      : (botProfit > 0 ? 100 : 0);

    const percentageStr = `${percentage >= 0 ? '+' : ''}${Number(percentage).toFixed(1)}%`;
    const profitStr = `${botProfit >= 0 ? '+' : '-'}${money(Math.abs(botProfit))}`;

    const glorivestId = user.glorivest_id || `GV${150000 + user.id}`;
    const email = user.email || '';
    const tier = account.tier_name || account.tier || 'Standard';
    const code = account.account_code || glorivestId;

    const totalEl = qs('total-balance');
    const availEl = qs('available-balance');
    const refEl = qs('referral-earnings');
    const percEl = qs('percentage-increase');
    const profitEl = qs('profit-increase');
    const idEl = qs('glorivest-id');
    const emailEl = qs('user-email');
    const tierEl = qs('current-account-tier');
    const codeEl = qs('current-account-code');

    if (totalEl) { totalEl.textContent = money(total); totalEl.dataset.value = money(total); }
    if (availEl)  { availEl.textContent = money(available); availEl.dataset.value = money(available); }
    if (refEl)    { refEl.textContent = money(referral); refEl.dataset.value = money(referral); }
    if (profitEl) { profitEl.textContent = profitStr; profitEl.dataset.value = profitStr; }
    if (percEl)   { percEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; percEl.dataset.value = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; }

    if (idEl) idEl.textContent = glorivestId;
    if (emailEl) emailEl.textContent = email;
    if (tierEl) tierEl.textContent = tier;
    if (codeEl) codeEl.textContent = code.startsWith('#') ? code : `#${code}`;

    state.user = user;
    state.currentAccount = account;
    if (account?.id) localStorage.setItem('currentAccountId', String(account.id));
  }

  async function loadBalances() {
    const { user, account } = await loadFullUser();
    if (!user || !account) return;
    computeAndRender(user, account);
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadBalances();
    document.addEventListener('balances:refresh', loadBalances);
  });


  // ============================================================
  // SECTION 6 — ACCOUNT SELECTION SHEET (HEADER SYNC)
  // ============================================================
  async function fetchAccountsForSheet() {
    try {
      const accs = await APIFETCH('/accounts');
      state.accounts = Array.isArray(accs) ? accs : [];
      return state.accounts;
    } catch (e) {
      console.warn('fetchAccounts error', e);
      return [];
    }
  }
window.fetchAccountsForSheet = fetchAccountsForSheet;

  function fmtUSD(cents) {
    return `$${(Number(cents||0)/100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
  }
window.fmtUSD = fmtUSD;

  function applyHeader(acc) {
    if (!acc) return;
    const tierText = acc.tier_name || acc.tier || 'Standard';
    const rawCode = (acc.account_code || '').trim();

    qs('current-account-tier') && (qs('current-account-tier').textContent = tierText);
    qs('current-account-code') && (qs('current-account-code').textContent = rawCode.startsWith('#') ? rawCode : `#${rawCode || '—'}`);

    const bal = Number(acc.balance_cents || 0);
    const fmt = `$${(bal/100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
    qs('total-balance') && (qs('total-balance').textContent = fmt);
    qs('available-balance') && (qs('available-balance').textContent = fmt);
  }
  window.applyHeader = applyHeader;
window.computeAndRender = computeAndRender;
window.state = state;


  // ============================================================
  // SECTION 7 — REFER-NOW BUTTON → JUMP TO EARN TAB
  // ============================================================
  const referBtn = document.querySelector('[data-refer-now]');
  if (referBtn) {
    referBtn.addEventListener('click', () => {
      showTab('earn');
      const earnNav = document.querySelector('[data-tab="earn"]');
      if (earnNav) {
        document.querySelectorAll('[data-tab]').forEach(n => n.classList.remove('active-tab'));
        earnNav.classList.add('active-tab');
      }
    });
  }


  // ============================================================
  // SECTION 8 — INLINE STYLE SAFETY (ENSURE ACTIVE TAB COLOR)
  // ============================================================
  (function ensureStyles(){
    const styleId = 'dashboard-js-inline-styles';
    if (qs(styleId)) return;
    const s = document.createElement('style');
    s.id = styleId;
    s.innerHTML = `
      .active-tab { color: #00D2B1 !important; }
      .nav-item.text-green-400 { color: #00D2B1 !important; }
    `;
    document.head.appendChild(s);
  })();

  // expose loaders
  window.loadFullUser = loadFullUser;
  window.loadBalances = loadBalances;

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadBalances, 0);
  } else {
    document.addEventListener('DOMContentLoaded', ()=> setTimeout(loadBalances, 0));
  }

  document.addEventListener('balances:refresh', loadBalances);

})();  // END DASHBOARD CORE MODULE


// ======================================================================
// ACCOUNT SHEETS MODULE (DASHBOARD-only, System B)
// Append this to the end of dashboard.js (after the main IIFE)
// ======================================================================
(function () {
  'use strict';

  // Helpers — safe selectors (qs from global.js)
  const S = (id) => qs(id);

  // Sheet element IDs (match app.html)
  const SHEETS = {
    accounts: {
      modalId: 'sheet-accounts',
      backdropId: 'sheet-accounts-backdrop',
      panelId: 'sheet-accounts-panel',
      listId: 'list-accounts',
      handleId: 'sheet-accounts-handle',
      btnOpenId: 'btn-open-accounts',
      btnCreateId: 'btn-accounts-create'
    },
    new: {
      modalId: 'sheet-new',
      backdropId: 'sheet-new-backdrop',
      panelId: 'sheet-new-panel',
      handleId: 'sheet-new-handle',
      btnCreateId: 'btn-new-create',
      backBtnId: 'btn-new-back',
      tiersListId: 'list-tiers'
    },
    review: {
      modalId: 'sheet-review',
      backdropId: 'sheet-review-backdrop',
      panelId: 'sheet-review-panel',
      handleId: 'sheet-review-handle',
      backBtnId: 'btn-review-back',
      confirmBtnId: 'btn-review-confirm',
      bodyId: 'review-body',
      titleId: 'review-title'
    }
  };

  // Generic open/close for account sheets (uses ids from above)
  function openAccSheetById(modalId) {
    const modal = S(modalId);
    if (!modal) return;
    const backdrop = modal.querySelector('[id$="-backdrop"]') || modal.querySelector('.sheet-backdrop');
    const panel = modal.querySelector('[id$="-panel"]') || modal.querySelector('.sheet-panel');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      if (backdrop) backdrop.classList.add('opacity-100');
      if (panel) panel.classList.remove('translate-y-full');
    });
  }

  function closeAccSheetById(modalId) {
    const modal = S(modalId);
    if (!modal) return;
    const backdrop = modal.querySelector('[id$="-backdrop"]') || modal.querySelector('.sheet-backdrop');
    const panel = modal.querySelector('[id$="-panel"]') || modal.querySelector('.sheet-panel');

    if (backdrop) backdrop.classList.remove('opacity-100');
    if (panel) panel.classList.add('translate-y-full');

    setTimeout(() => modal.classList.add('hidden'), 220);
  }

  // Drag-to-close specifically for account panels
  function attachAccDrag(panelEl, closeFn) {
    if (!panelEl) return;
    let startY = 0;
    let dragging = false;

    panelEl.addEventListener('mousedown', start);
    panelEl.addEventListener('touchstart', start, { passive: true });

    function start(e) {
      dragging = true;
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      panelEl.style.transition = 'none';
    }

    function move(e) {
      if (!dragging) return;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = Math.max(0, y - startY);
      panelEl.style.transform = `translateY(${dy}px)`;
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      const dy = parseFloat(panelEl.style.transform.replace('translateY(', '')) || 0;
      panelEl.style.transition = '';
      if (dy > 70) closeFn();
      else panelEl.style.transform = '';
    }

    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  }

  // Render accounts into the accounts list
  async function renderAccountsList() {
    const listEl = S(SHEETS.accounts.listId);
    if (!listEl) return;

    // show loading state
    listEl.innerHTML = `<div class="text-sm text-white/60 p-4">Loading accounts…</div>`;

    let accounts = [];
    try {
      accounts = await fetchAccountsForSheet(); // existing function in dashboard.js
    } catch (e) {
      console.warn('renderAccountsList: fetch error', e);
      listEl.innerHTML = `<div class="text-sm text-red-400 p-4">Failed to load accounts</div>`;
      return;
    }

    if (!accounts || accounts.length === 0) {
      listEl.innerHTML = `<div class="text-sm text-white/60 p-4">No accounts yet</div>`;
      return;
    }

    // build rows
    listEl.innerHTML = '';
    accounts.forEach(acc => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between hover:bg-white/6';
      row.innerHTML = `
        <div>
          <div class="font-medium">${acc.account_name || acc.account_code || `Account ${acc.id}`}</div>
          <div class="text-xs text-white/60 mt-1">${acc.tier_name || acc.tier || 'Standard'}</div>
        </div>
        <div class="text-sm font-semibold">${fmtUSD(acc.balance_cents)}</div>
      `;
      // attach click: select account + close sheet + update header + render dashboard
      row.addEventListener('click', () => {
        // mark selection
        try {
          state.currentAccount = acc;
          if (acc?.id) localStorage.setItem('currentAccountId', String(acc.id));
          applyHeader(acc);
          computeAndRender(state.user, acc);
        } catch (e) { console.warn(e); }

        // review details in the review sheet
        const reviewBody = S(SHEETS.review.bodyId);
        const reviewTitle = S(SHEETS.review.titleId);
        if (reviewBody) {
          reviewTitle && (reviewTitle.textContent = 'Account Details');
          reviewBody.innerHTML = `
            <div class="space-y-2">
              <div><span class="text-xs text-white/60">Account Code</span><div class="font-semibold">${acc.account_code || '—'}</div></div>
              <div><span class="text-xs text-white/60">Tier</span><div class="font-semibold">${acc.tier_name || acc.tier || 'Standard'}</div></div>
              <div><span class="text-xs text-white/60">Balance</span><div class="font-semibold">${fmtUSD(acc.balance_cents)}</div></div>
              <div><span class="text-xs text-white/60">Status</span><div class="font-semibold text-[#00D2B1]">${(acc.status || 'active').replace(/^\w/, c => c.toUpperCase())}</div></div>
            </div>
          `;
        }

        closeAccSheetById(SHEETS.accounts.modalId);
        // open review sheet
        openAccSheetById(SHEETS.review.modalId);
      });

      listEl.appendChild(row);
    });
  }

  // Setup event handlers for the account sheets
  function setupAccountSheetHandlers() {
    // Open accounts sheet button
    const btnOpen = S(SHEETS.accounts.btnOpenId);
    if (btnOpen) {
      btnOpen.addEventListener('click', async () => {
        await renderAccountsList();
        openAccSheetById(SHEETS.accounts.modalId);
      });
    }

    // Create new button inside accounts header
    const btnCreate = S(SHEETS.accounts.btnCreateId);
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        // open new account sheet
        openAccSheetById(SHEETS.new.modalId);
      });
    }

    // Backdrop clicks to close
    const accBackdrop = S(SHEETS.accounts.backdropId);
    accBackdrop?.addEventListener('click', () => closeAccSheetById(SHEETS.accounts.modalId));

    const newBackdrop = S(SHEETS.new.backdropId);
    newBackdrop?.addEventListener('click', () => closeAccSheetById(SHEETS.new.modalId));

    const reviewBackdrop = S(SHEETS.review.backdropId);
    reviewBackdrop?.addEventListener('click', () => closeAccSheetById(SHEETS.review.modalId));

    // Attach drag handlers for panels
    const accPanel = S(SHEETS.accounts.panelId);
    const newPanel = S(SHEETS.new.panelId);
    const reviewPanel = S(SHEETS.review.panelId);

    if (accPanel) attachAccDrag(accPanel, () => closeAccSheetById(SHEETS.accounts.modalId));
    if (newPanel) attachAccDrag(newPanel, () => closeAccSheetById(SHEETS.new.modalId));
    if (reviewPanel) attachAccDrag(reviewPanel, () => closeAccSheetById(SHEETS.review.modalId));

    // New-sheet back button
    const newBack = S(SHEETS.new.backBtnId);
    newBack?.addEventListener('click', () => {
      closeAccSheetById(SHEETS.new.modalId);
      openAccSheetById(SHEETS.accounts.modalId);
    });

    // Review-sheet back button
    const reviewBack = S(SHEETS.review.backBtnId);
    reviewBack?.addEventListener('click', () => {
      closeAccSheetById(SHEETS.review.modalId);
      openAccSheetById(SHEETS.accounts.modalId);
    });

    // Confirm review (placeholder)
    const confirmBtn = S(SHEETS.review.confirmBtnId);
    if (confirmBtn) confirmBtn.textContent = "Close";

    confirmBtn?.addEventListener('click', () => {
      closeAccSheetById(SHEETS.review.modalId);
    });


    // New create button (finalize creation) - uses selected tier in new sheet
    const newCreate = S(SHEETS.new.btnCreateId);
    if (newCreate) {
      newCreate.addEventListener('click', async () => {
  const selectedTierBtn = (S(SHEETS.new.tiersListId) || document)
    .querySelector('.tier-card.dep-active');

  const tier = selectedTierBtn ? selectedTierBtn.dataset?.tier : null;
  if (!tier) {
    showToast && showToast('Please choose a tier');
    return;
  }

  try {
    newCreate.disabled = true;
    newCreate.textContent = 'Creating...';

    const payload = { tier_code: tier.toLowerCase() };

    const res = await APIFETCH('/accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await renderAccountsList();
    showToast && showToast('Account created');

    closeAccSheetById(SHEETS.new.modalId);
    openAccSheetById(SHEETS.accounts.modalId);

    await loadBalances();

  } catch (e) {
    console.error('Create account failed', e);
    showToast && showToast('Failed to create account');
  } finally {
    newCreate.disabled = false;
    newCreate.textContent = 'Create';
  }
});

    }

    // Tier card selection inside new sheet
    const tierContainer = S(SHEETS.new.tiersListId);
    if (tierContainer) {
      tierContainer.querySelectorAll('.tier-card').forEach(btn => {
        btn.addEventListener('click', () => {
          tierContainer.querySelectorAll('.tier-card').forEach(x => x.classList.remove('dep-active'));
          btn.classList.add('dep-active');
        });
      });
    }
  }

  // init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    // ensure functions that dashboard expects are available
    // (fetchAccountsForSheet and applyHeader already defined in dashboard.js)
    setupAccountSheetHandlers();
  });

})();
