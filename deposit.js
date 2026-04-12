(() => {
  'use strict';

  function toTitleCase(str) {
    return str
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  const API = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';
  const token = () => localStorage.getItem('token');

  let modal, dynamicBox, formBox, amountInput, continueBtn;
  let activeDeposit = null;
  let pollInterval = null;
  let countdownInterval = null;
  let selectedMethod = 'BANK';

  /* ===========================
     INIT
  =========================== */

  window.addEventListener('load', init);

  function init() {
    modal = document.getElementById('modal-deposit');
    dynamicBox = document.getElementById('deposit-dynamic');
    formBox = document.getElementById('deposit-form');
    amountInput = document.getElementById('deposit-amount');
    continueBtn = document.getElementById('btn-submit-deposit');

    if (!continueBtn) {
      console.error('Deposit button not found');
      return;
    }

    continueBtn.addEventListener('click', handleContinue);

    document.querySelectorAll('[data-dep]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('[data-dep]').forEach(b => {
          b.classList.remove('active');
        });

        btn.classList.add('active');

        const type = btn.dataset.dep;

        if (type === 'direct') selectedMethod = 'BANK';
        if (type === 'crypto') selectedMethod = 'CRYPTO';
        if (type === 'p2p') selectedMethod = 'P2P';

        updateMethodUI();
      };
    });
  }

  /* ===========================
     API
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
      alert('Session expired. Login again.');
      localStorage.removeItem('token');
      location.reload();
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Request failed');
    }

    return res.json();
  }

  /* ===========================
     METHOD UI
  =========================== */

  function updateMethodUI() {
  if (!formBox) return;

  clearIntervals();
  dynamicBox.innerHTML = '';
  activeDeposit = null;

  /* ---------------------------
     BANK
  --------------------------- */
  if (selectedMethod === 'BANK') {
    formBox.style.display = 'block';

    const bankFields = formBox.querySelectorAll(
      '#sender-first-name, #sender-last-name, #sender-account-number, #sender-bank-name'
    );

    bankFields.forEach(el => {
      const wrap = el.closest('div');
      if (wrap) wrap.style.display = '';
    });

    return;
  }

  /* ---------------------------
     CRYPTO
  --------------------------- */
  if (selectedMethod === 'CRYPTO') {
    formBox.style.display = 'block';

    const bankFields = formBox.querySelectorAll(
      '#sender-first-name, #sender-last-name, #sender-account-number, #sender-bank-name'
    );

    bankFields.forEach(el => {
      const wrap = el.closest('div');
      if (wrap) wrap.style.display = 'none';
    });

    dynamicBox.innerHTML = `
      <div class="bg-white/5 rounded-2xl p-5 space-y-4">

        <div class="text-sm text-white/80 leading-relaxed">
          Deposit with <span class="text-cyan-400 font-semibold">USDT (TRC20)</span>.
          Use only the TRON network.
        </div>

        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-300 leading-relaxed">
          We only accept USDT TRC20 on the TRON network.
          Sending through any other network may result in permanent loss of funds.
        </div>

        <div class="text-xs text-white/50">
          Enter amount above, then click Continue to generate your wallet address and QR code.
        </div>

      </div>
    `;

    return;
  }

  /* ---------------------------
     P2P
  --------------------------- */
  if (selectedMethod === 'P2P') {
    formBox.style.display = 'block';

    const bankFields = formBox.querySelectorAll(
      '#sender-first-name, #sender-last-name, #sender-account-number, #sender-bank-name'
    );

    bankFields.forEach(el => {
      const wrap = el.closest('div');
      if (wrap) wrap.style.display = 'none';
    });

    dynamicBox.innerHTML = `
      <div class="bg-white/5 rounded-2xl p-5 space-y-4">

        <div class="text-sm text-white/80">
          Deposit through verified peer-to-peer sellers.
        </div>

        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-300">
          Only pay the seller assigned to your order.
        </div>

        <div class="text-xs text-white/50">
          Enter amount above, then click Continue to get matched.
        </div>

      </div>
    `;
  }
}

  /* ===========================
     CONTINUE
  =========================== */

  async function handleContinue() {
  try {
    if (selectedMethod === 'BANK') {
      return await handleBankDeposit();
    }

    if (selectedMethod === 'CRYPTO') {
      return renderCryptoWalletState();
    }

    if (selectedMethod === 'P2P') {
      return renderP2PMatchState();
    }

  } catch (err) {
    console.error(err);
    alert(err.message || 'Something went wrong');
  }
}


