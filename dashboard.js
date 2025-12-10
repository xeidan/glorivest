

(function () {
  'use strict';

  // ---------------------------
  // Helpers & API bootstrap
  // ---------------------------
  // rawFetch fallback (used only if global apiFetch isn't present)
  async function rawFetch(path, opts = {}) {
    const base = '';
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    const res = await fetch((path.startsWith('http') ? path : base + path), Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let json = null;
      try { json = JSON.parse(txt); } catch (e) {}
      const err = new Error((json && json.message) || res.statusText || 'HTTP error');
      err.status = res.status;
      err.body = json || txt;
      throw err;
    }
    const ct = res.headers && res.headers.get ? res.headers.get('content-type') || '' : '';
    return ct.includes('application/json') ? res.json() : res.text();
  }

  const APIFETCH = (typeof apiFetch === 'function') ? apiFetch : rawFetch;
  window.APIFETCH = APIFETCH;

  // Use global qs if available (defined in global.js), otherwise fallback
  const qs = (typeof window.qs === 'function') ? window.qs : (id) => document.getElementById(id);

  // ---------------------------
  // Formatting utilities
  // ---------------------------
  function centsToNumber(cents) {
    if (cents === null || cents === undefined) return 0;
    return Number(cents || 0) / 100;
  }
  function money(n) {
    return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  function fmtUSD(cents) {
    return `$${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  window.fmtUSD = fmtUSD;

  // ---------------------------
  // Application state
  // ---------------------------
  const state = {
    user: null,
    accounts: [],
    currentAccount: null
  };
  window.state = state;

  // ---------------------------
  // Load user + accounts
  // ---------------------------
  async function loadFullUser() {
    try {
      const user = await APIFETCH('/auth/me');
      const accs = await APIFETCH('/accounts');

      state.user = user || null;
      state.accounts = Array.isArray(accs) ? accs : [];

      // Restore selected account from localStorage or use default
      const saved = Number(localStorage.getItem('currentAccountId') || 0);
      let account = null;

      if (saved) {
        account = state.accounts.find(a => a.id === saved) || null;
      }

      if (!account && user && user.default_account_id) {
        account = state.accounts.find(a => a.id === user.default_account_id) || null;
      }

      if (!account) account = state.accounts[0] || null;

      state.currentAccount = account;
      if (account && account.id) localStorage.setItem('currentAccountId', String(account.id));

      return { user: state.user, account: state.currentAccount };
    } catch (err) {
      console.warn('loadFullUser error', err);
      state.user = null;
      state.accounts = [];
      state.currentAccount = null;
      return { user: null, account: null };
    }
  }
  window.loadFullUser = loadFullUser;

  // ---------------------------
  // Render / compute UI
  // ---------------------------
  function cleanAccountCode(raw = '') {
    // remove trailing suffixes like -std, -pro, -elite if present,
    // and ensure it doesn't duplicate leading '#'
    let code = String(raw || '').trim();
    code = code.replace(/-(std|pro|elite)$/i, '');
    if (!code) return '—';
    return code.startsWith('#') ? code : `#${code}`;
  }

  function computeAndRender(user, account) {
    if (!user || !account) return;

    // balances
    const total = centsToNumber(account.balance_cents);
    const botProfit = centsToNumber(account.profit_cents);
    const referral = Number(user.referral_earnings || user.reward_balance || 0);
    const available = Math.max(0, total + referral - botProfit);

    // profit display
    const percentage = total > 0 ? (botProfit / total) * 100 : 0;
    const percentageStr = `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    const profitStr = `${botProfit >= 0 ? '+' : '-'}${money(Math.abs(botProfit))}`;

    // account type
    const accType = (String(account.account_type || '').toLowerCase() === 'demo') ? 'Demo' : 'Live';

    // UI target elements
    const tierEl = qs('current-account-tier');
    const codeEl = qs('current-account-code');
    const totalEl = qs('total-balance');
    const availEl = qs('available-balance');
    const refEl = qs('referral-earnings');
    const profitEl = qs('profit-increase');
    const percEl = qs('percentage-increase');
    const emailEl = qs('user-email');
    const idEl = qs('glorivest-id');

    if (tierEl) tierEl.textContent = accType;
    if (codeEl) codeEl.textContent = cleanAccountCode(account.account_code || user.glorivest_id || (`GV${150000 + (user?.id || 0)}`));

    if (totalEl) { totalEl.textContent = money(total); totalEl.dataset.value = money(total); }
    if (availEl)  { availEl.textContent = money(available); availEl.dataset.value = money(available); }
    if (refEl)    { refEl.textContent = money(referral); refEl.dataset.value = money(referral); }
    if (profitEl) { profitEl.textContent = profitStr; profitEl.dataset.value = profitStr; }
    if (percEl)   { percEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; percEl.dataset.value = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; }

    if (emailEl) emailEl.textContent = user.email || '';
    if (idEl) idEl.textContent = user.glorivest_id || `GV${String(user.id || 0).padStart(6, '0')}`;

    // persist
    state.user = user;
    state.currentAccount = account;
    if (account?.id) localStorage.setItem('currentAccountId', String(account.id));
  }
  window.computeAndRender = computeAndRender;

  async function loadBalances() {
    const { user, account } = await loadFullUser();
    if (!user || !account) return;
    computeAndRender(user, account);
    // ensure toggle UI reflects selected account
    syncToggleWithCurrent(account);
  }
  window.loadBalances = loadBalances;
  

  // ---------------------------
  // Account Sheet: fetching + rendering
  // ---------------------------
  async function fetchAccountsForSheet() {
    try {
      const accs = await APIFETCH('/accounts');
      state.accounts = Array.isArray(accs) ? accs : [];
      return state.accounts;
    } catch (e) {
      console.warn('fetchAccountsForSheet error', e);
      state.accounts = [];
      return [];
    }
  }
  window.fetchAccountsForSheet = fetchAccountsForSheet;

  function renderAccountsListFactory(listEl) {
    return function renderAccountsList() {
      if (!listEl) return;
      // loading
      listEl.innerHTML = `<div class="text-sm text-white/60 p-4">Loading accounts…</div>`;

      fetchAccountsForSheet().then(accounts => {
        if (!accounts || accounts.length === 0) {
          listEl.innerHTML = `<div class="text-sm text-white/60 p-4">No accounts yet</div>`;
          return;
        }

        // manage create button state (max 5)
        const createBtn = qs('btn-accounts-create');
        if (createBtn) {
          if (accounts.length >= 5) createBtn.classList.add('opacity-40', 'pointer-events-none');
          else createBtn.classList.remove('opacity-40', 'pointer-events-none');
        }

        listEl.innerHTML = '';
        accounts.forEach(acc => {
          const isSelected = state.currentAccount?.id === acc.id;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = "w-full p-3 rounded-xl border text-left flex items-center justify-between transition " +
            (isSelected ? "bg-[#00D2B1]/20 border-[#00D2B1]" : "bg-white/5 border-white/10 hover:bg-white/10");

          const displayName = (acc.account_name || acc.account_code || `Account ${acc.id}`).toString().replace(/-(std|pro|elite)$/i, '');
          const accTypeLabel = (String(acc.account_type || '').toLowerCase() === 'demo') ? 'Demo' : 'Live';

          btn.innerHTML = `
            <div>
              <div class="font-medium">${escapeHtml(displayName)}</div>
              <div class="text-xs text-white/60 mt-1">${escapeHtml(accTypeLabel)}</div>
            </div>
            <div class="text-sm font-semibold">${fmtUSD(acc.balance_cents)}</div>
          `;

          btn.addEventListener('click', async () => {
            state.currentAccount = acc;
            if (acc?.id) localStorage.setItem('currentAccountId', String(acc.id));
            computeAndRender(state.user, acc);

            // refresh list highlight
            renderAccountsList();

            // populate review sheet
            const reviewBody = qs('review-body');
            const reviewTitle = qs('review-title');
            if (reviewBody) {
              reviewTitle && (reviewTitle.textContent = 'Account Details');
              reviewBody.innerHTML = `
                <div class="space-y-2">
                  <div><span class="text-xs text-white/60">Account Code</span><div class="font-semibold">${escapeHtml(acc.account_code || '—')}</div></div>
                  <div><span class="text-xs text-white/60">Type</span><div class="font-semibold">${escapeHtml(accTypeLabel)}</div></div>
                  <div><span class="text-xs text-white/60">Balance</span><div class="font-semibold">${fmtUSD(acc.balance_cents)}</div></div>
                  <div><span class="text-xs text-white/60">Status</span><div class="text-xs font-semibold text-[#00D2B1]">${escapeHtml(acc.status || 'Active')}</div></div>
                </div>`;
            }

            closeAccSheetById('sheet-accounts');
            openAccSheetById('sheet-review');
            // update toggle UI
            syncToggleWithCurrent(acc);
          });

          listEl.appendChild(btn);
        });
      }).catch(err => {
        console.warn('renderAccountsList failed', err);
        listEl.innerHTML = `<div class="text-sm text-red-400 p-4">Failed to load accounts</div>`;
      });
    };
  }

  // small safe-escape helper for text inserted as HTML
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ---------------------------
  // Account Sheets open/close + drag (kept simple and robust)
  // ---------------------------
  function openAccSheetById(modalId) {
    const modal = qs(modalId);
    if (!modal) return;
    const backdrop = modal.querySelector('[id$="-backdrop"]') || modal.querySelector('.sheet-backdrop');
    const panel = modal.querySelector('[id$="-panel"]') || modal.querySelector('.sheet-panel');

    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop && backdrop.classList.add('opacity-100');
      panel && panel.classList.remove('translate-y-full');
    });
  }

  function closeAccSheetById(modalId) {
    const modal = qs(modalId);
    if (!modal) return;
    const backdrop = modal.querySelector('[id$="-backdrop"]') || modal.querySelector('.sheet-backdrop');
    const panel = modal.querySelector('[id$="-panel"]') || modal.querySelector('.sheet-panel');

    backdrop && backdrop.classList.remove('opacity-100');
    panel && panel.classList.add('translate-y-full');

    setTimeout(() => modal.classList.add('hidden'), 220);
  }

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
      const trans = panelEl.style.transform || '';
      const dy = parseFloat(trans.replace('translateY(', '')) || 0;
      panelEl.style.transition = '';
      if (dy > 70) closeFn();
      else panelEl.style.transform = '';
    }

    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
  }

  // ---------------------------
  // Setup account sheet handlers & "create account" flow
  // ---------------------------
  function setupAccountSheetHandlers() {
    // create a renderer bound to the list element
    const listEl = qs('list-accounts');
    const renderAccountsList = renderAccountsListFactory(listEl);
    window.renderAccountsList = renderAccountsList;

    // open accounts sheet button
    const btnOpen = qs('btn-open-accounts');
    if (btnOpen) {
      btnOpen.addEventListener('click', async () => {
        renderAccountsList();
        openAccSheetById('sheet-accounts');
      });
    }

    // create account button
    const btnCreate = qs('btn-accounts-create');
    if (btnCreate) {
      btnCreate.addEventListener('click', () => {
        if (state.accounts.length >= 5) {
          showToast && showToast('Maximum of 5 accounts allowed');
          return;
        }
        openAccSheetById('sheet-new');
      });
    }

    // backdrops
    qs('sheet-accounts-backdrop')?.addEventListener('click', () => closeAccSheetById('sheet-accounts'));
    qs('sheet-new-backdrop')?.addEventListener('click', () => closeAccSheetById('sheet-new'));
    qs('sheet-review-backdrop')?.addEventListener('click', () => closeAccSheetById('sheet-review'));

    // attach drags
    attachAccDrag(qs('sheet-accounts-panel'), () => closeAccSheetById('sheet-accounts'));
    attachAccDrag(qs('sheet-new-panel'), () => closeAccSheetById('sheet-new'));
    attachAccDrag(qs('sheet-review-panel'), () => closeAccSheetById('sheet-review'));

    // back buttons
    qs('btn-new-back')?.addEventListener('click', () => {
      closeAccSheetById('sheet-new');
      openAccSheetById('sheet-accounts');
    });
    qs('btn-review-back')?.addEventListener('click', () => {
      closeAccSheetById('sheet-review');
      openAccSheetById('sheet-accounts');
    });

    // review confirm acts as close
    const confirmBtn = qs('btn-review-confirm');
    if (confirmBtn) {
      confirmBtn.textContent = 'Close';
      confirmBtn.addEventListener('click', () => closeAccSheetById('sheet-review'));
    }

    // New account creation flow (expects .tier-card elements with data-tier="demo" or "live")
    const newCreate = qs('btn-new-create');
    function updateCreateLimitState() {
      if (!newCreate) return;
      if (state.accounts.length >= 5) {
        newCreate.disabled = true;
        newCreate.classList.add('opacity-40', 'pointer-events-none');
      } else {
        newCreate.disabled = false;
        newCreate.classList.remove('opacity-40', 'pointer-events-none');
      }
    }
    updateCreateLimitState();

    if (newCreate) {
      newCreate.addEventListener('click', async () => {
        if (state.accounts.length >= 5) {
          showToast && showToast('Maximum of 5 accounts allowed');
          return;
        }

        const tierContainer = qs('list-tiers');
        const selected = tierContainer?.querySelector('.tier-card.dep-active');
        const chosen = selected?.dataset?.tier;
        if (!chosen) {
          showToast && showToast('Please choose account type (Demo or Live)');
          return;
        }

        try {
          newCreate.disabled = true;
          newCreate.textContent = 'Creating...';
          const payload = { account_type: chosen.toLowerCase() };
          await APIFETCH('/accounts', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          showToast && showToast('Account created');
          closeAccSheetById('sheet-new');
          await renderAccountsList();
          await loadBalances();
        } catch (err) {
          console.error('Create account failed', err);
          showToast && showToast('Failed to create account');
        } finally {
          newCreate.textContent = 'Create';
          updateCreateLimitState();
        }
      });
    }

    // tier-card selection for new account (works for demo/live)
    const tierContainer = qs('list-tiers');
    if (tierContainer) {
      tierContainer.querySelectorAll('.tier-card').forEach(btn => {
        btn.addEventListener('click', () => {
          tierContainer.querySelectorAll('.tier-card').forEach(x => x.classList.remove('dep-active'));
          btn.classList.add('dep-active');
        });
      });
    }
  }


  // ---------------------------
// Toggle (Demo / Live) UI logic — FINAL WORKING VERSION
// ---------------------------

const DEMO_DEFAULT = 10000;
const DEMO_DEFAULT_CENTS = DEMO_DEFAULT * 100;

// Ensure demo + live accounts are identified after loadFullUser runs
function resolveAccounts() {
  state.demo = state.accounts.find(a => (a.account_type || '').toLowerCase() === 'demo') || null;
  state.live = state.accounts.find(a => ['live', 'real'].includes((a.account_type || '').toLowerCase())) || null;
}

// ---------------------------
// Update cards
// ---------------------------
function updateDemoCard() {
  if (!state.demo || !state.user) return;

  qs("demo-total").textContent = `$${DEMO_DEFAULT.toLocaleString()}.00`;
  qs("demo-profit").textContent = "+$0.00";
  qs("demo-percentage").innerHTML = `<i class="fa-solid fa-arrow-up"></i> +0.0%`;
}

function updateLiveCard() {
  if (!state.live || !state.user) return;

  const bal = Number(state.live.balance_cents || 0) / 100;
  const profit = Number(state.live.profit_cents || 0) / 100;

  qs("live-total").textContent = money(bal);
  qs("live-profit").textContent = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;

  const percent = bal > 0 ? (profit / bal) * 100 : 0;
  qs("live-percentage").innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percent.toFixed(1)}%`;
}

// ---------------------------
// Card visibility switching
// ---------------------------
function showDemoCard() {
  qs("demo-card").classList.remove("hidden");
  qs("live-card").classList.add("hidden");

  qs("account-title").textContent = "Demo";

  // show reset button in demo mode
  qs("demo-reset")?.classList.remove("hidden");
}


function showLiveCard() {
  qs("live-card").classList.remove("hidden");
  qs("demo-card").classList.add("hidden");

  qs("account-title").textContent = "Live";

  // hide reset button in live mode
  qs("demo-reset")?.classList.add("hidden");
}


// ---------------------------
// Toggle pill movement
// ---------------------------
function moveToggle(mode) {
  const track = qs("toggle-track");

  if (mode === "demo") {
    track.style.transform = "translateX(0px)";
  } else {
    track.style.transform = "translateX(63px)";
  }
}

// ---------------------------
// Click handlers
// ---------------------------
function initToggle() {
  qs("toggle-demo").addEventListener("click", () => {
    moveToggle("demo");
    showDemoCard();
  });

  qs("toggle-live").addEventListener("click", () => {
    moveToggle("live");
    showLiveCard();
  });
}

// ---------------------------
// Demo reset
// ---------------------------
function initDemoReset() {
  qs("demo-reset").addEventListener("click", () => {
    if (!state.demo) return;

    state.demo.balance_cents = DEMO_DEFAULT_CENTS;
    updateDemoCard();
    showDemoCard();
    showToast("Demo balance reset to $10,000");
  });
}

// ---------------------------
// Boot inside main DOMContentLoaded
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  resolveAccounts();
  updateDemoCard();
  updateLiveCard();
  showDemoCard();
  moveToggle("demo");
  initToggle();
  initDemoReset();
});





// ---------------------------
// Update demo reset button visibility
// ---------------------------
function updateDemoResetVisibility(account) {
    const btn = qs("demo-reset");
    if (!btn || !account) return;

    const isDemo = account.account_type?.toLowerCase() === "demo";
    const bal = Number(account.balance_cents || 0);

    // 10,000 USD = 1,000,000 cents
    const isDefaultAmount = bal === 1000000;

    if (isDemo && !isDefaultAmount) {
        btn.classList.remove("hidden");
    } else {
        btn.classList.add("hidden");
    }
}



  // ---------------------------
  // Utility: applyHeader (external callers may use)
  // ---------------------------
  function applyHeader(acc) {
    if (!acc) return;
    const accType = (String(acc.account_type || '').toLowerCase() === 'demo') ? 'Demo' : 'Live';
    const code = cleanAccountCode(acc.account_code || '');
    qs('current-account-tier') && (qs('current-account-tier').textContent = accType);
    qs('current-account-code') && (qs('current-account-code').textContent = code);
    const bal = centsToNumber(acc.balance_cents);
    qs('total-balance') && (qs('total-balance').textContent = money(bal));
    qs('available-balance') && (qs('available-balance').textContent = money(bal));
  }
  window.applyHeader = applyHeader;

  // ---------------------------
  // Boot: DOM ready
  // ---------------------------
  document.addEventListener('DOMContentLoaded', async () => {
    // init account sheet handlers
    setupAccountSheetHandlers();
    // attach toggle handlers
    attachToggleHandlers();

    // load balances and initial render
    await loadBalances();

    // ensure renderAccountsList is available globally
    if (typeof window.renderAccountsList === 'function') {
      // no-op; function is exposed by setupAccountSheetHandlers
    }
  });

  // expose loadBalances for external use
  window.loadBalances = loadBalances;

  // listen for external triggers to refresh balances
  document.addEventListener('balances:refresh', loadBalances);

})(); // end dashboard.js

// =======================================================
// CLOSE TAB / MODAL
// Called by: onclick="closeTab(this)"
// =======================================================
window.closeTab = function (btn) {
    const tabSection = btn.closest(".tab-content");
    if (!tabSection) return;

    // Hide modal
    tabSection.classList.add("hidden");

    // Always return user to dashboard after closing modal
    showTab("dashboard");

    // Fix bottom nav highlight
    document.querySelectorAll("[data-tab]").forEach(nav => {
        nav.classList.toggle("active-tab", nav.dataset.tab === "dashboard");
    });

    // Soft refresh balances
    document.dispatchEvent(new Event("balances:refresh"));
};


// =======================================================
//REFER NOW BUTTON IN DASHBOARD
// =======================================================

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector("[data-refer-now]");
    if (!btn) return;

    btn.addEventListener("click", () => {
        showTab("earn");

        // Fix bottom nav highlight
        document.querySelectorAll("[data-tab]").forEach(nav => {
            nav.classList.toggle("active-tab", nav.dataset.tab === "earn");
        });
    });
});

