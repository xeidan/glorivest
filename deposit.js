(() => {
  'use strict';

  /* ==================================
     CONFIG
  ================================== */

  const API = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

  const state = {
    method: 'BANK',
    activeDeposit: null,
    countdownInterval: null,
    pollInterval: null
  };

  const el = {};

  /* ==================================
     INIT
  ================================== */

  window.addEventListener('load', init);

  function init() {
    el.modal = document.getElementById('modal-deposit');
    el.content = document.getElementById('deposit-content');
    el.tabs = document.querySelectorAll('[data-dep]');

    if (!el.content) {
      console.error('deposit-content not found');
      return;
    }

    bindTabs();
    renderCurrentView();
  }

  function bindTabs() {
    el.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        el.tabs.forEach(x => x.classList.remove('active'));
        btn.classList.add('active');

        const type = btn.dataset.dep;

        if (type === 'direct') state.method = 'BANK';
        if (type === 'crypto') state.method = 'CRYPTO';
        if (type === 'p2p') state.method = 'P2P';

        resetStateView();
        renderCurrentView();
      });
    });
  }

  /* ==================================
     RENDER ROUTER
  ================================== */

  function renderCurrentView() {
    if (state.method === 'BANK') return renderBankForm();
    if (state.method === 'CRYPTO') return renderCryptoForm();
    if (state.method === 'P2P') return renderP2PForm();
  }

  /* ==================================
     BANK
  ================================== */

  function renderBankForm() {
    el.content.innerHTML = `
      <div class="space-y-5">

        ${amountField()}

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm text-white/60">First Name</label>
            <input id="first-name" class="gv-input" placeholder="John">
          </div>

          <div>
            <label class="text-sm text-white/60">Last Name</label>
            <input id="last-name" class="gv-input" placeholder="Doe">
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <label class="text-sm text-white/60">Account Number</label>
            <input id="account-number" maxlength="10" class="gv-input" placeholder="0123456789">
          </div>

          <div>
            <label class="text-sm text-white/60">Bank</label>
            <input id="bank-name" class="gv-input" placeholder="Glorivest Bank">
          </div>
        </div>

        <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-xs text-yellow-300 leading-7">
          ⚠ Deposit must come from this account<br>
          ⚠ Name mismatch may delay or reject deposit
        </div>

        <button id="continue-btn" class="gv-primary-btn">
          Continue
        </button>

      </div>
    `;


    $('#continue-btn').onclick = handleBankDeposit;
  }

  /* ==================================
     CRYPTO
  ================================== */

  function renderCryptoForm() {
    el.content.innerHTML = `
      <div class="space-y-5">

        ${amountField()}

        <div class="text-xs text-white/50 leading-6">
          Enter amount above, then click Continue to generate wallet address.
        </div>

        <div class="bg-white/5 rounded-2xl p-5 space-y-4">
          <div class="text-sm text-white/80 leading-relaxed">
            Deposit with
            <span class="text-cyan-400 font-semibold">USDT (TRC20)</span>.
            Use only TRON network.
          </div>

          <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-xs text-yellow-300 leading-7">
            ⚠ We only accept USDT TRC20 on TRON<br>
            ⚠ Wrong network may permanently lose funds
          </div>
        </div>

        <button id="continue-btn" class="gv-primary-btn">
          Continue
        </button>

      </div>
    `;


    $('#continue-btn').onclick = handleCryptoDeposit;
  }

  /* ==================================
     P2P
  ================================== */

  function renderP2PForm() {
    el.content.innerHTML = `
      <div class="space-y-5">

        ${amountField()}

        <div class="text-xs text-white/50 leading-6">
          Enter amount above, then click Continue to get matched.
        </div>

        <div class="bg-white/5 rounded-2xl p-5 space-y-4">
          <div class="text-sm text-white/80">
            Deposit through verified peer-to-peer sellers.
          </div>

          <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-xs text-yellow-300 leading-7">
            ⚠ Only pay the seller assigned to your order
          </div>
        </div>

        <button id="continue-btn" class="gv-primary-btn">
          Continue
        </button>

      </div>
    `;


    $('#continue-btn').onclick = handleP2PDeposit;
  }

  /* ==================================
     ACTIONS 
  ================================== */

