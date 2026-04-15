(() => {
  'use strict';

  /* ===============================
     CONFIG
  =============================== */

  const API = window.API_BASE || '';

  const state = {
    method: 'BANK',
    activeWithdrawal: null,
    loading: false
  };

  const el = {};

  /* ===============================
     INIT
  =============================== */

  window.addEventListener('load', init);

  function init() {
    el.modal = document.getElementById('modal-withdraw');
    el.content = document.getElementById('withdraw-content');
    el.tabs = document.querySelectorAll('[data-wd]');

    if (!el.modal || !el.content) return;

    bindTabs();
    bindClose();
    renderCurrentView();

    window.openWithdrawModal = openModal;
  }

  function openModal() {
    el.modal.classList.remove('hidden');
    resetState();
    renderCurrentView();
  }

  function closeModal() {
    el.modal.classList.add('hidden');
    resetState();
  }

  function resetState() {
    state.method = 'BANK';
    state.activeWithdrawal = null;
    state.loading = false;

    el.tabs.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove(
        'active',
        'opacity-70',
        'cursor-not-allowed'
      );
    });

    document
      .querySelector('[data-wd="bank"]')
      ?.classList.add('active');
  }

  /* ===============================
     BINDINGS
  =============================== */

  function bindTabs() {
  el.tabs.forEach(btn => {
    btn.addEventListener('click', () => {

      if (state.activeWithdrawal) return;

      const type = btn.dataset.wd;

      state.method =
        type === 'crypto'
          ? 'CRYPTO'
          : 'BANK';

      el.tabs.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');

      renderCurrentView();
    });
  });
}

  function bindClose() {
    const closeBtn = el.modal.querySelector('[data-close="modal-withdraw"]');

    closeBtn?.addEventListener('click', closeModal);

    el.modal.addEventListener('click', e => {
      if (e.target === el.modal) closeModal();
    });
  }

  /* ===============================
     RENDER ROUTER
  =============================== */

  function renderCurrentView() {
    if (state.activeWithdrawal) {
      return renderPending(state.activeWithdrawal);
    }

    if (state.method === 'BANK') {
      return renderBankForm();
    }

    return renderCryptoForm();
  }

  /* ===============================
     BANK FORM
  =============================== */

  function renderBankForm() {
    el.content.innerHTML = `
      <div class="space-y-5">

        ${amountField()}

        <div class="text-sm text-white/55 leading-7">
          Withdrawal will be sent to your saved bank details.
        </div>

        <button
          id="withdraw-submit"
          class="gv-primary-btn"
        >
          Withdraw
        </button>

      </div>
    `;

    $('#withdraw-submit').onclick = submitWithdrawal;
  }

  /* ===============================
     CRYPTO FORM
  =============================== */

  function renderCryptoForm() {
    el.content.innerHTML = `
      <div class="space-y-5">

        ${amountField()}

        <div class="space-y-2">
          <label class="text-sm text-white/60">
            Wallet Address
          </label>

          <input
            id="crypto-address"
            type="text"
            class="gv-input"
            placeholder="USDT TRC20 wallet address"
            autocomplete="off"
            spellcheck="false"
          />
        </div>

        <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-xs text-yellow-300 leading-7">
          ⚠ Use only TRC20 network<br>
          ⚠ Confirm address carefully<br>
          ⚠ Wrong address may permanently lose funds
        </div>

        <button
          id="withdraw-submit"
          class="gv-primary-btn"
        >
          Withdraw
        </button>

      </div>
    `;

    $('#withdraw-submit').onclick = submitWithdrawal;
  }

  /* ===============================
     COMPONENTS
  =============================== */

  function amountField() {
    return `
      <div class="space-y-2">
        <label class="text-sm text-white/60">
          Amount (USD)
        </label>

        <input
          id="withdraw-amount"
          type="number"
          min="20"
          step="0.01"
          class="gv-input"
          placeholder="Minimum $20"
        />
      </div>
    `;
  }

  /* ===============================
     HELPERS
  =============================== */

  function $(selector) {
    return document.querySelector(selector);
  }


    /* ===============================
     API
  =============================== */

  async function api(url, options = {}) {
    const res = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Request failed');
    }

    return data;
  }

  /* ===============================
     SUBMIT
  =============================== */

  async function submitWithdrawal() {
    if (state.loading) return;

    try {
      state.loading = true;
      setButtonLoading(true);

      const amount = Number($('#withdraw-amount')?.value);

      if (!amount || amount < 20) {
        throw new Error('Minimum withdrawal is $20');
      }

      const walletId = await getWalletId();

      let destination = 'Saved bank account';

      if (state.method === 'CRYPTO') {
        const address = $('#crypto-address')?.value?.trim();

        if (!address) {
          throw new Error('Enter wallet address');
        }

        if (!/^T[a-zA-Z0-9]{33}$/.test(address)) {
          throw new Error('Invalid TRC20 wallet address');
        }

        const ok = confirm(
          'Confirm wallet address is correct. Wrong addresses may permanently lose funds.'
        );

        if (!ok) {
          state.loading = false;
          setButtonLoading(false);
          return;
        }

        destination = address;
      }

      const result = await api('/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          wallet_id: walletId,
          amount_usd: amount,
          destination,
          method: state.method
        })
      });

      state.activeWithdrawal = result;
      renderPending(result);

    } catch (err) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      state.loading = false;
      setButtonLoading(false);
    }
  }

  /* ===============================
     GET WALLET
  =============================== */

  async function getWalletId() {
    const wallets = await api('/wallets');

    const live = wallets.find(w => w.type === 'REAL');

    if (!live) {
      throw new Error('Main wallet not found');
    }

    return live.id;
  }

  /* ===============================
     PENDING
  =============================== */

  function renderPending(w) {
    const usd = Number(w.amount_cents || 0) / 100;

    el.tabs.forEach(btn => {
      btn.disabled = true;
      btn.classList.add('opacity-70', 'cursor-not-allowed');
    });

    el.content.innerHTML = `
      <div class="space-y-5">

        <div class="bg-white/5 rounded-2xl p-5 space-y-4">

          <div>
            <div class="text-xs text-white/40">Status</div>
            <div class="text-yellow-400 font-semibold">
              Pending Approval
            </div>
          </div>

          <div>
            <div class="text-xs text-white/40">Amount</div>
            <div class="text-xl font-semibold">
              $${usd.toFixed(2)}
            </div>
          </div>

          <div>
            <div class="text-xs text-white/40">Method</div>
            <div>${state.method}</div>
          </div>

        </div>

        <button
          id="cancel-withdrawal"
          class="w-full h-14 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400"
        >
          Cancel Withdrawal
        </button>

      </div>
    `;

    $('#cancel-withdrawal').onclick = cancelWithdrawal;
  }

  /* ===============================
     CANCEL
  =============================== */

  async function cancelWithdrawal() {
    if (!state.activeWithdrawal?.id) return;

    try {
      await api(`/withdrawals/${state.activeWithdrawal.id}/cancel`, {
        method: 'POST'
      });

      renderCancelled();

    } catch (err) {
      alert(err.message || 'Cancel failed');
    }
  }

  function renderCancelled() {
    state.activeWithdrawal = null;

    el.content.innerHTML = `
      <div class="text-center py-8 space-y-5">

        <div class="text-lg text-red-400 font-semibold">
          Withdrawal Cancelled
        </div>

        <button
          id="done-btn"
          class="gv-primary-btn"
        >
          Done
        </button>

      </div>
    `;

    $('#done-btn').onclick = closeModal;
  }

  /* ===============================
     UI
  =============================== */

  function setButtonLoading(on) {
    const btn = $('#withdraw-submit');
    if (!btn) return;

    btn.disabled = on;
    btn.textContent = on ? 'Processing...' : 'Withdraw';
    btn.classList.toggle('opacity-70', on);
  }

    /* ===============================
     OPEN MODAL ENHANCEMENT
  =============================== */

  async function openModal() {
    el.modal.classList.remove('hidden');
    resetState();

    try {
      await loadPendingWithdrawal();
    } catch (_) {}

    renderCurrentView();
  }

  /* ===============================
     LOAD EXISTING PENDING
  =============================== */

  async function loadPendingWithdrawal() {
    const list = await api('/withdrawals');

    if (!Array.isArray(list)) return;

    const pending = list.find(w =>
      String(w.status || '').toUpperCase() === 'PENDING'
    );

    if (pending) {
      state.activeWithdrawal = pending;

      state.method =
        String(pending.method || '').toUpperCase() === 'CRYPTO'
          ? 'CRYPTO'
          : 'BANK';
    }
  }

  /* ===============================
     SUCCESS (ADMIN APPROVED LATER)
  =============================== */

  function renderApproved() {
    el.content.innerHTML = `
      <div class="text-center py-8 space-y-5">

        <div class="text-lg font-semibold text-[#18d2c3]">
          Withdrawal Approved
        </div>

        <div class="text-sm text-white/55">
          Funds have been processed.
        </div>

        <button id="done-btn" class="gv-primary-btn">
          Done
        </button>

      </div>
    `;

    $('#done-btn').onclick = closeModal;
  }

  /* ===============================
     OPTIONAL STATUS REFRESH
  =============================== */

  async function refreshPendingStatus() {
    if (!state.activeWithdrawal?.id) return;

    try {
      const list = await api('/withdrawals');

      const current = list.find(
        x => Number(x.id) === Number(state.activeWithdrawal.id)
      );

      if (!current) return;

      const status = String(current.status || '').toUpperCase();

      if (status === 'SUCCESS' || status === 'APPROVED') {
        state.activeWithdrawal = null;
        renderApproved();
        return;
      }

      if (status === 'CANCELLED') {
        state.activeWithdrawal = null;
        renderCancelled();
        return;
      }

    } catch (_) {}
  }

  /* ===============================
     AUTO POLL WHILE OPEN
  =============================== */

  setInterval(() => {
    if (!el.modal?.classList.contains('hidden')) {
      refreshPendingStatus();
    }
  }, 10000);

})();