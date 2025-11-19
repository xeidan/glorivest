// ===== Deposit / Withdraw / Transactions wiring =====
(() => {
    const API = window.API_BASE || '';
    const token = () => window.getToken && getToken();
  
    // ------- quick DOM helpers
    const $ = (id) => document.getElementById(id);
    const show = (el, on = true) => el && el.classList.toggle('hidden', !on);
    const setText = (el, v) => el && (el.textContent = v);
  
    // ------- get or create a default account; remember selected in localStorage
    async function getCurrentAccountId() {
      const saved = Number(localStorage.getItem('currentAccountId') || 0);
      try {
        const accounts = await apiFetch('/accounts', { method: 'GET' });
        if (Array.isArray(accounts) && accounts.length) {
          const found = accounts.find(a => a.id === saved) || accounts[0];
          localStorage.setItem('currentAccountId', String(found.id));
          return found.id;
        }
        const created = await apiFetch('/accounts', {
          method: 'POST',
          body: JSON.stringify({ tier: 'standard' })
        });
        localStorage.setItem('currentAccountId', String(created.id));
        return created.id;
      } catch (e) {
        console.warn('getCurrentAccountId:', e);
        return null;
      }
    }
  
    // ------- deposit tab: toggle fiat/crypto
    const depTabFiat   = $('dep-tab-fiat');
    const depTabCrypto = $('dep-tab-crypto');
    const fiatPanel    = $('fiat-panel');
    const cryptoPanel  = $('crypto-panel');
  
    function selectDepositMethod(method) {
      const isFiat = method === 'fiat';
      fiatPanel && cryptoPanel && (show(fiatPanel, true), show(cryptoPanel, false));
      if (!isFiat) { show(fiatPanel, false); show(cryptoPanel, true); }
  
      // subtle button styling
      depTabFiat?.classList.toggle('bg-white/20', isFiat);
      depTabFiat?.classList.toggle('bg-white/10', !isFiat);
      depTabCrypto?.classList.toggle('bg-white/20', !isFiat);
      depTabCrypto?.classList.toggle('bg-white/10', isFiat);
    }
    depTabFiat?.addEventListener('click', () => selectDepositMethod('fiat'));
    depTabCrypto?.addEventListener('click', () => selectDepositMethod('crypto'));
    // default view
    selectDepositMethod('fiat');
  
    // ------- shared deposit inputs
    const amountEl   = $('deposit-amount');
    const currencyEl = $('dep-currency');
  
    // ------- FIAT deposit (Kora hosted checkout)
    const fiatBtn    = $('deposit-fiat-btn');
    const fiatStatus = $('fiat-status');

    fiatBtn?.addEventListener('click', async () => {
      const amt = Number(amountEl?.value || 0);
      const cur = (currencyEl?.value || 'usd').toLowerCase();
      if (!amt || amt < 20) return showMessage(fiatStatus, 'Enter at least $20', true);
    
      try {
        const accountId = await getCurrentAccountId();
        const r = await apiFetch('/payments/kora/checkout', {
          method: 'POST',
          body: JSON.stringify({ amount: amt, currency: cur.toUpperCase(), account_id: accountId })
        });
    
        if (r?.checkout_url) {
          window.location.href = r.checkout_url; // redirect to Kora hosted checkout
          return;
        }
    
        // show provider/server message if present
        const msg =
          r?.message ||
          r?.body?.message ||
          'Could not start checkout';
        showMessage(fiatStatus, msg, true);
      } catch (e) {
        // also try to surface any structured message the fetch helper might attach
        const msg =
          e?.body?.message ||
          e?.message ||
          'Fiat checkout failed';
        showMessage(fiatStatus, msg, true);
      }
    });    


  
    // ------- CRYPTO deposit (USDT-TRC20 on TRON)
    const coinEl         = $('deposit-coin');
    const addrEl         = $('crypto-address');
    const copyAddrBtn    = $('btn-copy-address');
    const hostedBtn      = $('crypto-hosted-url');
    const qrCanvas       = $('qr-code');
    const cryptoAmtLabel = $('crypto-amount');
    const cryptoAssetLbl = $('crypto-asset');
    const cryptoBtn      = $('deposit-crypto-btn');
    const cryptoStatus   = $('crypto-status');
  
    cryptoBtn?.addEventListener('click', async () => {
      const amt = Number(amountEl?.value || 0);
      if (!amt || amt < 20) return showMessage(cryptoStatus, 'Enter at least $20', true);
  
      // Only USDT is supported by the backend right now.
      const asset = (coinEl?.value || 'USDT').toUpperCase();
      if (asset !== 'USDT') {
        showMessage(cryptoStatus, 'Currently only USDT (TRON / TRC20) is supported.', true);
        return;
      }
  
      // Resolve an account and create/return a TRON deposit address
      try {
        show(hostedBtn, false);
        addrEl && (addrEl.value = '');
        setText(cryptoAmtLabel, '—');
        setText(cryptoAssetLbl, '—');
        clearCanvas(qrCanvas);
  
        const accountId = await getCurrentAccountId();
        if (!accountId) throw new Error('No account');
  
        const w = await apiFetch(`/accounts/${accountId}/wallet/assign`, {
          method: 'POST',
          body: JSON.stringify({})
        });
  
        const address = w?.address || '';
        if (!address) throw new Error('Could not get deposit address');
  
        // Fill UI
        addrEl.value = address;
        setText(cryptoAmtLabel, String(amt));
        setText(cryptoAssetLbl, 'USDT (TRC20)');
        drawAddressHint(qrCanvas, address, amt); // simple visual hint
  
        // Optional: open hosted page if you later add one
        hostedBtn.href = '#';
        show(hostedBtn, false);
  
        showMessage(cryptoStatus, 'Address ready. Send only USDT-TRC20 to this address.');
      } catch (e) {
        showMessage(cryptoStatus, e.message || 'Failed to create deposit address', true);
      }
    });
  
    copyAddrBtn?.addEventListener('click', async () => {
      if (!addrEl?.value) return;
      try {
        await navigator.clipboard.writeText(addrEl.value);
        copyAddrBtn.textContent = 'Copied!';
        setTimeout(() => (copyAddrBtn.textContent = 'Copy'), 1200);
      } catch {}
    });
  
// ------- WITHDRAW
const wdBtn    = $('btn-withdraw');
const wdCoinEl = $('wd-coin');
const wdAddrEl = $('wd-address');
const wdAmtEl  = $('wd-amount');
const wdStatus = $('wd-status');

wdBtn?.addEventListener('click', async () => {
  const amt  = Number(wdAmtEl?.value || 0);
  const to   = (wdAddrEl?.value || '').trim();
  const coin = (wdCoinEl?.value || 'USDT').toUpperCase();

  if (!amt || amt < 20) return showMessage(wdStatus, 'Minimum withdrawal is $20', true);
  if (!to) return showMessage(wdStatus, 'Enter a valid recipient address', true);
  if (coin !== 'USDT') return showMessage(wdStatus, 'Currently only USDT on TRON (TRC20) is supported.', true);

  try {
    const resp = await apiFetch('/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: amt,
        address: to,
        account_id: await getCurrentAccountId()
      })
    });

    const fee = Number(resp.fee ?? (amt * 0.01)).toFixed(2);
    const net = Number(resp.net ?? (amt - amt * 0.01)).toFixed(2);

    showMessage(
      wdStatus,
      (resp.message || 'Withdrawal request submitted') +
      ` Fee $${fee}, net $${net}` + (resp.tx_hash ? ` • TX: ${resp.tx_hash}` : '')
    );

    // Refresh transactions + balances (safe if the global does not exist)
    await Promise.allSettled([
      loadTransactions(),
      (window.refreshAccountsBalanceUI ? window.refreshAccountsBalanceUI() : Promise.resolve())
    ]);

    // Clear inputs
    if (wdAmtEl)  wdAmtEl.value = '';
    if (wdAddrEl) wdAddrEl.value = '';
  } catch (e) {
    const msg = String(e?.message || '');
    if (/insufficient/i.test(msg)) return showMessage(wdStatus, 'Insufficient balance', true);
    if (/invalid.*tron|address/i.test(msg)) return showMessage(wdStatus, 'Invalid TRON address', true);
    showMessage(wdStatus, msg || 'Withdrawal failed', true);
  }
});



  
    // ------- TRANSACTIONS 
    const txBody = $('transaction-history');
  
    async function loadTransactions() {
      const tbody = document.getElementById('transaction-history'); // <tbody id="transaction-history">
      if (!tbody) return;
    
      tbody.innerHTML = `<tr><td colspan="5" class="px-2 py-3 text-center text-white/60">Loading…</td></tr>`;
    
      try {
        const accountId = await getCurrentAccountId();
        if (!accountId) throw new Error('No account');
    
        let rows = [];
        try {
          // Preferred (if you add it on the backend)
          rows = await apiFetch(`/accounts/${accountId}/transactions`, { method: 'GET' });
        } catch (err) {
          // Fallback if /transactions 404s: show deposits only
          if (String(err?.status || '') === '404') {
            const deps = await apiFetch(`/accounts/${accountId}/deposits`, { method: 'GET' });
            rows = Array.isArray(deps) ? deps.map(d => ({
              type: 'deposit',
              created_at: d.created_at,
              amount_cents: Number(d.amount_cents || 0),
              fee_cents: 0,
              net_cents: Number(d.amount_cents || 0),
              currency: (d.currency || 'USDT').toUpperCase(),
              status: d.status || 'confirmed'
            })) : [];
          } else {
            throw err;
          }
        }
    
        if (!Array.isArray(rows) || !rows.length) {
          tbody.innerHTML = `<tr><td colspan="5" class="px-2 py-3 text-center text-white/60">No transactions yet.</td></tr>`;
          return;
        }
    
        // newest first if not already sorted
        rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    
        tbody.innerHTML = rows.map(tx => {
          const type   = (tx.type || '').replace(/^\w/, c => c.toUpperCase());
          const amt    = (Number(tx.amount_cents || 0) / 100).toFixed(2);
          const net    = (Number(((tx.net_cents ?? tx.amount_cents) || 0)) / 100).toFixed(2);
          const when   = tx.created_at ? new Date(tx.created_at).toLocaleString() : '-';
          const status = tx.status || (tx.type === 'deposit' ? 'confirmed' : 'pending');
    
          // Use net as the displayed Amount
          return `
            <tr class="border-t border-white/10">
              <td class="px-2 py-2 w-1/4">${type}</td>
              <td class="px-2 py-2 w-1/4">$${net}</td>
              <td class="px-2 py-2 w-1/4">${status}</td>
              <td class="px-2 py-2 w-1/4">${when}</td>
            </tr>
          `;
        }).join('');
      } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-2 py-3 text-center text-rose-300">Error: ${e.message}</td></tr>`;
      }
    }
    
    
    
  
    // Auto-load when the Transactions tab becomes visible
    const txTab = $('tab-transactions');
    if (txTab) {
      const mo = new MutationObserver(() => {
        if (!txTab.classList.contains('hidden')) loadTransactions();
      });
      mo.observe(txTab, { attributes: true, attributeFilter: ['class'] });
    }
  
    // ------- little UI helpers
    function showMessage(el, text, isError = false) {
      if (!el) return;
      setText(el, text);
      show(el, true);
      el.classList.toggle('text-rose-300', !!isError);
      el.classList.toggle('text-white/50', !isError);
    }
    function clearCanvas(canvas) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // simple “QR-like” hint (no external libs); replace with a real QR later if you want
    function drawAddressHint(canvas, address, amount) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#0b2f29';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00D2B1';
      ctx.font = '10px monospace';
      wrapText(ctx, `USDT-TRC20\n${address}\nAMT:${amount}`, 6, 14, W - 12, 12);
    }
    function wrapText(ctx, text, x, y, maxW, lineH) {
      const lines = text.split('\n');
      for (const line of lines) {
        let cur = '', words = line.split(' ');
        for (let n = 0; n < words.length; n++) {
          const test = cur + words[n] + ' ';
          if (ctx.measureText(test).width > maxW && n > 0) {
            ctx.fillText(cur, x, y);
            cur = words[n] + ' ';
            y += lineH;
          } else {
            cur = test;
          }
        }
        ctx.fillText(cur, x, y);
        y += lineH;
      }
    }
  })();
  