async function handleBankDeposit() {
  const amount = Number($('#amount')?.value);

  if (!amount || amount < 50) {
    return alert('Minimum deposit is $50');
  }

  const first = $('#first-name')?.value?.trim();
  const last = $('#last-name')?.value?.trim();
  const number = $('#account-number')?.value?.trim();
  const bank = $('#bank-name')?.value?.trim();

  if (!first || !last) return alert('Enter full name');
  if (!/^\d{10}$/.test(number)) {
    return alert('Account number must be 10 digits');
  }
  if (!bank) return alert('Enter bank name');

  const deposit = await secureFetch('/deposit', {
    method: 'POST',
    body: JSON.stringify({
      amount_cents: Math.round(amount * 100),
      method: 'BANK',
      sender_account_name: `${first} ${last}`,
      sender_account_number: number,
      sender_bank_name: bank
    })
  });

  state.activeDeposit = deposit;
  renderBankLocked(deposit, { first, last, number, bank });
}

async function handleCryptoDeposit() {
  const amount = Number($('#amount')?.value);

  if (!amount || amount < 50) {
    return alert('Minimum deposit is $50');
  }

  const deposit = await secureFetch('/deposit', {
    method: 'POST',
    body: JSON.stringify({
      amount_cents: Math.round(amount * 100),
      method: 'CRYPTO'
    })
  });

  state.activeDeposit = deposit;
  renderCryptoWallet(deposit);
}

async function handleP2PDeposit() {
  renderP2PMatch();
}

  /* ==================================
     COMPONENTS
  ================================== */

function amountField() {
  return `
    <div class="space-y-2">
      <label class="text-sm text-white/60">Amount (USD)</label>

      <input
        id="amount"
        type="number"
        min="50"
        step="0.01"
        class="gv-input"
        placeholder="Minimum $50"
      >
    </div>
  `;
}


/* ==================================
   BANK LOCKED VIEW
================================== */
  function renderBankLocked(d, user) {
  el.content.innerHTML = `
    <div class="space-y-5">

      <div class="bg-white/5 rounded-2xl p-4 space-y-1">
        <div class="text-xs text-white/40">Your Details</div>
        <div class="font-semibold">${user.first} ${user.last}</div>
        <div class="text-sm text-white/60">
          ${user.bank} • ${user.number}
        </div>
      </div>

      <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-xs text-yellow-300 leading-7">
        ⚠ Send ONLY from your account<br>
        ⚠ Copy reference before payment<br>
        ⚠ Name mismatch = refund
      </div>

      <div class="bg-white/5 rounded-2xl p-4 space-y-4">

        ${copyRow('Reference', d.reference)}
        ${copyRow('Bank', 'Providus Bank')}
        ${copyRow('Account Number', '1308556778')}
        ${copyRow('Amount (NGN)', formatNGN(d.amount))}
        
        <div class="text-sm text-white/55">
          USD: ${formatUSD(d.amount_cents)}
        </div>

        <div id="timer" class="text-xs text-white/40"></div>
      </div>

      <button id="confirm-btn" class="gv-primary-btn">
        Confirm Payment
      </button>

      <button id="cancel-btn"
        class="w-full h-14 rounded-2xl border border-red-500/25 text-red-400 bg-red-500/5">
        Cancel
      </button>

    </div>
  `;

  attachCopy();
  startTimer(d.expires_at);

  $('#confirm-btn').onclick = confirmPayment;
  $('#cancel-btn').onclick = cancelDeposit;
}

