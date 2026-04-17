(function () {
  'use strict';

  console.log("dashboard.js loaded");

  /* ===========================
     HELPERS
  =========================== */

  const qs = (id) => document.getElementById(id);

function fmtUSD(cents) {
  const amount = Number(cents || 0) / 100;

  return '$' + amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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





/* ===========================
   ACCOUNT TOGGLE
=========================== */
function initAccountToggle() {
  const toggle = qs('account-mode-toggle');
  const demoCard = qs('demo-card');
  const liveCard = qs('live-card');
  const title = qs('account-title');

  if (!toggle) return;

  toggle.addEventListener('click', async () => {
    const nextMode = getMode() === 'DEMO' ? 'LIVE' : 'DEMO';

    if (typeof window.setAccountMode === 'function') {
      window.setAccountMode(nextMode);
    } else {
      window.__accountMode = nextMode;
      document.dispatchEvent(new Event('accountMode:changed'));
    }

    await window.loadWallets?.();
    window.syncWalletsFromGlobal();
  });

  document.addEventListener('accountMode:changed', () => {
    const isDemo = getMode() === 'DEMO';

    toggle.classList.toggle('is-demo', isDemo);
    toggle.classList.toggle('is-live', !isDemo);

    if (title) title.textContent = isDemo ? 'Demo' : 'Live';

    demoCard?.classList.toggle('hidden', !isDemo);
    liveCard?.classList.toggle('hidden', isDemo);

    renderDashboard();
    updateDemoResetVisibility();
  });
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
    const isDemo = getMode() === 'DEMO';

qs('demo-card')?.classList.toggle('hidden', !isDemo);
qs('live-card')?.classList.toggle('hidden', isDemo);
    updateDemoResetVisibility();
  }

function renderBalances() {
  const wallets = window.getAllWallets?.() || [];

  const realWallet = wallets.find(w => w.type === 'REAL') || null;
  const demoWallet = wallets.find(w => w.type === 'DEMO') || null;
  const referralWallet = wallets.find(w => w.type === 'REFERRAL') || null;

  state.realWallet = realWallet;
  state.demoWallet = demoWallet;
  state.referralWallet = referralWallet;

  const isDemo = getMode() === 'DEMO';

  // ===== TITLE =====
  if (qs('account-title')) {
    qs('account-title').textContent = isDemo ? 'Demo' : 'Live';
  }

  // ===== DEMO =====
  if (demoWallet && qs('demo-total')) {
    qs('demo-total').textContent = fmtUSD(demoWallet.balance_cents);
  }

  // ===== LIVE =====
  if (realWallet && qs('live-total')) {
    qs('live-total').textContent = fmtUSD(realWallet.balance_cents);
  }

  // ===== AVAILABLE =====
  if (realWallet && qs('live-available')) {
    qs('live-available').textContent = fmtUSD(realWallet.balance_cents);
  }

  // ===== REFERRAL =====
  if (referralWallet && qs('live-referral')) {
    qs('live-referral').textContent = fmtUSD(referralWallet.balance_cents);
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

  // 👇 FORCE dashboard active
  if (typeof showTab === 'function') {
    showTab('dashboard');
  }

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

function setSegmentActive(buttons, activeBtn) {
  buttons.forEach(btn => {
    btn.className =
      'rounded-xl py-2.5 font-medium text-white/60 transition';
  });

  activeBtn.className =
    'rounded-xl py-2.5 font-semibold bg-[#00D2B1] text-black transition';
}

/* ===========================
   DEPOSIT TAB SWITCHING
=========================== */
function initDepositTabs() {
  const buttons = document.querySelectorAll('[data-dep]');
  const dynamic = qs('deposit-content');
  if (!buttons.length || !dynamic) return;

  let bankDraft = {
    amount: '',
    first: '',
    last: '',
    acct: '',
    bank: ''
  };

  function toTitleCase(str = '') {
  return str
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

  function setActive(btn) {
    buttons.forEach(b => {
      b.className =
        'rounded-xl py-2.5 font-medium text-white/60 transition';
    });

    btn.className =
      'rounded-xl py-2.5 font-semibold bg-[#00D2B1] text-black transition';
  }

function input(ph = '', mode = 'text', role = '', value = '') {
  const map = {
    decimal: 'decimal',
    numeric: 'numeric',
    text: 'text'
  };

  return `
    <input
      type="text"
      inputmode="${map[mode] || 'text'}"
      autocomplete="off"
      spellcheck="false"
      placeholder="${ph}"
      value="${value || ''}"
      ${role ? `data-role="${role}"` : ''}
      class="block w-full h-14 px-5 rounded-2xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 outline-none caret-white focus:border-[#00D2B1] focus:bg-white/10"
    >
  `;
}

  function textarea(ph = '') {
    return `
      <textarea
        rows="4"
        placeholder="${ph}"
        class="block w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 outline-none resize-none caret-white focus:border-[#00D2B1] focus:bg-white/10"
      ></textarea>
    `;
  }

  function btnPrimary(label) {
    return `
      <button type="button"
        class="continue-btn w-full h-14 rounded-2xl bg-white text-black text-sm font-semibold active:scale-[0.98] transition">
        ${label}
      </button>
    `;
  }

  function btnGreen(label) {
    return `
      <button type="button"
        class="continue-btn w-full h-14 rounded-2xl bg-[#00D2B1] text-black text-sm font-semibold active:scale-[0.98] transition">
        ${label}
      </button>
    `;
  }

function btnDanger(label) {
  return `
    <button type="button"
      class="cancel-btn w-full h-14 rounded-2xl border border-red-500/25 bg-red-500/12 text-red-300 text-sm font-semibold transition active:scale-[0.98] active:scale-[0.98]
hover:bg-red-500/16">
      ${label}
    </button>
  `;
}

  function bindRules(type) {
    const amount = dynamic.querySelector('[data-role="amount"]');
    const account = dynamic.querySelector('[data-role="account"]');

    if (amount) {
      amount.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/[^0-9.]/g, '');
      });
    }

    if (type === 'direct' && account) {
      account.maxLength = 10;

      account.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
      });
    }
  }

async function copyText(value, btn) {
  try {
    await navigator.clipboard.writeText(value || '');

    if (btn) {
      btn.style.color = '#00D2B1';
btn.style.borderColor = 'rgba(0,210,177,.45)';
btn.style.background = 'rgba(0,210,177,.12)';

      setTimeout(() => {
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.background = '';
      }, 1500);
    }

  } catch (_) {}
}



  function render(type) {
    /* ================= BANK FORM ================= */
    if (type === 'direct') {
      dynamic.innerHTML = `
        <div class="space-y-4">

${input('Minimum $50', 'decimal', 'amount')}

<div class="grid grid-cols-2 gap-3">
  ${input('First Name', 'text', '', bankDraft.first)}
  ${input('Last Name', 'text', '', bankDraft.last)}
</div>

${input('Account Number', 'numeric', 'account', bankDraft.acct)}
${input('Bank Name', 'text', '', bankDraft.bank)}

          <div class="rounded-2xl border !border-yellow-300/35 !bg-yellow-400/18 px-4 py-4 text-xs space-y-2 leading-6">
            <p class="!text-[#F8E38A]">⚠ Enter sender details exactly as used for payment</p>
            <p class="!text-[#F8E38A]">⚠ Name mismatch may delay or reject deposit</p>
          </div>

          ${btnPrimary('Continue')}
        </div>
      `;
    }

    /* ================= CRYPTO FORM ================= */
    if (type === 'crypto') {
      dynamic.innerHTML = `
        <div class="space-y-4">

          ${input('Enter Amount', 'decimal', 'amount')}

          <div class="rounded-2xl border !border-yellow-300/35 !bg-yellow-400/18 px-4 py-4 text-xs space-y-2 leading-6">
            <p class="!text-[#F8E38A]">⚠ Use only USDT TRC20</p>
            <p class="!text-[#F8E38A]">⚠ Wrong network may lose funds</p>
          </div>

          ${btnPrimary('Continue')}
        </div>
      `;
    }

    /* ================= P2P ================= */
    if (type === 'p2p') {
      dynamic.innerHTML = `
        <div class="space-y-4">

          ${input('Enter Amount', 'decimal', 'amount')}
          ${textarea('Notes (optional)')}

          <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-center space-y-3">
            <div class="text-3xl">🤝</div>
            <p class="text-white font-semibold">P2P Not Available Yet</p>
            <p class="text-white/60 text-sm">
              Verified peer-to-peer deposits are currently in development.
            </p>
          </div>

          ${btnPrimary('Back')}
        </div>
      `;
    }

    bindRules(type);
    bindContinue(type);
  }

  function bindContinue(type) {
    const btn = dynamic.querySelector('.continue-btn');
    if (!btn) return;

    btn.onclick = async () => {
      try {
        btn.disabled = true;
        btn.textContent = 'Please wait...';

        const fields = dynamic.querySelectorAll('input, textarea');

        /* ================= BANK FLOW ================= */
        if (type === 'direct') {
        const amount = fields[0].value.trim();
        const first = toTitleCase(fields[1].value);
        const last = toTitleCase(fields[2].value);
        const acct = fields[3].value.trim();
        const bank = toTitleCase(fields[4].value);

        bankDraft = {
          amount,
          first,
          last,
          acct,
          bank
        };

        const res = await window.apiFetch('/deposit', {
            method: 'POST',
            body: {
              amount_cents: Math.round(Number(amount) * 100),
              method: 'BANK',
              sender_account_name: `${first} ${last}`.trim(),
              sender_account_number: acct,
              sender_bank_name: bank
            }
          });

          

dynamic.innerHTML = `
  <div class="space-y-4">

    <div class="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
      <p class="text-white/50 text-xs tracking-wide mb-2">Your Details</p>

      <p class="text-white/90 text-xl font-semibold leading-tight">
        ${bankDraft.first} ${bankDraft.last}
      </p>

      <p class="text-white/60 text-sm mt-2">
        ${bankDraft.bank} • ${bankDraft.acct}
      </p>
    </div>

    <div class="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-5">

      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 pr-3">
          <p class="text-white/55 text-xs tracking-wide">Reference</p>
          <p class="text-white/90 text-base font-semibold break-all mt-1">
            ${res.reference}
          </p>
        </div>

        <button class="copy-ref copy-btn w-11 h-11 rounded-xl border border-white/10 bg-white/5 text-white/55 flex items-center justify-center transition shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
            fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="1.9">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8 16H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 19h7a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2z"/>
          </svg>
        </button>
      </div>

      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 pr-3">
          <p class="text-white/55 text-xs tracking-wide">Bank</p>
          <p class="text-white/90 text-base font-semibold mt-1">
            ${res.bank_name || 'Providus Bank'}
          </p>
        </div>

        <button class="copy-bank copy-btn w-11 h-11 rounded-xl border border-white/10 bg-white/5 text-white/55 flex items-center justify-center transition shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
            fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="1.9">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8 16H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 19h7a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2z"/>
          </svg>
        </button>
      </div>

      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 pr-3">
          <p class="text-white/55 text-xs tracking-wide">Account Number</p>
          <p class="text-white/90 text-base font-semibold mt-1">
            ${res.account_number || '1308556778'}
          </p>
        </div>

        <button class="copy-acct copy-btn w-11 h-11 rounded-xl border border-white/10 bg-white/5 text-white/55 flex items-center justify-center transition shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5"
            fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="1.9">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8 16H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 19h7a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2z"/>
          </svg>
        </button>
      </div>

      <div class="pt-4 border-t border-white/5">
        <p class="text-white/55 text-xs tracking-wide">Amount (NGN)</p>
        <p class="text-white text-2xl font-semibold mt-1">
          ₦${Number(res.amount || 0).toLocaleString()}
        </p>
        <p class="text-white/65 text-sm mt-2">
          USD: $${(Number(res.amount_requested_cents) / 100).toFixed(2)}
        </p>
      </div>

    </div>

    <div class="rounded-2xl border !border-yellow-300/35 !bg-yellow-400/18 px-4 py-4 text-xs space-y-2 leading-6">
      <p class="!text-[#F8E38A]">⚠ Send only from your registered account</p>
      <p class="!text-[#F8E38A]">⚠ Payment confirmation may take time</p>
      <p class="!text-[#F8E38A]">⚠ Wrong sender name may delay approval</p>
    </div>

    ${btnGreen('Confirm Payment')}
    ${btnDanger('Cancel')}

  </div>
`;

            dynamic.querySelector('.copy-ref').onclick = (e) =>
              copyText(res.reference, e.currentTarget);

            dynamic.querySelector('.copy-bank').onclick = (e) =>
              copyText(res.bank_name || 'Providus Bank', e.currentTarget);

            dynamic.querySelector('.copy-acct').onclick = (e) =>
              copyText(res.account_number || '1308556778', e.currentTarget);

            dynamic.querySelector('.continue-btn').onclick = async () => {
              await window.apiFetch(`/deposit/${res.id}/mark-paid`, {
                method: 'POST'
              });

            dynamic.innerHTML = `
              <div class="space-y-4">

                <div class="rounded-2xl border border-[#00D2B1]/30 bg-[#00D2B1]/10 p-5 space-y-3">
                  <p class="text-white font-semibold">Payment Submitted</p>
                  <p class="text-white/70 text-sm">
                    Waiting for confirmation. This may take up to 24 hours.
                  </p>
                  <p class="text-white/70 text-sm">
                    Once approved, your balance will update automatically.
                  </p>
                </div>

                ${btnPrimary('Done')}
              </div>
            `;

            dynamic.querySelector('.continue-btn').onclick = () => {
              render('direct');
            };
          };

          dynamic.querySelector('.cancel-btn').onclick = async () => {
            await window.apiFetch(`/deposit/${res.id}/cancel`, {
              method: 'POST'
            });

            render('direct');
          };

          return;
        }

        /* ================= CRYPTO FLOW ================= */
if (type === 'crypto') {
  const amount = fields[0].value.trim();

  const res = await window.apiFetch('/deposit', {
    method: 'POST',
    body: {
      amount_cents: Math.round(Number(amount) * 100),
      method: 'CRYPTO'
    }
  });

dynamic.innerHTML = `
  <div class="space-y-4">

    <div class="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-5">



      <div class="space-y-2">
        <p class="text-white/55 text-xs uppercase tracking-wide">
          Wallet Address
        </p>

        <div class="flex items-center gap-3 rounded-2xl bg-black/25 border border-white/5 p-3">

          <p class="flex-1 text-sm font-semibold break-all leading-6" style="color:#56D8FF">
            ${res.address}
          </p>

          <button
            class="copy-wallet copy-btn w-11 h-11 rounded-xl border border-white/10 bg-white/5 text-white/55 flex items-center justify-center transition shrink-0"
            type="button">

            <svg xmlns="http://www.w3.org/2000/svg"
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.9">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8 16H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1M10 19h7a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2z"/>
            </svg>

          </button>

        </div>
      </div>

      <div class="rounded-2xl bg-white p-3 flex justify-center">
        <div class="w-56 h-56 rounded-2xl overflow-hidden bg-white flex items-center justify-center">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(res.address)}"
            class="w-full h-full object-contain"
          >
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">

        <div class="rounded-2xl bg-black/20 border border-white/5 p-4">
          <p class="text-white/55 text-xs uppercase tracking-wide">
            Network
          </p>

          <p class="text-white/90 text-base font-semibold mt-1">
            ${res.network} 
          </p>
        </div>

        <div class="rounded-2xl bg-black/20 border border-white/5 p-4">
          <p class="text-white/55 text-xs uppercase tracking-wide">
            Token
          </p>

          <p class="text-white/90 text-base font-semibold mt-1">
            ${res.token} TRC-20
          </p>
        </div>

      </div>

      <div class="rounded-2xl bg-[#00D2B1]/10 border border-[#00D2B1]/20 p-4">
        <p class="text-white/55 text-xs uppercase tracking-wide">
          Deposit Amount
        </p>

        <p class="text-white text-2xl font-semibold mt-1">
          $${(Number(res.amount_requested_cents) / 100).toFixed(2)}
        </p>

        <p class="text-white/65 text-sm mt-2">
          Send exact amount to avoid delays
        </p>
      </div>

    </div>

    <div class="rounded-2xl border !border-yellow-300/35 !bg-yellow-400/18 px-4 py-4 text-xs space-y-2 leading-6">
      <p class="!text-[#F8E38A]">⚠ Send only ${res.token} on ${res.network}</p>
      <p class="!text-[#F8E38A]">⚠ Wrong network may permanently lose funds</p>
      <p class="!text-[#F8E38A]">⚠ Confirm only after payment is sent</p>
    </div>

    ${btnGreen('I Have Sent Payment')}
    ${btnDanger('Cancel')}

  </div>
`;

dynamic.querySelector('.copy-wallet').onclick = (e) => {
  copyText(res.address, e.currentTarget);
};

  dynamic.querySelector('.continue-btn').onclick = async () => {
    await window.apiFetch(`/deposit/${res.id}/mark-paid`, {
      method: 'POST'
    });

    dynamic.innerHTML = `
      <div class="space-y-4">

        <div class="rounded-2xl border border-[#00D2B1]/30 bg-[#00D2B1]/10 p-5 space-y-3">
          <p class="text-white font-semibold">Payment Submitted</p>

          <p class="text-white/70 text-sm">
            Waiting for blockchain confirmation and review.
          </p>

          <p class="text-white/70 text-sm">
            Once approved, your balance will update automatically.
          </p>
        </div>

        ${btnPrimary('Done')}

      </div>
    `;

    dynamic.querySelector('.continue-btn').onclick = () => {
      render('crypto');
    };
  };

  dynamic.querySelector('.cancel-btn').onclick = () => {
    render('crypto');
  };

  return;
}
        /* ================= P2P ================= */
        if (type === 'p2p') {
          render('p2p');
          return;
        }

      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.textContent = 'Continue';
        alert(err.message || 'Deposit failed');
      }
    };
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      setActive(btn);
      render(btn.dataset.dep);
    });
  });

  buttons[0].click();
}



