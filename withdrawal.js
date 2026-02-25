// withdrawal.js — aligned to real backend contract

(() => {
  'use strict';

  const API = window.API_BASE || '';
  const token = () => localStorage.getItem('token');

  const modal = document.getElementById('modal-withdraw');
  const amountInput = document.getElementById('withdraw-amount');
  const dynamicBox = document.getElementById('withdraw-dynamic');
  const submitBtn = document.getElementById('btn-submit-withdraw');
  const segment = modal?.querySelector('.gv-segment');
  const headerTitle = modal?.querySelector('.gv-modal-header h2');
  const closeBtn = modal?.querySelector('[data-close="modal-withdraw"]');

  let activeWithdrawal = null;
  let selectedMethod = 'BANK';
  let locked = false;

  /* ===========================
     FETCH WRAPPER
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

  function setHeader(title) {
    headerTitle.textContent = title;
  }

  function resetToIdle() {
    activeWithdrawal = null;
    locked = false;
    dynamicBox.innerHTML = '';
    amountInput.value = '';
    amountInput.disabled = false;
    amountInput.parentElement.style.display = '';
    submitBtn.style.display = '';
    segment.style.display = 'flex';
    setHeader('Withdraw Funds');

    segment.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    segment.querySelector('[data-wd="bank"]')?.classList.add('active');
    selectedMethod = 'BANK';
  }

  async function terminateSession() {
    if (!activeWithdrawal) {
      resetToIdle();
      return;
    }

    if (activeWithdrawal.status === 'PENDING') {
      try {
        await secureFetch(`/withdrawals/${activeWithdrawal.id}/cancel`, {
          method: 'POST'
        });
      } catch {}
    }

    resetToIdle();
  }

  /* ===========================
     METHOD SELECT
  =========================== */

  segment?.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (locked) return;

      segment.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const type = btn.getAttribute('data-wd');
      if (type === 'bank') selectedMethod = 'BANK';
      if (type === 'crypto') selectedMethod = 'CRYPTO';
    });
  });

  /* ===========================
     GET ACTIVE WALLET
  =========================== */

  async function getActiveWalletId() {
    const wallets = await secureFetch('/wallets');

    // detect account mode from UI
    const modeLabel = document.getElementById('account-mode-label')?.textContent?.trim();

    const isLive = modeLabel === 'LIVE';

    const wallet = wallets.find(w =>
      isLive ? w.type === 'REAL' : w.type === 'DEMO'
    );

    if (!wallet) throw new Error('Active wallet not found');

    return Number(wallet.id);
  }

  /* ===========================
     CREATE WITHDRAWAL
  =========================== */

  submitBtn?.addEventListener('click', async () => {
    if (locked) return;

    const amount = Number(amountInput.value);

    if (!amount || amount < 20) {
      alert('Minimum withdrawal is $20');
      return;
    }

    try {
      const walletId = await getActiveWalletId();

      const withdrawal = await secureFetch('/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          wallet_id: walletId,
          amount_usd: amount,
          destination: selectedMethod === 'BANK'
            ? 'Bank withdrawal'
            : 'Crypto withdrawal',
          method: selectedMethod
        })
      });

      activeWithdrawal = withdrawal;
      locked = true;

      segment.style.display = 'none';
      submitBtn.style.display = 'none';
      amountInput.parentElement.style.display = 'none';
      amountInput.disabled = true;

      renderPending(withdrawal);

    } catch (err) {
      alert(err.message);
    }
  });

  /* ===========================
     PENDING SCREEN
  =========================== */

function renderPending(withdrawal) {

  const usd = Number(withdrawal.amount_cents) / 100;

  dynamicBox.innerHTML = `
    <div class="space-y-4 text-sm">

      <div>
        <div class="text-white/60">Amount</div>
        <div class="font-mono">$${usd.toFixed(2)}</div>
      </div>

      <div>
        <div class="text-white/60">Status</div>
        <div class="text-yellow-400 font-semibold">
          Pending Approval
        </div>
      </div>

      <button id="cancel-withdrawal" class="cancel-card">
        <div class="cancel-card-inner">
          <span class="cancel-icon">&times;</span>
          <span>Cancel Withdrawal</span>
        </div>
      </button>

    </div>
  `;
}

  /* ===========================
     GLOBAL EXIT
  =========================== */

  modal?.addEventListener('click', e => {
    if (!activeWithdrawal) return;
    if (e.target === modal) terminateSession();
  });

  closeBtn?.addEventListener('click', () => {
    if (activeWithdrawal) terminateSession();
  });

})();