function renderCryptoWallet(d) {
  const address = d.address || 'Unavailable';

  el.content.innerHTML = `
    <div class="space-y-5">

      <div class="bg-white/5 rounded-2xl p-5 space-y-3">
        <div class="text-lg font-semibold">Crypto Deposit</div>

        <div class="text-sm text-white/65">
          Send only <span class="text-cyan-400 font-semibold">USDT (TRC20)</span>
          to the wallet below.
        </div>
      </div>

      <div class="bg-white/5 rounded-2xl p-5 space-y-5">

        <div>
          <div class="text-xs text-white/45 mb-2">Wallet Address</div>

          <div class="rounded-xl bg-black/20 border border-white/5 p-4">
            <div class="font-mono text-cyan-300 break-all text-sm leading-6">
              ${address}
            </div>
          </div>
        </div>

        <button id="copy-address-btn"
          class="w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white/85">
          Copy Address
        </button>

        <div class="rounded-2xl bg-white p-4 flex justify-center">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(address)}"
            class="w-48 h-48 rounded-xl"
          />
        </div>

        <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-4 text-sm text-yellow-300 leading-7">
          ⚠ Wrong network may lead to permanent loss of funds.
        </div>

        <div id="timer" class="text-xs text-white/40"></div>

      </div>

      <button id="confirm-btn" class="gv-primary-btn">
        I Have Sent Payment
      </button>

      <button id="cancel-btn"
        class="w-full h-14 rounded-2xl border border-red-500/25 text-red-400 bg-red-500/5">
        Cancel
      </button>

    </div>
  `;

  $('#copy-address-btn').onclick = async () => {
    await navigator.clipboard.writeText(address);
    const btn = $('#copy-address-btn');
    btn.textContent = 'Copied';
    btn.className =
      'w-full h-12 rounded-xl bg-[#18d2c3] text-black font-medium';

    setTimeout(() => {
      btn.textContent = 'Copy Address';
      btn.className =
        'w-full h-12 rounded-xl border border-white/10 bg-white/5 text-white/85';
    }, 1500);
  };

  startTimer(d.expires_at);

  $('#confirm-btn').onclick = confirmPayment;
  $('#cancel-btn').onclick = cancelDeposit;
}

function renderP2PMatch() {
  el.content.innerHTML = `
    <div class="space-y-5">

      <div class="bg-white/5 rounded-2xl p-5">
        <div class="text-lg font-semibold mb-1">P2P Deposit</div>
        <div class="text-sm text-white/65">
          You’ve been matched with a verified seller.
        </div>
      </div>

      <div class="bg-white/5 rounded-2xl p-5 space-y-4">
        <div><div class="text-xs text-white/40">Seller</div><div>Rave Trader 01</div></div>
        <div><div class="text-xs text-white/40">Bank</div><div>Glorivest Bank</div></div>
        <div><div class="text-xs text-white/40">Account Number</div><div>8123456789</div></div>
        <div><div class="text-xs text-white/40">Name</div><div>David Johnson</div></div>
      </div>

      <div class="rounded-2xl bg-yellow-500/10 border border-yellow-400/20 p-3 text-xs text-yellow-300 leading-7">
        ⚠ Pay only to the assigned seller
      </div>

      <button id="confirm-btn" class="gv-primary-btn">
        I Have Paid
      </button>

      <button id="cancel-btn"
        class="w-full h-14 rounded-2xl border border-red-500/25 text-red-400 bg-red-500/5">
        Cancel
      </button>

    </div>
  `;

  $('#confirm-btn').onclick = () => alert('Next: P2P confirmation');
  $('#cancel-btn').onclick = renderCurrentView;
}


