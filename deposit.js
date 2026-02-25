// deposit.js — final strict UX implementation

(() => {
  'use strict';

  const API = window.API_BASE || '';
  const token = () => localStorage.getItem('token');

  const modal = document.getElementById('modal-deposit');
  const dynamicBox = document.getElementById('deposit-dynamic');
  const amountInput = document.getElementById('deposit-amount');
  const continueBtn = document.getElementById('btn-submit-deposit');
  const segment = modal?.querySelector('.gv-segment');
  const headerTitle = modal?.querySelector('.gv-modal-header h2');
  const closeBtn = modal?.querySelector('[data-close="modal-deposit"]');

  let activeDeposit = null;
  let countdownInterval = null;
  let pollInterval = null;
  let selectedMethod = 'BANK';

  /* ===========================
     UTIL
  =========================== */

  async function secureFetch(url, options = {}) {
    const res = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token()}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }

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

  function clearTimers() {
    clearInterval(countdownInterval);
    clearInterval(pollInterval);
  }

  function setHeader(method) {
    headerTitle.textContent = method;
  }

  function injectBackButton() {
    const header = modal.querySelector('.gv-modal-header');
    if (header.querySelector('.back-btn')) return;

    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.innerHTML = '←';
    backBtn.style.background = 'transparent';
    backBtn.style.border = 'none';
    backBtn.style.color = 'white';
    backBtn.style.fontSize = '18px';
    backBtn.style.cursor = 'pointer';

    header.insertBefore(backBtn, header.firstChild);

    backBtn.addEventListener('click', terminateSession);
  }

  function removeBackButton() {
    const btn = modal.querySelector('.back-btn');
    if (btn) btn.remove();
  }

  function resetToIdle() {
    clearTimers();
    activeDeposit = null;
    dynamicBox.innerHTML = '';
    amountInput.disabled = false;
    amountInput.value = '';
    amountInput.parentElement.style.display = '';
    continueBtn.style.display = '';
    segment.style.display = 'flex';
    selectedMethod = 'BANK';
    setHeader('Deposit');

    removeBackButton();

    segment.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    segment.querySelector('[data-dep="direct"]')?.classList.add('active');
  }

  async function terminateSession() {
    if (!activeDeposit) {
      resetToIdle();
      return;
    }

    try {
      await secureFetch(`/deposit/${activeDeposit.id}/cancel`, {
        method: 'POST'
      });
    } catch {}

    resetToIdle();
  }

  function lockIntoSession(methodTitle) {
    segment.style.display = 'none';
    continueBtn.style.display = 'none';
    amountInput.parentElement.style.display = 'none';
    amountInput.disabled = true;
    setHeader(methodTitle);
    injectBackButton();
  }

  /* ===========================
     METHOD SELECTION
  =========================== */

  segment?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeDeposit) return;

      segment.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const depType = btn.getAttribute('data-dep');
      if (depType === 'direct') selectedMethod = 'BANK';
      if (depType === 'crypto') selectedMethod = 'CRYPTO';
      if (depType === 'p2p') selectedMethod = 'P2P';
    });
  });

  /* ===========================
     CONTINUE
  =========================== */

  continueBtn?.addEventListener('click', async () => {
    if (activeDeposit) return;

    const amount = Number(amountInput.value);
    if (!amount || amount < 50) {
      alert('Minimum deposit is $50');
      return;
    }

    if (selectedMethod === 'P2P') {
      dynamicBox.innerHTML = `
        <div class="text-center text-white/60">
          P2P not available yet
        </div>
      `;
      return;
    }

    try {
      const deposit = await secureFetch('/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount_cents: Math.round(amount * 100),
          method: selectedMethod
        })
      });

      activeDeposit = deposit;
      lockIntoSession(selectedMethod);
      renderBankDetails(deposit);

    } catch (err) {
      alert(err.message);
    }
  });

  /* ===========================
     BANK DETAILS
  =========================== */

  function renderBankDetails(deposit) {
    dynamicBox.innerHTML = `
      <div class="space-y-4 text-sm">

        ${copyRow('Reference', deposit.reference)}
        ${copyRow('Bank', 'Providus Bank')}
        ${copyRow('Account Number', '1308556778')}
        ${copyRow('Exact Amount', fmtUSD(deposit.amount_exact_cents))}

        <div>
          <div class="text-white/60">Time Remaining</div>
          <div id="deposit-timer" class="font-mono"></div>
        </div>

        <button id="confirm-payment" class="gv-primary-btn">
          Confirm Payment
        </button>

        <div class="cancel-card-wrapper" style="margin-top:10px;">
          <button id="cancel-payment" class="cancel-card">
            <div class="cancel-card-inner">
              <span class="cancel-icon">&times;</span>
              <span>Cancel Payment</span>
            </div>
          </button>
        </div>

      </div>
    `;

    bindCopyButtons();
    startCountdown(deposit.expires_at);

    document.getElementById('cancel-payment')
      .addEventListener('click', terminateSession);

    document.getElementById('confirm-payment')
      .addEventListener('click', markPaid);
  }

  function copyRow(label, value) {
    return `
      <div class="flex justify-between items-center">
        <div>
          <div class="text-white/60">${label}</div>
          <div class="font-mono">${value}</div>
        </div>
        <button class="copy-btn" data-copy="${value}">
          <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4
            a2 2 0 0 1 2-2h9
            a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    `;
  }

  function bindCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const text = btn.getAttribute('data-copy');
        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1000);
        } catch {}
      });
    });
  }

  function startCountdown(expiresAt) {
    const timerEl = document.getElementById('deposit-timer');

    countdownInterval = setInterval(() => {
      const diff = new Date(expiresAt) - new Date();

      if (diff <= 0) {
        terminateSession();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      timerEl.textContent =
        `${minutes}:${seconds.toString().padStart(2, '0')}`;

    }, 1000);
  }

  async function markPaid() {
    try {
      await secureFetch(`/deposit/${activeDeposit.id}/mark-paid`, {
        method: 'POST'
      });

      renderProcessing();

    } catch (err) {
      alert(err.message);
    }
  }

  function renderProcessing() {
    dynamicBox.innerHTML = `
      <div class="text-center space-y-4">

        <h2>Your transaction is in progress</h2>

        <p class="text-white/60 text-sm">
          Once the provider accepts it, you'll be able to track its status.
        </p>

        <button id="view-history" class="gv-primary-btn">
          View history
        </button>

        <button id="new-deposit"
          class="text-white/60 underline text-sm">
          New deposit
        </button>

      </div>
    `;

    document.getElementById('new-deposit')
      .addEventListener('click', terminateSession);

    document.getElementById('view-history')
      .addEventListener('click', () => {
        document.querySelector('[data-open="modal-transactions"]')?.click();
        modal.classList.add('hidden');
      });

    startPolling();
  }

  function startPolling() {
    pollInterval = setInterval(async () => {
      try {
        const deposits = await secureFetch('/deposit');
        const updated = deposits.find(d => d.id === activeDeposit.id);
        if (!updated) return;

        if (updated.status === 'SUCCESS') {
          clearTimers();
          renderSuccess();
        }
      } catch {}
    }, 8000);
  }

  function renderSuccess() {
    dynamicBox.innerHTML = `
      <div class="text-center text-green-400 font-semibold">
        Deposit Confirmed
      </div>
    `;

    setTimeout(() => {
      resetToIdle();
      modal.classList.add('hidden');
    }, 3000);
  }

  modal?.addEventListener('click', e => {
    if (!activeDeposit) return;
    if (e.target === modal) terminateSession();
  });

  closeBtn?.addEventListener('click', () => {
    if (activeDeposit) terminateSession();
  });

})();