// deposit.js — stable + fixed events

(() => {
  'use strict';

  const API = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';
  const token = () => localStorage.getItem('token');

  const modal = document.getElementById('modal-deposit');
  const modalBody = document.querySelector('.gv-modal-body');
  const amountInput = document.getElementById('deposit-amount');
  const continueBtn = document.getElementById('btn-submit-deposit');

  let activeDeposit = null;
  let pollInterval = null;
  let countdownInterval = null;
  let rate = 0;

  /* ================= UTIL ================= */

async function secureFetch(url, options = {}) {
  const t = token();

  console.log('TOKEN USED:', t);

  const res = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: t ? `Bearer ${t}` : ''
    }
  });

  return res;
}

  function fmtUSD(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
  }

  async function loadRate() {
    try {
      const res = await secureFetch('/rates');
      rate = Number(res.rate) || 0;
    } catch {
      rate = 0;
    }
  }

  /* ================= VALIDATION ================= */

  function getInputs() {
    const first = document.getElementById('sender-first-name')?.value.trim();
    const last = document.getElementById('sender-last-name')?.value.trim();
    const number = document.getElementById('sender-account-number')?.value.trim();
    const bank = document.getElementById('sender-bank-name')?.value.trim();

    if (!/^[A-Za-z]{2,}$/.test(first)) return alert('Invalid first name'), null;
    if (!/^[A-Za-z]{2,}$/.test(last)) return alert('Invalid last name'), null;
    if (!/^\d{10}$/.test(number)) return alert('Account must be 10 digits'), null;
    if (!bank || bank.length < 2) return alert('Invalid bank'), null;

    const ok = confirm(
      `IMPORTANT:\n\nSend ONLY from this account.\nName must match.\n\nContinue?`
    );

    if (!ok) return null;

    return {
      sender_account_name: `${first} ${last}`,
      sender_account_number: number,
      sender_bank_name: bank
    };
  }

  /* ================= CREATE ================= */

  continueBtn?.addEventListener('click', async () => {
    if (activeDeposit) return;

    const amount = Number(amountInput.value);
    if (!amount || amount < 50) return alert('Minimum $50');

    const inputs = getInputs();
    if (!inputs) return;

    try {
      const deposit = await secureFetch('/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount_cents: Math.round(amount * 100),
          ...inputs
        })
      });

      activeDeposit = deposit;
      renderDeposit(deposit);

    } catch (err) {
      alert(err.message);
    }
  });

  /* ================= COPY ================= */

  function copyable(label, value) {
    return `
      <div class="flex justify-between items-center">
        <div>
          <div class="text-white/50 text-xs">${label}</div>
          <div class="font-medium">${value}</div>
        </div>
        <button class="copy-btn text-white/60 text-lg" data-copy="${value}">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>
    `;
  }

  /* ================= RENDER ================= */

  function renderDeposit(d) {
    const usd = fmtUSD(d.amount_cents);
    const ngn = Number(d.amount || 0);

    const first = document.getElementById('sender-first-name').value;
    const last = document.getElementById('sender-last-name').value;
    const number = document.getElementById('sender-account-number').value;
    const bank = document.getElementById('sender-bank-name').value;

    modalBody.innerHTML = `
      <div class="bg-white/5 p-4 rounded-xl space-y-2">
        <div class="text-xs text-white/50">Your Details</div>
        <div class="font-medium">${first} ${last}</div>
        <div class="text-white/70">${bank} • ${number}</div>
      </div>

      <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-xs space-y-1">
        <div>⚠ Send ONLY from your account</div>
        <div>⚠ Copy reference before payment</div>
        <div>⚠ Name mismatch = refund</div>
      </div>

      <div class="bg-white/5 p-4 rounded-xl space-y-4">
        ${copyable('Reference', d.reference)}
        ${copyable('Bank', 'Providus Bank')}
        ${copyable('Account Number', '1308556778')}
        ${copyable('Amount (NGN)', '₦' + ngn.toLocaleString())}
        <div class="text-xs text-white/50">USD: ${usd}</div>
        <div id="timer"></div>
      </div>

      <button id="confirm" class="gv-primary-btn">Confirm Payment</button>
      <button id="cancel" class="cancel-card">Cancel</button>
    `;

    startTimer(d.expires_at);
  }

  /* ================= EVENTS (CRITICAL FIX) ================= */

  modalBody.addEventListener('click', async (e) => {

    // CONFIRM
    if (e.target.closest('#confirm')) {
      if (!activeDeposit?.id) return alert('Invalid session');

      try {
        await secureFetch(`/deposit/${activeDeposit.id}/mark-paid`, {
          method: 'POST'
        });

        modalBody.innerHTML = `<h3>Waiting for approval...</h3>`;
        startPolling();

      } catch {
        alert('Failed to confirm payment');
      }
    }

    // CANCEL
    if (e.target.closest('#cancel')) {
      clearInterval(pollInterval);
      clearInterval(countdownInterval);
      activeDeposit = null;

      modal.classList.add('hidden');
    }

    // COPY
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      const text = copyBtn.dataset.copy;

      navigator.clipboard.writeText(text);

      copyBtn.innerHTML = `<i class="fa-solid fa-check"></i>`;
      copyBtn.classList.add('text-green-400');

      setTimeout(() => {
        copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
        copyBtn.classList.remove('text-green-400');
      }, 1500);
    }

  });

  /* ================= TIMER ================= */

  function startTimer(exp) {
    const el = document.getElementById('timer');

    countdownInterval = setInterval(() => {
      const diff = new Date(exp) - new Date();
      if (diff <= 0) return;

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (el) el.textContent = `${m}:${s}`;
    }, 1000);
  }

  /* ================= POLLING ================= */

  function startPolling() {
    pollInterval = setInterval(async () => {
      const list = await secureFetch('/deposit');
      const d = list.find(x => x.id === activeDeposit.id);

      if (d?.status === 'SUCCESS') {
        clearInterval(pollInterval);
        modalBody.innerHTML = `<div class="text-green-400">Confirmed</div>`;
      }
    }, 8000);
  }

  loadRate();

})();