async function secureFetch(url, options = {}) {
  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    location.reload();
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

/* =========================
   PAYMENT ACTIONS
========================= */

async function confirmPayment() {
  if (!state.activeDeposit?.id) return;

  try {
    await secureFetch(`/deposit/${state.activeDeposit.id}/mark-paid`, {
      method: 'POST'
    });

    renderSuccess();

  } catch (err) {
    alert(err.message || 'Failed');
  }
}

async function cancelDeposit() {
  if (!state.activeDeposit?.id) {
    renderCurrentView();
    return;
  }

  try {
    await secureFetch(`/deposit/${state.activeDeposit.id}/cancel`, {
      method: 'POST'
    });

    state.activeDeposit = null;
    renderCurrentView();

  } catch (err) {
    alert(err.message || 'Cancel failed');
  }
}

function renderSuccess() {
  clearTimers();

  el.content.innerHTML = `
    <div class="text-center py-8 space-y-5">

      <div class="text-lg font-semibold text-[#18d2c3]">
        Payment Submitted
      </div>

      <div class="text-sm text-white/55 leading-7">
        Awaiting admin confirmation.<br>
        This may take up to 24 hours.
      </div>

      <button id="done-btn" class="gv-primary-btn">
        Done
      </button>

    </div>
  `;

  $('#done-btn').onclick = () => {
    document.getElementById('modal-deposit')
      ?.classList.add('hidden');

    location.reload();
  };
}

/* =========================
   COPY
========================= */

function copyRow(label, value) {
  return `
    <div class="flex items-center justify-between gap-3">

      <div>
        <div class="text-xs text-white/40">${label}</div>
        <div class="font-medium">${value || '-'}</div>
      </div>

      <button
        class="copy-mini text-white/45"
        data-copy="${value}"
        type="button"
      >
        <i class="fa-regular fa-copy"></i>
      </button>

    </div>
  `;
}

function attachCopy() {
  document.querySelectorAll('.copy-mini').forEach(btn => {
    btn.onclick = async () => {
      const text = btn.dataset.copy || '';

      try {
        await navigator.clipboard.writeText(text);

        btn.classList.add('text-[#18d2c3]');

        setTimeout(() => {
          btn.classList.remove('text-[#18d2c3]');
        }, 1000);

      } catch {
        alert('Copy failed');
      }
    };
  });
}

/* =========================
   TIMER
========================= */

function startTimer(expiresAt) {
  clearTimers();

  const box = $('#timer');
  if (!box || !expiresAt) return;

  state.countdownInterval = setInterval(() => {
    const diff = new Date(expiresAt) - new Date();

    if (diff <= 0) {
      clearTimers();
      box.textContent = 'Expired';
      return;
    }

    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    box.textContent =
      `${mins}:${String(secs).padStart(2, '0')} remaining`;

  }, 1000);
}

function clearTimers() {
  clearInterval(state.countdownInterval);
  clearInterval(state.pollInterval);
}

/* =========================
   FORMAT
========================= */

function formatUSD(cents) {
  return '$' + (Number(cents || 0) / 100).toFixed(2);
}

function formatNGN(v) {
  return '₦' + Number(v || 0).toLocaleString();
}

/* =========================
   MODAL
========================= */

bindModalClose();

function bindModalClose() {
  const modal = document.getElementById('modal-deposit');
  const closeBtn = modal?.querySelector('[data-close="modal-deposit"]');

  closeBtn?.addEventListener('click', closeDepositModal);

  modal?.addEventListener('click', e => {
    if (e.target === modal) closeDepositModal();
  });
}

function closeDepositModal() {
  clearTimers();

  state.activeDeposit = null;
  state.method = 'BANK';

  document.querySelectorAll('[data-dep]').forEach(b =>
    b.classList.remove('active')
  );

  document.querySelector('[data-dep="direct"]')
    ?.classList.add('active');

  renderCurrentView();

  document.getElementById('modal-deposit')
    ?.classList.add('hidden');
}


  /* ==================================
     HELPERS
  ================================== */

  function resetStateView() {
    clearInterval(state.countdownInterval);
    clearInterval(state.pollInterval);
    state.activeDeposit = null;
  }

  function $(selector) {
    return document.querySelector(selector);
  }

})();