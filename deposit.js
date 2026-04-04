// deposit.js — cleaned & fixed

(() => {
  'use strict';

const API = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';
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
  let rate = 0;

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

  async function loadRate() {
    try {
      const res = await secureFetch('/rates');
      rate = res.rate || 0;
    } catch {
      rate = 0;
    }
  }

  /* ===========================
     NGN PREVIEW
  =========================== */

  amountInput?.addEventListener('input', () => {
    const amount = Number(amountInput.value);
    const preview = document.getElementById('naira-preview');

    if (!amount || !rate) {
      if (preview) preview.innerText = '';
      return;
    }

    const naira = amount * rate;
    preview.innerText = `≈ ₦${naira.toLocaleString()}`;
  });

  /* ===========================
     SESSION CONTROL
  =========================== */

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
  }

  async function terminateSession() {
    if (!activeDeposit) return resetToIdle();

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
     CREATE DEPOSIT
  =========================== */

  continueBtn?.addEventListener('click', async () => {
    if (activeDeposit) return;

    const amount = Number(amountInput.value);

    if (!amount || amount < 50) {
      alert('Minimum deposit is $50');
      return;
    }

    if (selectedMethod === 'P2P') {
      dynamicBox.innerHTML = `<div class="text-white/60">P2P not available</div>`;
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
     BANK DETAILS UI
  =========================== */

  function renderBankDetails(deposit) {
    dynamicBox.innerHTML = `
      <div class="space-y-4 text-sm">

        ${copyRow('Reference', deposit.reference)}
        ${copyRow('Bank', 'Providus Bank')}
        ${copyRow('Account Number', '1308556778')}
        ${copyRow('USD', fmtUSD(deposit.amount_exact_cents))}
        ${copyRow('NGN',
          '₦' + ((deposit.amount_exact_cents / 100) * rate).toLocaleString()
        )}

        <div>
          <div class="text-white/60">Time Remaining</div>
          <div id="deposit-timer"></div>
        </div>

        <button id="confirm-payment" class="gv-primary-btn">
          Confirm Payment
        </button>

        <button id="cancel-payment" class="cancel-card">
          Cancel
        </button>

      </div>
    `;

    startCountdown(deposit.expires_at);

    document.getElementById('confirm-payment')
      .addEventListener('click', markPaid);

    document.getElementById('cancel-payment')
      .addEventListener('click', terminateSession);
  }

  function copyRow(label, value) {
    return `
      <div class="flex justify-between">
        <div>
          <div class="text-white/60">${label}</div>
          <div>${value}</div>
        </div>
      </div>
    `;
  }

  function startCountdown(expiresAt) {
    const el = document.getElementById('deposit-timer');

    countdownInterval = setInterval(() => {
      const diff = new Date(expiresAt) - new Date();

      if (diff <= 0) return terminateSession();

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }

  async function markPaid() {
    await secureFetch(`/deposit/${activeDeposit.id}/mark-paid`, {
      method: 'POST'
    });

    renderProcessing();
  }

  function renderProcessing() {
    dynamicBox.innerHTML = `
      <div class="text-center">
        <h2>Processing...</h2>
      </div>
    `;

    startPolling();
  }

  function startPolling() {
    pollInterval = setInterval(async () => {
      const deposits = await secureFetch('/deposit');
      const updated = deposits.find(d => d.id === activeDeposit.id);

      if (updated?.status === 'SUCCESS') {
        clearTimers();
        renderSuccess();
      }
    }, 8000);
  }

  function renderSuccess() {
    dynamicBox.innerHTML = `<div class="text-green-400">Deposit Confirmed</div>`;

    setTimeout(() => {
      resetToIdle();
      modal.classList.add('hidden');
    }, 3000);
  }

  /* ===========================
     INIT
  =========================== */

  loadRate();

})();