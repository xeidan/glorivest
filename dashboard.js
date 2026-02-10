(function () {
  'use strict';

  /* ======================================================
     HELPERS
  ====================================================== */
  const qs = (id) => document.getElementById(id);

  const APIFETCH =
    typeof window.apiFetch === 'function'
      ? window.apiFetch
      : async (path, opts = {}) => {
          const res = await fetch(path, opts);
          if (!res.ok) throw new Error('Request failed');
          return res.json();
        };

  function fmtUSD(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
  }

  /* ======================================================
     STATE (DERIVED ONLY)
  ====================================================== */
  const state = {
    user: null,
    wallets: [],
    realWallet: null,
    demoWallet: null,
    referralWallet: null
  };

  /* ======================================================
     MODE (GLOBAL SOURCE OF TRUTH)
  ====================================================== */
  function getMode() {
    return window.__accountMode || 'LIVE';
  }

  function setMode(mode) {
    const normalized = mode === 'REAL' ? 'LIVE' : mode;
    window.setAccountMode(normalized);
    document.body.classList.toggle('demo-mode', normalized === 'DEMO');
  }

  /* ======================================================
     WALLET SYNC (GLOBAL → LOCAL)
  ====================================================== */
  window.syncWalletsFromGlobal = function () {
    const wallets = window.getAllWallets?.() || [];

    state.wallets = wallets;
    state.realWallet = wallets.find(w => w.type === 'REAL') || null;
    state.demoWallet = wallets.find(w => w.type === 'DEMO') || null;
    state.referralWallet = wallets.find(w => w.type === 'REFERRAL') || null;
  };

  /* ======================================================
     LOAD USER
  ====================================================== */
  async function loadUser() {
    const me = await APIFETCH('/auth/me');
    if (!me?.id) return;

    state.user = {
      id: me.id,
      email: me.email,
      glorivest_id: me.glorivest_id,
      referral_earnings_cents: me.referral_earnings_cents
    };

    window.syncWalletsFromGlobal();
    window.renderDashboard();
  }

  /* ======================================================
     RENDER (GLOBAL)
  ====================================================== */
  window.renderDashboard = function () {
    if (!state.user) return;

    qs('user-email') && (qs('user-email').textContent = state.user.email);
    qs('glorivest-id') && (qs('glorivest-id').textContent = state.user.glorivest_id);

    renderBalances();
    syncToggleUI();
    updateDemoResetVisibility();
  };

  function renderBalances() {
    if (state.realWallet) {
      qs('live-total') &&
        (qs('live-total').textContent =
          fmtUSD(state.realWallet.balance_cents));

      qs('live-available') &&
        (qs('live-available').textContent =
          fmtUSD(state.realWallet.balance_cents));
    }

    if (state.demoWallet) {
      qs('demo-total') &&
        (qs('demo-total').textContent =
          fmtUSD(state.demoWallet.balance_cents));
    }

    if (state.referralWallet) {
      qs('live-referral') &&
        (qs('live-referral').textContent =
          fmtUSD(state.referralWallet.balance_cents));
    }
  }

  /* ======================================================
     TOGGLE UI (PURE UI)
  ====================================================== */
  function syncToggleUI() {
    const mode = getMode();

    moveToggle(mode);

    qs('demo-card')?.classList.toggle('hidden', mode !== 'DEMO');
    qs('live-card')?.classList.toggle('hidden', mode === 'DEMO');

    qs('account-title') &&
      (qs('account-title').textContent = mode === 'DEMO' ? 'Demo' : 'Live');
  }

  function moveToggle(mode) {
    const track = qs('toggle-track');
    if (!track) return;

    track.style.transform =
      mode === 'DEMO'
        ? 'translateX(0px)'
        : 'translateX(47px)';
  }

  function initToggle() {
    qs('toggle-demo')?.addEventListener('click', () => setMode('DEMO'));
    qs('toggle-live')?.addEventListener('click', () => setMode('LIVE'));
  }

  /* ======================================================
     DEMO RESET
  ====================================================== */
async function resetDemoBalance() {
  if (!state.demoWallet) return;

  const ok = confirm('Reset demo balance back to $10,000?');
  if (!ok) return;

  // 1️⃣ Call backend
  await APIFETCH(`/wallets/${state.demoWallet.id}/demo-reset`, {
    method: 'POST'
  });

  // 2️⃣ Record reset time (single source of truth on frontend)
  const ts = Date.now();
  window.__demoResetAt = ts;
  localStorage.setItem('demoResetAt', String(ts));

  // 3️⃣ Immediately wipe demo state in memory (UX, no ghosts)
  document.dispatchEvent(new Event('demo:reset'));

  // 4️⃣ Reload wallets (balance + navbar)
  await window.loadWallets();

  // 5️⃣ Force trade/dashboard re-render
  document.dispatchEvent(new Event('accountMode:changed'));
}


// Update demo reset button visibility
    function updateDemoResetVisibility() {
    const btn = qs('demo-reset');
    if (!btn || !state.demoWallet) return;

    const shouldShow =
      getMode() === 'DEMO' &&
      Number(state.demoWallet.balance_cents) !== 1_000_000;

    btn.classList.toggle('hidden', !shouldShow);
  }

  /* ======================================================
     INIT
  ====================================================== */
  document.addEventListener('DOMContentLoaded', async () => {
    initToggle();

    setMode(getMode());

    await window.loadWallets();
    await loadUser();

    qs('demo-reset')?.addEventListener('click', resetDemoBalance);
  });

  document.addEventListener('wallets:refresh', () => {
    window.syncWalletsFromGlobal();
    window.renderDashboard();
  });

})();

/* ======================================================
   GLOBAL MODE CHANGE REACTION
====================================================== */
document.addEventListener('accountMode:changed', () => {
  window.syncWalletsFromGlobal();
  window.renderDashboard();
});