function renderCryptoWalletState() {
  formBox.style.display = 'none';

  dynamicBox.innerHTML = `
    <div class="space-y-4 pb-1">

      <div class="bg-white/5 rounded-2xl p-5 space-y-3">
        <div class="text-lg font-semibold">Crypto Deposit</div>

        <div class="text-sm text-white/70">
          Send only <span class="text-cyan-400 font-semibold">USDT (TRC20)</span>
          to the wallet below.
        </div>
      </div>

      <div class="bg-white/5 rounded-2xl p-5 space-y-4">

        <div>
          <div class="text-xs text-white/50 mb-1">Wallet Address</div>
          <div class="font-mono break-all text-cyan-300">
            TYx9r...dF82
          </div>
        </div>

        <button class="gv-primary-btn copy-btn" data-copy="TYx9r...dF82">
          Copy Address
        </button>

        <div class="bg-white rounded-xl p-3 flex justify-center">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=TYx9r...dF82"
            class="w-44 h-44 rounded-lg"
          >
        </div>

        <div class="text-sm leading-relaxed text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          Wrong network may lead to permanent loss of funds.
        </div>
      </div>

      <div class="space-y-3 mt-2">
        <button id="confirm-btn" class="gv-primary-btn">
          Mark as Paid
        </button>

        <button id="cancel-btn" class="cancel-card">
          Cancel
        </button>
      </div>

    </div>
  `;

  attachCopyHandlers();

  document.getElementById('confirm-btn').onclick = () => {
    alert('Payment submitted. Awaiting blockchain confirmation.');
  };

  document.getElementById('cancel-btn').onclick = resetDepositUI;
}