/* ===========================
   WITHDRAW TAB SWITCHING
=========================== */
function initWithdrawTabs() {
  const buttons = document.querySelectorAll('[data-wd]');
  const dynamic = qs('withdraw-content');
  if (!buttons.length || !dynamic) return;

  function field(ph = '', mode = 'text', cls = '') {
    const map = {
      decimal: 'decimal',
      numeric: 'numeric',
      text: 'text'
    };

    return `
      <input
        type="text"
        inputmode="${map[mode] || 'text'}"
        autocomplete="off"
        spellcheck="false"
        placeholder="${ph}"
        class="w-full h-14 px-5 rounded-2xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 outline-none focus:border-[#00D2B1] ${cls}"
      >
    `;
  }

  function warn(lines = []) {
    return `
      <div class="rounded-2xl border !border-yellow-300/35 !bg-yellow-400/18 px-4 py-4 text-xs space-y-2 leading-6">
        ${lines.map(t => `<p class="!text-[#F8E38A]">⚠ ${t}</p>`).join('')}
      </div>
    `;
  }

  function render(type) {
    if (type === 'bank') {
      dynamic.innerHTML = `
        <div class="space-y-4">

          ${field('Amount', 'decimal', 'wd-amount')}

          <div class="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <p class="text-white/50 text-xs mb-2">Withdrawal Account</p>
            <p class="text-white text-base font-semibold">Your Verified Bank</p>
            <p class="text-white/60 text-sm mt-1">Funds will be sent to your linked account</p>
          </div>

          ${warn([
            'Withdrawals are sent only to your verified bank account',
            'Name mismatch may delay review',
            'Processing time may vary'
          ])}

          <button class="continue-btn w-full h-14 rounded-2xl bg-white text-black font-semibold">
            Continue
          </button>

        </div>
      `;

      dynamic.querySelector('.continue-btn').onclick = () => {
        const amount = dynamic.querySelector('.wd-amount').value.trim();
        if (!amount) return alert('Enter amount');

        dynamic.innerHTML = `
          <div class="space-y-4">

            <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <p class="text-white/50 text-xs">Bank Withdrawal</p>
              <p class="text-white text-2xl font-semibold">$${amount}</p>
              <p class="text-white/60 text-sm">To your verified bank account</p>
            </div>

            ${warn([
              'Please confirm amount before submission',
              'Completed withdrawals may not be reversible'
            ])}

            <button class="submit-btn w-full h-14 rounded-2xl bg-[#00D2B1] text-black font-semibold">
              Confirm Withdrawal
            </button>

            <button class="cancel-btn w-full h-14 rounded-2xl border border-red-500/35 bg-red-500/12 text-red-400 font-semibold">
              Cancel
            </button>

          </div>
        `;

        dynamic.querySelector('.cancel-btn').onclick = () => render('bank');

        dynamic.querySelector('.submit-btn').onclick = async () => {
          alert('Bank withdrawal request submitted');
        };
      };
    }

    if (type === 'crypto') {
      dynamic.innerHTML = `
        <div class="space-y-4">

          ${field('Amount', 'decimal', 'wd-amount')}
          ${field('USDT TRC20 Wallet Address', 'text', 'wd-wallet')}

          ${warn([
            'Send only USDT on TRON (TRC20)',
            'Wrong network may permanently lose funds',
            'Wallet address cannot be changed after submission'
          ])}

          <button class="continue-btn w-full h-14 rounded-2xl bg-white text-black font-semibold">
            Continue
          </button>

        </div>
      `;

      dynamic.querySelector('.continue-btn').onclick = () => {
        const amount = dynamic.querySelector('.wd-amount').value.trim();
        const wallet = dynamic.querySelector('.wd-wallet').value.trim();

        if (!amount) return alert('Enter amount');
        if (!wallet) return alert('Enter wallet address');

        dynamic.innerHTML = `
          <div class="space-y-4">

            <div class="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
              <p class="text-white/50 text-xs">Crypto Withdrawal</p>
              <p class="text-white text-2xl font-semibold">$${amount}</p>
              <p class="text-sky-400 text-sm break-all">${wallet}</p>
              <p class="text-white/60 text-sm">Network: TRC20</p>
            </div>

            ${warn([
              'Wallet address cannot be changed after confirmation',
              'Wrong network may permanently lose funds'
            ])}

            <button class="submit-btn w-full h-14 rounded-2xl bg-[#00D2B1] text-black font-semibold">
              Confirm Withdrawal
            </button>

            <button class="cancel-btn w-full h-14 rounded-2xl border border-red-500/35 bg-red-500/12 text-red-400 font-semibold">
              Cancel
            </button>

          </div>
        `;

        dynamic.querySelector('.cancel-btn').onclick = () => render('crypto');

        dynamic.querySelector('.submit-btn').onclick = async () => {
          alert('Crypto withdrawal request submitted');
        };
      };
    }
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      setSegmentActive(buttons, btn);
      render(btn.dataset.wd);
    });
  });

  buttons[0].click();
}


