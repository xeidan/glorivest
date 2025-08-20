// --- Tab Switching Function ---
function showTab(tab) {
    document.querySelectorAll('.tab-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.remove('hidden');
  }
  
  // --- Toggle Balance Visibility ---
  let isBalanceVisible = true;
  
  function toggleBalance() {
    isBalanceVisible = !isBalanceVisible;
  
    const totalEl = document.getElementById('total-balance');
    const availEl = document.getElementById('available-balance');
    const refEl = document.getElementById('referral-earnings');
    const percEl = document.getElementById('percentage-increase');
    const profitEl = document.getElementById('profit-increase');
    const eyeIcon = document.getElementById('real-balance-eye-icon');
  
    if (totalEl && availEl && refEl && percEl && profitEl) {
      totalEl.textContent = isBalanceVisible ? totalEl.dataset.value : '•••••••';
      availEl.textContent = isBalanceVisible ? availEl.dataset.value : '•••••••';
      refEl.textContent = isBalanceVisible ? refEl.dataset.value : '•••••••';
      percEl.innerHTML = isBalanceVisible ? `<i class="fa-solid fa-arrow-up"></i> ${percEl.dataset.value}` : '•••••••';
      profitEl.textContent = isBalanceVisible ? profitEl.dataset.value : '•••••••';
    }
  
    if (eyeIcon) {
      eyeIcon.className = isBalanceVisible
        ? 'fa-solid fa-eye text-white/70 text-lg'
        : 'fa-solid fa-eye-slash text-white/70 text-lg';
    }
  }
  
  // --- Load Balances + User Info ---
  async function loadBalances() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/account/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!res.ok) throw new Error("Failed to fetch user data");
  
      const user = await res.json();
  
      const balance = parseFloat(user.balance || 0);
      const earnings = parseFloat(user.reward_balance || 0);
      const percentage = ((earnings / (balance || 1)) * 100).toFixed(1);
      const glorivestId = user.glorivest_id || 'GV000000';
      const email = user.email || 'Unknown';
  
      // Format values
      const balanceStr = `$${balance.toFixed(2)}`;
      const earningsStr = `$${earnings.toFixed(2)}`;
      const percentageStr = `+${percentage}%`;
      const profitStr = `+$${earnings.toFixed(2)}`;
  
      // Inject into DOM
      const totalEl = document.getElementById('total-balance');
      const availEl = document.getElementById('available-balance');
      const refEl = document.getElementById('referral-earnings');
      const percEl = document.getElementById('percentage-increase');
      const profitEl = document.getElementById('profit-increase');
      const idEl = document.getElementById('glorivest-id');
      const emailEl = document.getElementById('user-email');
  
      if (totalEl) {
        totalEl.textContent = balanceStr;
        totalEl.dataset.value = balanceStr;
      }
  
      if (availEl) {
        availEl.textContent = balanceStr;
        availEl.dataset.value = balanceStr;
      }
  
      if (refEl) {
        refEl.textContent = earningsStr;
        refEl.dataset.value = earningsStr;
      }
  
      if (percEl) {
        percEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`;
        percEl.dataset.value = percentageStr;
      }
  
      if (profitEl) {
        profitEl.textContent = profitStr;
        profitEl.dataset.value = profitStr;
      }
  
      if (idEl) idEl.textContent = glorivestId;
      if (emailEl) emailEl.textContent = email;
  
    } catch (err) {
      console.error("Error loading balances:", err);
    }
  }


  // deposit.js (or inside your script.js)
(() => {
  const API_BASE = "https://glorivest-api-a16f75b6b330.herokuapp.com";
  const token = () => localStorage.getItem('token') || '';

  // === Elements
  const depTabFiat   = document.getElementById('dep-tab-fiat');
  const depTabCrypto = document.getElementById('dep-tab-crypto');
  const fiatPanel    = document.getElementById('fiat-panel');
  const cryptoPanel  = document.getElementById('crypto-panel');

  const amountEl   = document.getElementById('dep-amount');
  const currencyEl = document.getElementById('dep-currency');

  const btnFiat    = document.getElementById('btn-fiat-deposit');
  const fiatStatus = document.getElementById('fiat-status');

  const btnCreateCrypto = document.getElementById('btn-crypto-create');
  const cryptoStatus    = document.getElementById('crypto-status');
  const coinEl          = document.getElementById('dep-coin');
  const addrEl          = document.getElementById('crypto-address');
  const btnCopyAddr     = document.getElementById('btn-copy-address');
  const qrCanvas        = document.getElementById('qr-code');
  const cryptoAmountEl  = document.getElementById('crypto-amount');
  const cryptoAssetEl   = document.getElementById('crypto-asset');
  const hostedBtn       = document.getElementById('crypto-hosted-url');

  const wdBtn     = document.getElementById('btn-withdraw');
  const wdCoinEl  = document.getElementById('wd-coin');
  const wdAddrEl  = document.getElementById('wd-address');
  const wdAmtEl   = document.getElementById('wd-amount');
  const wdStatus  = document.getElementById('wd-status');

  // === Tab toggle
  function setMethod(m){
    const isFiat = m === 'fiat';
    fiatPanel.classList.toggle('hidden', !isFiat);
    cryptoPanel.classList.toggle('hidden', isFiat);
    depTabFiat.classList.toggle('bg-white/20', isFiat);
    depTabFiat.classList.toggle('bg-white/10', !isFiat);
    depTabCrypto.classList.toggle('bg-white/20', !isFiat);
    depTabCrypto.classList.toggle('bg-white/10', isFiat);
  }
  depTabFiat?.addEventListener('click', () => setMethod('fiat'));
  depTabCrypto?.addEventListener('click', () => setMethod('crypto'));

  // === Fiat deposit (Stripe)
  btnFiat?.addEventListener('click', async () => {
    const amt = Number(amountEl.value);
    if (!amt || amt < 20) return showMsg(fiatStatus, 'Enter at least $20', true);

    try {
      const res = await fetch(`${API_BASE}/payments/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ amount: amt, currency: currencyEl.value || 'usd' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Checkout failed');

      // Redirect to Stripe Checkout
      window.location.href = json.checkout_url;
    } catch (err) {
      showMsg(fiatStatus, err.message || 'Failed to start checkout', true);
    }
  });

  // === Crypto deposit (Coinbase Commerce)
  btnCreateCrypto?.addEventListener('click', async () => {
    const amt = Number(amountEl.value);
    if (!amt || amt < 20) return showMsg(cryptoStatus, 'Enter at least $20', true);

    // Reset UI
    hostedBtn.classList.add('hidden');
    addrEl.value = '';
    cryptoAmountEl.textContent = '—';
    cryptoAssetEl.textContent  = '—';
    clearQR(qrCanvas);

    try {
      const res = await fetch(`${API_BASE}/payments/coinbase/charge`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ amount: amt, currency: currencyEl.value || 'usd', asset: coinEl.value })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to create charge');

      // Fill UI
      hostedBtn.href = json.hosted_url;
      hostedBtn.classList.remove('hidden');
      addrEl.value = json.address || '';
      cryptoAmountEl.textContent = json.amount ? String(json.amount) : '—';
      cryptoAssetEl.textContent  = json.asset || coinEl.value || '—';

      // QR (either png data URL from backend or generate simple address QR)
      if (json.qr_png) {
        drawImageToCanvas(qrCanvas, json.qr_png);
      } else if (addrEl.value) {
        // fallback mini QR using a tiny library-less approach (simple text render)
        simpleTextQR(qrCanvas, addrEl.value);
      }

      showMsg(cryptoStatus, 'Charge created. Complete payment from the hosted page or with the address above.');
    } catch (err) {
      showMsg(cryptoStatus, err.message || 'Failed to create crypto charge', true);
    }
  });

  // Copy address
  btnCopyAddr?.addEventListener('click', async () => {
    if (!addrEl.value) return;
    try {
      await navigator.clipboard.writeText(addrEl.value);
      btnCopyAddr.textContent = 'Copied!';
      setTimeout(() => (btnCopyAddr.textContent = 'Copy'), 1200);
    } catch {}
  });

  // Withdraw
  wdBtn?.addEventListener('click', async () => {
    const amount = Number(wdAmtEl.value);
    const address = wdAddrEl.value.trim();
    const asset = wdCoinEl.value;
    if (!amount || amount < 20) return showMsg(wdStatus, 'Minimum withdrawal is $20', true);
    if (!address) return showMsg(wdStatus, 'Enter a valid wallet address', true);

    try {
      const res = await fetch(`${API_BASE}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ amount, asset, address })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Withdrawal failed');
      showMsg(wdStatus, json.message || 'Withdrawal submitted. You’ll be notified shortly.');
      wdAmtEl.value = '';
      wdAddrEl.value = '';
    } catch (err) {
      showMsg(wdStatus, err.message || 'Withdrawal failed', true);
    }
  });

  // Transactions (if you call this when tab opens)
  async function loadTransactions(){
    const tbody = document.getElementById('transaction-history');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" class="px-2 py-3 text-center text-white/60">Loading…</td></tr>`;
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch transactions');

      if (!Array.isArray(data) || data.length === 0){
        tbody.innerHTML = `<tr><td colspan="5" class="px-2 py-3 text-center text-white/60">No transactions yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = data.map(t => `
        <tr class="border-t border-white/10">
          <td class="px-2 py-2">${t.type || '-'}</td>
          <td class="px-2 py-2">$${Number(t.amount || 0).toFixed(2)}</td>
          <td class="px-2 py-2">${(t.currency || '').toUpperCase()}</td>
          <td class="px-2 py-2">${t.status || '-'}</td>
          <td class="px-2 py-2">${t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-2 py-3 text-center text-rose-300">Error: ${err.message}</td></tr>`;
    }
  }

  // If you want: auto-load when Transactions tab becomes visible
  const txTab = document.getElementById('tab-transactions');
  if (txTab){
    const obs = new MutationObserver(() => {
      if (!txTab.classList.contains('hidden')) loadTransactions();
    });
    obs.observe(txTab, { attributes: true, attributeFilter: ['class'] });
  }

  // Helpers
  function showMsg(el, text, isError=false){
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.toggle('text-rose-300', !!isError);
    el.classList.toggle('text-white/50', !isError);
  }
  function clearQR(canvas){
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  function drawImageToCanvas(canvas, dataUrl){
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0,0,canvas.width,canvas.height);
      // fit contain
      const scale = Math.min(canvas.width/img.width, canvas.height/img.height);
      const w = img.width * scale, h = img.height * scale;
      const x = (canvas.width - w)/2, y = (canvas.height - h)/2;
      ctx.drawImage(img, x, y, w, h);
    };
    img.src = dataUrl;
  }
  // very simple fallback “QR-like” block (not a real QR — use only if backend doesn’t send qr_png)
  function simpleTextQR(canvas, text){
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b2f29';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#00D2B1';
    ctx.font = '10px monospace';
    wrapText(ctx, text, 6, 16, canvas.width - 12, 12);
  }
  function wrapText(ctx, text, x, y, maxW, lineH){
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxW && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineH;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // Default to fiat tab visible
  setMethod('fiat');
})();


/////////////////////////
async function startCryptoDeposit(amount, currency='USD'){
  const res = await fetch('/deposits/crypto/create', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify({ amount, currency, idempotency_key: crypto.randomUUID() })
  });
  const { hosted_url, deposit_id } = await res.json();
  window.open(hosted_url, '_blank');

  // poll status (simple)
  const poll = setInterval(async () => {
    const r = await fetch(`/deposits/${deposit_id}`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }});
    const d = await r.json();
    if (d.status === 'confirmed') {
      clearInterval(poll);
      alert('Crypto deposit confirmed!');
      document.dispatchEvent(new CustomEvent('balances:refresh'));
    }
  }, 5000);
}

  
  window.addEventListener("DOMContentLoaded", loadBalances);
  
