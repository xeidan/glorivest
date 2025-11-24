// withdraw.js
// Handles withdrawals (crypto now, fiat placeholder).
// Depends on apiFetch, getCurrentAccountId, and showToast being available.

(() => {
  const $ = id => document.getElementById(id);
  const show = (el, yes = true) => el && el.classList.toggle('hidden', !yes);
  const setText = (el, txt) => el && (el.textContent = txt);
  const token = () => window.getToken && getToken();

  const wdBtn    = $('btn-withdraw');
  const wdCoinEl = $('wd-coin');
  const wdAddrEl = $('wd-address');
  const wdAmtEl  = $('wd-amount');
  const wdStatus = $('wd-status');

  // Helper for messages; fall back to global function if present
  function localToast(msg, ms = 3000) {
    if (typeof showToast === 'function') return showToast(msg, ms);
    console.log('WITHDRAW:', msg);
  }

  wdBtn?.addEventListener('click', async () => {
    const amt  = Number(wdAmtEl?.value || 0);
    const to   = (wdAddrEl?.value || '').trim();
    const coin = (wdCoinEl?.value || 'USDT').toUpperCase();

    if (!amt || amt < 20) { localToast('Minimum withdrawal is $20', 3000); return; }
    if (!to) { localToast('Enter a valid recipient address', 3000); return; }
    if (coin !== 'USDT') { localToast('Currently only USDT on TRON (TRC20) is supported.', 3000); return; }

    try {
      const accountId = await (typeof getCurrentAccountId === 'function' ? getCurrentAccountId() : Promise.resolve(localStorage.getItem('currentAccountId')));

      const resp = await apiFetch('/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          address: to,
          account_id: accountId
        })
      });

      const fee = Number(resp.fee ?? (amt * 0.01)).toFixed(2);
      const net = Number(resp.net ?? (amt - amt * 0.01)).toFixed(2);

      const msg = (resp.message || 'Withdrawal request submitted') + ` Fee $${fee}, net $${net}` + (resp.tx_hash ? ` • TX: ${resp.tx_hash}` : '');
      localToast(msg, 4000);

      // clear inputs
      if (wdAmtEl) wdAmtEl.value = '';
      if (wdAddrEl) wdAddrEl.value = '';

      // attempt to refresh transactions if available
      if (typeof window.loadTransactions === 'function') {
        try { window.loadTransactions(); } catch {}
      }
    } catch (e) {
      const msg = String(e?.message || '');
      if (/insufficient/i.test(msg)) return localToast('Insufficient balance', 3000);
      if (/invalid.*tron|address/i.test(msg)) return localToast('Invalid TRON address', 3000);
      localToast(msg || 'Withdrawal failed', 3000);
    }
  });

  // expose for debugging
  window.withdraw_submit = async () => wdBtn && wdBtn.click();

})();