/* ===========================
   TRANSACTIONS TAB SWITCHING
=========================== */
function initTransactionTabs() {
  const buttons = document.querySelectorAll('[data-filter]');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.className =
          'rounded-xl py-2.5 font-medium text-white/60 transition';
      });

      btn.className =
        'rounded-xl py-2.5 font-semibold bg-[#00D2B1] text-black transition';

      loadTransactions(btn.dataset.filter);
    });
  });

  buttons[0].click();
}


/* ===========================
   LOAD TRANSACTIONS
=========================== */
async function loadTransactions(filter = 'all') {
  const list = qs('transaction-mobile-list');
  const table = qs('transaction-table-body');
  const pageInfo = qs('tx-page-info');

  if (list) {
    list.innerHTML = '<div class="text-white/40 p-4">Loading...</div>';
  }

  try {
    const [deposits, withdrawals] = await Promise.all([
      window.apiFetch('/deposit'),
      window.apiFetch('/withdrawals')
    ]);

    const depRows = (Array.isArray(deposits) ? deposits : []).map(row => ({
      kind: 'deposit',
      amount_cents: Number(row.amount_cents || 0),
      status: row.status || 'PENDING',
      created_at: row.created_at
    }));

    const wdRows = (Array.isArray(withdrawals) ? withdrawals : []).map(row => ({
      kind: 'withdrawal',
      amount_cents: Number(row.amount_cents || 0),
      status: row.status || 'PENDING',
      created_at: row.created_at
    }));

    let items = [...depRows, ...wdRows];

    items.sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    if (filter !== 'all') {
      items = items.filter(tx => tx.kind === filter);
    }

    function badge(status) {
      const raw = String(status || '').toUpperCase();

      if (
        raw.includes('COMPLETED') ||
        raw.includes('APPROVED') ||
        raw.includes('SUCCESS')
      ) {
        return {
          label: 'Completed',
          cls: 'bg-emerald-500/15 text-emerald-400'
        };
      }

      if (
        raw.includes('CANCEL') ||
        raw.includes('REJECT')
      ) {
        return {
          label: 'Cancelled',
          cls: 'bg-red-500/15 text-red-400'
        };
      }

      if (raw.includes('EXPIRED')) {
        return {
          label: 'Expired',
          cls: 'bg-gray-500/15 text-gray-300'
        };
      }

      return {
        label: 'Processing',
        cls: 'bg-yellow-500/15 text-yellow-300'
      };
    }

    /* MOBILE */
    if (list) {
      if (!items.length) {
        list.innerHTML =
          '<div class="text-white/40 p-4">No transactions yet</div>';
      } else {
        list.innerHTML = items.map(tx => {
          const b = badge(tx.status);

          return `
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="flex justify-between items-start gap-3 mb-4">

                <div>
                  <div class="text-white text-sm font-semibold capitalize">
                    ${tx.kind}
                  </div>

                  <div class="text-white/40 text-xs">
                    ${new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div class="text-xs px-3 py-1 rounded-full whitespace-nowrap ${b.cls}">
                  ${b.label}
                </div>

              </div>

              <div class="text-right text-lg font-semibold text-white">
                ${tx.kind === 'withdrawal' ? '-' : '+'}${fmtUSD(tx.amount_cents)}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    /* DESKTOP */
    if (table) {
      table.innerHTML = items.map(tx => {
        const b = badge(tx.status);

        return `
          <tr class="border-b border-white/5">
            <td class="py-3 text-white capitalize">
              ${tx.kind}
            </td>

            <td class="py-3 text-right text-white">
              ${tx.kind === 'withdrawal' ? '-' : '+'}${fmtUSD(tx.amount_cents)}
            </td>

            <td class="py-3 text-right">
              <span class="text-xs px-3 py-1 rounded-full ${b.cls}">
                ${b.label}
              </span>
            </td>

            <td class="py-3 text-right text-white/50">
              ${new Date(tx.created_at).toLocaleDateString()}
            </td>
          </tr>
        `;
      }).join('');
    }

    if (pageInfo) {
      pageInfo.textContent = `${items.length} Transactions`;
    }

  } catch (err) {
    console.error(err);

    if (list) {
      list.innerHTML =
        '<div class="text-red-400 p-4">Failed to load transactions</div>';
    }
  }
}




  /* ===========================
     INIT
  =========================== */
document.addEventListener('DOMContentLoaded', async () => {




initModals();
initDepositTabs();
initWithdrawTabs();
initTransactionTabs();

  qs('demo-reset')?.addEventListener('click', resetDemoBalance);
document.addEventListener('accountMode:changed', () => {
  renderDashboard();
});


  await window.loadWallets?.();
  await loadUser();

  // ensure correct card is shown on initial load
document.dispatchEvent(new Event('accountMode:changed'));

});

})();