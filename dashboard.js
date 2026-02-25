(function () {
  'use strict';

  console.log("dashboard.js loaded");

  /* ===========================
     HELPERS
  =========================== */

  const qs = (id) => document.getElementById(id);

  function fmtUSD(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
  }

  /* ===========================
     STATE
  =========================== */

  const state = {
    user: null,
    wallets: [],
    realWallet: null,
    demoWallet: null,
    referralWallet: null
  };

  /* ===========================
     ACCOUNT MODE
  =========================== */

  function getMode() {
    return window.__accountMode || 'LIVE';
  }

  function setMode(mode) {
    const normalized = mode === 'REAL' ? 'LIVE' : mode;
    window.setAccountMode?.(normalized);
    document.body.classList.toggle('demo-mode', normalized === 'DEMO');
  }

  /* ===========================
     WALLET SYNC
  =========================== */

  window.syncWalletsFromGlobal = function () {
    const wallets = window.getAllWallets?.() || [];

    state.wallets = wallets;
    state.realWallet = wallets.find(w => w.type === 'REAL') || null;
    state.demoWallet = wallets.find(w => w.type === 'DEMO') || null;
    state.referralWallet = wallets.find(w => w.type === 'REFERRAL') || null;
  };

  /* ===========================
     LOAD USER
  =========================== */

  async function loadUser() {
    try {
      const me = await window.apiFetch('/auth/me');
      if (!me?.id) return;

      state.user = me;
      window.syncWalletsFromGlobal();
      renderDashboard();

    } catch (e) {
      console.error('loadUser failed', e);
    }
  }

  /* ===========================
     RENDER
  =========================== */

  function renderDashboard() {
    if (!state.user) return;

    if (qs('user-email')) qs('user-email').textContent = state.user.email;
    if (qs('glorivest-id')) qs('glorivest-id').textContent = state.user.glorivest_id;

    renderBalances();
    updateDemoResetVisibility();
  }

  function renderBalances() {
    if (state.realWallet && qs('live-total')) {
      qs('live-total').textContent = fmtUSD(state.realWallet.balance_cents);
    }

    if (state.demoWallet && qs('demo-total')) {
      qs('demo-total').textContent = fmtUSD(state.demoWallet.balance_cents);
    }

    if (state.referralWallet && qs('live-referral')) {
      qs('live-referral').textContent = fmtUSD(state.referralWallet.balance_cents);
    }
  }

  /* ===========================
     DEMO RESET
  =========================== */

  async function resetDemoBalance() {
    if (!state.demoWallet) return;

    const ok = confirm('Reset demo balance back to $10,000?');
    if (!ok) return;

    try {
      await window.apiFetch(`/wallets/${state.demoWallet.id}/demo-reset`, {
        method: 'POST'
      });

      await window.loadWallets?.();
      window.syncWalletsFromGlobal();
      renderDashboard();

    } catch (e) {
      console.error('demo reset failed', e);
    }
  }

  function updateDemoResetVisibility() {
    const btn = qs('demo-reset');
    if (!btn || !state.demoWallet) return;

    const show =
      getMode() === 'DEMO' &&
      Number(state.demoWallet.balance_cents) !== 1_000_000;

    btn.classList.toggle('hidden', !show);
  }

  /* ===========================
     MODAL SYSTEM
  =========================== */

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('hidden');
  }

  function initModals() {

    // Open modal
    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-open]');
      if (!openBtn) return;

      const id = openBtn.dataset.open;
      openModal(id);
    });

    // Close modal
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close]');
      if (!closeBtn) return;

      const id = closeBtn.dataset.close;
      closeModal(id);
    });

    // Backdrop close
    document.querySelectorAll('.gv-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // ESC close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.gv-modal').forEach(m => {
          m.classList.add('hidden');
        });
      }
    });
  }

  /* ===========================
     DEPOSIT TAB SWITCHING
  =========================== */

  function initDepositTabs() {
    const buttons = document.querySelectorAll('[data-dep]');
    const dynamic = qs('deposit-dynamic');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {

        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.dep;

        if (!dynamic) return;

        if (type === 'direct') {
          dynamic.innerHTML = `<p class="text-sm text-white/60">Bank transfer instructions will appear here.</p>`;
        }

        if (type === 'crypto') {
          dynamic.innerHTML = `<p class="text-sm text-white/60">USDT (TRC20) wallet address will appear here.</p>`;
        }

        if (type === 'p2p') {
          dynamic.innerHTML = `<p class="text-sm text-white/60">P2P instructions will appear here.</p>`;
        }

      });
    });
  }

  /* ===========================
     WITHDRAW TAB SWITCHING
  =========================== */

  function initWithdrawTabs() {
    const buttons = document.querySelectorAll('[data-wd]');
    const dynamic = qs('withdraw-dynamic');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {

        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.wd;

        if (!dynamic) return;

        if (type === 'bank') {
          dynamic.innerHTML = `<p class="text-sm text-white/60">Withdraw to your linked bank account.</p>`;
        }

        if (type === 'crypto') {
          dynamic.innerHTML = `<p class="text-sm text-white/60">Enter your USDT TRC20 wallet address.</p>`;
        }

      });
    });
  }

  /* ===========================
     INIT
  =========================== */

  document.addEventListener('DOMContentLoaded', async () => {

    console.log("DOM fully loaded");

    initModals();
    initDepositTabs();
    initWithdrawTabs();

    qs('demo-reset')?.addEventListener('click', resetDemoBalance);

    setMode(getMode());

    await window.loadWallets?.();
    await loadUser();
  });

})();