function renderP2PMatchState() {
  formBox.style.display = 'none';

  dynamicBox.innerHTML = `
    <div class="space-y-4 pb-1">

      <div class="bg-white/5 rounded-2xl p-4 space-y-2">
        <div class="text-lg font-semibold">P2P Deposit</div>
        <div class="text-sm text-white/70">
          You’ve been matched with a verified seller.
        </div>
      </div>

      <div class="bg-white/5 rounded-2xl p-5 space-y-3">
        <div>
          <div class="text-xs text-white/50">Seller</div>
          <div class="font-medium">Rave Trader 01</div>
        </div>

        <div>
          <div class="text-xs text-white/50">Bank</div>
          <div class="font-medium">Opay</div>
        </div>

        <div>
          <div class="text-xs text-white/50">Account Number</div>
          <div class="font-medium">8123456789</div>
        </div>

        <div>
          <div class="text-xs text-white/50">Name</div>
          <div class="font-medium">David Johnson</div>
        </div>
      </div>

      <div class="text-sm leading-relaxed text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        Pay only to the assigned seller.
      </div>

      <div class="space-y-3 mt-2">
        <button class="gv-primary-btn">
          I Have Paid
        </button>

        <button id="cancel-btn" class="cancel-card">
          Cancel
        </button>
      </div>

    </div>
  `;

  document.getElementById('cancel-btn').onclick = resetDepositUI;
}




  /* ===========================
     CRYPTO FLOW
  =========================== */

  async function handleCrypto() {
    try {
      const amount = Number(amountInput.value);

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

      activeDeposit = deposit;
      renderCrypto(deposit);

    } catch (err) {
      console.error(err);
      alert(err.message || 'Crypto deposit failed');
    }
  }

 /* ===========================
   CRYPTO UI
=========================== */

  function renderCrypto(d) {
    if (formBox) formBox.style.display = 'none';

    const wallet = 'TXYZ1234567890ABCDEF1234567890';

    dynamicBox.innerHTML = `
      <div class="space-y-4 pb-1 max-h-[70vh] overflow-y-auto pr-1">

        <div class="bg-white/5 p-4 rounded-2xl space-y-4 text-center">

          <div>
            <div class="text-xs text-white/40">Amount</div>
            <div class="text-xl font-semibold">${formatUSD(d.amount_cents)}</div>
          </div>

          <div>
            <div class="text-xs text-white/40 mb-2">Wallet Address</div>

            <div class="bg-black/40 rounded-xl p-3 flex gap-3 items-center justify-between">
              <div class="text-xs break-all text-left flex-1">${wallet}</div>

              <button class="copy-btn text-white/50" data-copy="${wallet}">
                <i class="fa-regular fa-copy"></i>
              </button>
            </div>
          </div>

          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${wallet}"
            class="mx-auto rounded-xl bg-white p-2"
            alt="QR"
          />

          <div class="text-xs text-white/50">Network: TRC20</div>
        </div>

        <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-xs">
          ⚠ Wrong network may result in permanent loss of funds
        </div>

        <div class="space-y-3 mt-2">
          <button id="confirm-btn" class="gv-primary-btn w-full">
            I Have Sent Crypto
          </button>

          <button id="cancel-btn" class="cancel-card w-full">
            Cancel
          </button>
        </div>

      </div>
    `;

    attachCopyHandlers();
    document.getElementById('confirm-btn').onclick = confirmPayment;
    document.getElementById('cancel-btn').onclick = cancelDeposit;
  }

  /* ===========================
     P2P FLOW
  =========================== */

  async function handleP2P() {
    try {
      const amount = Number(amountInput.value);

      if (!amount || amount < 50) {
        return alert('Minimum deposit is $50');
      }

      const deposit = await secureFetch('/deposit', {
        method: 'POST',
        body: JSON.stringify({
          amount_cents: Math.round(amount * 100),
          method: 'P2P'
        })
      });

      activeDeposit = deposit;
      renderP2P(deposit);

    } catch (err) {
      console.error(err);
      alert(err.message || 'P2P deposit failed');
    }
  }

  /* ===========================
    P2P UI
  =========================== */

  function renderP2P(d) {
    if (formBox) formBox.style.display = 'none';

    dynamicBox.innerHTML = `
      <div class="space-y-4 pb-1 max-h-[70vh] overflow-y-auto pr-1">

        <div class="bg-white/5 p-4 rounded-2xl space-y-2">
          <div class="text-xs text-white/40">Order Amount</div>
          <div class="text-xl font-semibold">${formatUSD(d.amount_cents)}</div>
        </div>

        <div class="bg-white/5 p-4 rounded-2xl space-y-3">
          <div class="text-sm font-medium">Matched Seller</div>

          ${row('Name', 'John Trader')}
          ${row('Bank', 'Access Bank')}
          ${row('Account Number', '0123456789')}
        </div>

        <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-xs">
          ⚠ Pay only to this seller. Wrong payment is not recoverable.
        </div>

        <div class="space-y-3 mt-2">
          <button id="confirm-btn" class="gv-primary-btn w-full">
            I Have Paid Seller
          </button>

          <button id="cancel-btn" class="cancel-card w-full">
            Cancel
          </button>
        </div>

      </div>
    `;

    attachCopyHandlers();
    document.getElementById('confirm-btn').onclick = confirmPayment;
    document.getElementById('cancel-btn').onclick = cancelDeposit;
  }

  /* ===========================
     BANK LOCKED UI
  =========================== */

  function renderLockedState(d) {
    if (formBox) formBox.style.display = 'none';

    dynamicBox.innerHTML = `
      <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

        <div class="bg-white/5 p-4 rounded-2xl">
          <div class="text-xs text-white/40">Your Details</div>
          <div class="text-base font-semibold">${d.user.name}</div>
          <div class="text-sm text-white/60">${d.user.bank} • ${d.user.number}</div>
        </div>

        <div class="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-sm space-y-1">
          <div>⚠ Send ONLY from your account</div>
          <div>⚠ Copy reference before payment</div>
          <div>⚠ Name mismatch = refund</div>
        </div>

        <div class="bg-white/5 p-4 rounded-2xl space-y-4">
          ${row('Reference', d.reference)}
          ${row('Bank', 'Providus Bank')}
          ${row('Account Number', '1308556778')}
          ${row('Amount (NGN)', formatNGN(d.amount))}
          <div class="text-sm text-white/50">
            USD: ${formatUSD(d.amount_cents)}
          </div>
          <div id="timer" class="text-xs text-white/40"></div>
        </div>

        <div class="space-y-3 mt-2">
          <button id="confirm-btn" class="gv-primary-btn w-full">
            Confirm Payment
          </button>

          <button id="cancel-btn" class="cancel-card w-full">
            Cancel
          </button>
        </div>

      </div>
    `;

    attachCopyHandlers();
    startTimer(d.expires_at);

    document.getElementById('confirm-btn').onclick = confirmPayment;
    document.getElementById('cancel-btn').onclick = cancelDeposit;
  }

  /* ===========================
     ROW + COPY
  =========================== */

  function row(label, value) {
    return `
      <div class="flex justify-between items-center gap-3">
        <div>
          <div class="text-xs text-white/40">${label}</div>
          <div class="font-medium">${value || '—'}</div>
        </div>

        <button class="copy-btn text-white/50" data-copy="${value}">
          <i class="fa-regular fa-copy"></i>
        </button>
      </div>
    `;
  }

  function attachCopyHandlers() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = async () => {
        try {
          const val = btn.getAttribute('data-copy');
          await navigator.clipboard.writeText(val);

          btn.classList.add('text-green-400', 'scale-110');

          setTimeout(() => {
            btn.classList.remove('text-green-400', 'scale-110');
          }, 1000);

        } catch {
          alert('Copy failed');
        }
      };
    });
  }

  /* ===========================
     TIMER
  =========================== */

  function startTimer(expiry) {
    clearInterval(countdownInterval);

    const el = document.getElementById('timer');

    countdownInterval = setInterval(() => {
      const diff = new Date(expiry) - new Date();

      if (diff <= 0) {
        clearInterval(countdownInterval);
        if (el) el.textContent = 'Expired';
        return;
      }

      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (el) {
        el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  function clearIntervals() {
    clearInterval(countdownInterval);
    clearInterval(pollInterval);
  }

  /* ===========================
     ACTIONS
  =========================== */

  async function confirmPayment() {
    if (!activeDeposit) return;

    try {
      await secureFetch(`/deposit/${activeDeposit.id}/mark-paid`, {
        method: 'POST'
      });

      renderSuccess();

    } catch (err) {
      console.error(err);
      alert('Failed to confirm payment');
    }
  }

  async function cancelDeposit() {
    if (!activeDeposit) return;

    try {
      await secureFetch(`/deposit/${activeDeposit.id}/cancel`, {
        method: 'POST'
      });

      location.reload();

    } catch (err) {
      console.error(err);
      alert('Cancel failed');
    }
  }

  /* ===========================
     SUCCESS
  =========================== */

  function renderSuccess() {
    clearIntervals();

    dynamicBox.innerHTML = `
      <div class="text-center py-8 space-y-4">

        <div class="text-green-400 text-lg font-semibold">
          Payment Submitted
        </div>

        <div class="text-sm text-white/50">
          Awaiting admin confirmation (up to 24 hours)
        </div>

        <button id="close-deposit-modal" class="gv-primary-btn mt-3">
          Done
        </button>

      </div>
    `;

    document.getElementById('close-deposit-modal').onclick = () => {
      modal.classList.add('hidden');
      location.reload();
    };
  }

  /* ===========================
     FORMAT
  =========================== */

  function formatUSD(cents) {
    return `$${(Number(cents || 0) / 100).toFixed(2)}`;
  }

  function formatNGN(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
  }

})();


function resetDepositUI() {
  activeDeposit = null;
  dynamicBox.innerHTML = '';
  formBox.style.display = 'block';
  updateMethodUI();
}