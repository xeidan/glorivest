// deposit.js — Hybrid SportyBet-like manual deposit flow
(() => {
  const API = window.API_BASE || '';
  const token = () => window.getToken && getToken();

  // fallback local file (developer-provided)
  const FALLBACK_UPLOAD_URL = '/mnt/data/Screenshot 2025-11-20 at 18.06.13.png';

  // DOM helpers
  const $ = id => document.getElementById(id);
  const show = (el, yes = true) => el && el.classList.toggle('hidden', !yes);
  const setText = (el, txt) => el && (el.textContent = txt);

  // nodes
  const depDirectBtn = $('dep-tab-direct');
  const depCryptoBtn = $('dep-tab-crypto');
  const depP2PBtn    = $('dep-tab-p2p');

  const step1 = $('step-1'), step2 = $('step-2'), step3 = $('step-3');
  const bankLoading = $('bank-loading'), bankDetails = $('bank-details');
  const bankRef = $('bank-ref'), bankName = $('bank-name'), bankAcctName = $('bank-acct-name'), bankAcctNum = $('bank-acct-num'), bankAmount = $('bank-amount');

  const node1 = $('node-1'), node2 = $('node-2'), node3 = $('node-3'), stepLabel = $('step-label'), progressBar = $('progress-bar');

  const step1Next = $('step1-next'), step1Cancel = $('step1-cancel');
  const step2Back = $('step2-back'), iveSent = $('ive-sent'), cancelPayment = $('cancel-payment');
  const step2Next = $('step2-next'), step3Back = $('step3-back'), submitDepositBtn = $('submit-deposit');

  const currencySelect = $('currency-select'), amountInput = $('step1-amount'), convPreview = $('conversion-preview');

  const fileInput = $('step3-file'), filePreviewWrap = $('file-preview-wrap'), filePreview = $('file-preview'), depositMsg = $('deposit-msg');

  const copyAcctBtn = $('copy-acct');
  const depositSpinner = $('deposit-spinner');

  const centerToast = $('center-toast'), centerToastText = $('center-toast-text');

  // transactions table id expected on page
  const txTbodyId = 'transaction-history';

  // rates and currency handling
  let rates = null;
  const defaultRates = { USD:1, NGN:1500, GBP:0, EUR:0 };

  async function fetchRates(){
    try {
      const r = await fetch(`${API}/rates`);
      if (!r.ok) throw new Error('no rates');
      const j = await r.json();
      rates = j?.rates || defaultRates;
    } catch (e) {
      rates = defaultRates;
    }
  }
  function getRateFor(c){ return (rates && rates[c]) || defaultRates[c] || 1; }
  function toUSD(amount, currency){ if (!amount) return 0; const rate = getRateFor(currency); return Number(amount) / Number(rate); }
  function updateConversionPreview(amount){
    const cur = (currencySelect?.value || 'NGN');
    const amt = Number(amount || 0);
    const rate = getRateFor(cur);
    const usd = toUSD(amt, cur);
    if (convPreview) convPreview.textContent = `Rate: 1 USD = ${rate} ${cur} • Equivalent: $${usd ? usd.toFixed(2) : '0.00'}`;
    if (bankAmount) bankAmount.textContent = cur + ' ' + (amt ? amt.toLocaleString() : '0');
  }

  // stepper UI
  function updateStepUI(step){
    node1.classList.toggle('bg-[#00D2B1]', step >= 1);
    node2.classList.toggle('bg-[#00D2B1]', step >= 2);
    node3.classList.toggle('bg-[#00D2B1]', step >= 3);
    stepLabel.textContent = (step >=1 && step <=3) ? `${step} of 3` : '';
    const pct = Math.min(100, ((step-1)/2)*100);
    if (progressBar) progressBar.style.width = `${pct}%`;
  }

  // open/close spinner
  function setBusy(on=true){
    if (depositSpinner) show(depositSpinner, on);
  }

  // toast center
  function showCenterToast(msg, ms=2200){
    if (!centerToast) return;
    centerToastText.textContent = msg;
    centerToast.classList.remove('hidden');
    setTimeout(()=> centerToast.classList.add('hidden'), ms);
  }

  // add pending transaction row to transactions table
  function addPendingTransaction({ type='deposit', amount_usd, currency, currency_amount }){
    const tbody = document.getElementById(txTbodyId);
    if (!tbody) return;
    const when = new Date().toLocaleString();
    const net = (Number(amount_usd || 0)).toFixed(2);
    const tr = document.createElement('tr');
    tr.className = 'border-t border-white/10';
    tr.innerHTML = `<td class="px-2 py-2 w-1/4">${type}</td>
      <td class="px-2 py-2 w-1/4">$${net}</td>
      <td class="px-2 py-2 w-1/4">pending</td>
      <td class="px-2 py-2 w-1/4">${when}</td>`;
    // insert at top
    tbody.insertAdjacentElement('afterbegin', tr);
  }

  // copy helpers
  async function copyText(t){
    try { await navigator.clipboard.writeText(t); showCenterToast('Copied', 900); }
    catch(e){ showCenterToast('Copy failed', 900); }
  }

  // get account id helper (uses global function if present)
  async function getAccountId(){
    try {
      if (typeof getCurrentAccountId === 'function') return await getCurrentAccountId();
      const saved = Number(localStorage.getItem('currentAccountId') || 0);
      return saved || null;
    } catch { return null; }
  }

  // initialisation
  (async ()=>{
    await fetchRates();
    updateConversionPreview(Number(amountInput?.value || 0));
    updateStepUI(1);
  })();

  // events: method tabs
  depDirectBtn?.addEventListener('click', ()=> { depDirectBtn.classList.add('dep-active'); depCryptoBtn?.classList.remove('dep-active'); depP2PBtn?.classList.remove('dep-active'); show(step1,true); show(step2,false); show(step3,false); updateStepUI(1); });
  depCryptoBtn?.addEventListener('click', ()=> { depDirectBtn?.classList.remove('dep-active'); depCryptoBtn.classList.add('dep-active'); depP2PBtn?.classList.remove('dep-active'); show(step1,false); show(step2,false); show(step3,false); updateStepUI(0); showCenterToast('Crypto deposits available in the Crypto panel', 1800); });
  depP2PBtn?.addEventListener('click', ()=> { depDirectBtn?.classList.remove('dep-active'); depCryptoBtn?.classList.remove('dep-active'); depP2PBtn.classList.add('dep-active'); show(step1,false); show(step2,false); show(step3,false); updateStepUI(0); showCenterToast('P2P not available yet', 2200); });

  // currency selection: only NGN allowed
  currencySelect?.addEventListener('change', (e)=>{
    const v = e.target.value;
    if (v !== 'NGN'){ showCenterToast(`${v} not available in your region yet`, 2000); currencySelect.value = 'NGN'; }
    updateConversionPreview(Number(amountInput?.value || 0));
  });
  amountInput?.addEventListener('input', e => updateConversionPreview(e.target.value));

  // Step1 -> generate reference and show bank (2s spinner)
  step1Next?.addEventListener('click', async ()=>{
    const amt = Number(amountInput?.value || 0);
    if (!amt || amt <= 0){ showCenterToast('Enter an amount', 1800); return; }
    // convert to USD and check >= $20
    await fetchRates();
    const usdVal = toUSD(amt, 'NGN'); // we only accept NGN here
    if (usdVal < 20){ showCenterToast('Minimum deposit is $20 equivalent', 2200); return; }

    // ensure account id
    const accountId = await getAccountId();
    if (!accountId){ showCenterToast('Account not found. Create an account first.', 2400); return; }

    // request server-generated payment reference
    try {
      setBusy(true);
      const refResp = await apiFetch('/deposits/reference', { method:'POST', body: JSON.stringify({ account_id: accountId, currency: 'NGN', currency_amount: amt }) });
      const reference = (refResp && (refResp.reference || refResp.data?.reference)) || (`GVREF${Date.now()}`);
      // show step 2 with spinner for 2s
      show(step1,false); show(step2,true); updateStepUI(2);
      show(bankLoading, true); show(bankDetails, false);
      setTimeout(()=>{
        // bank details fill (static Providus details)
        bankRef.textContent = reference;
        bankName.textContent = 'Providus Bank';
        bankAcctName.textContent = 'Glorivest Services Ltd.';
        bankAcctNum.textContent = '1308556778';
        bankAmount.textContent = 'NGN ' + (amt ? amt.toLocaleString() : '0');

        show(bankLoading, false);
        show(bankDetails, true);
        setBusy(false);
      }, 2000);
    } catch (err){
      console.warn('reference request failed', err);
      setBusy(false);
      showCenterToast('Could not create payment reference. Try again.', 2400);
    }
  });

  // copy account number
  copyAcctBtn?.addEventListener('click', ()=> copyText(bankAcctNum.textContent || ''));

  // cancel payment (closes modal)
  cancelPayment?.addEventListener('click', ()=> {
    // optional: call backend cancel endpoint if you add one
    const modal = $('tab-deposit'); if (modal) modal.classList.add('hidden');
    showCenterToast('Payment cancelled', 1400);
  });

  // ive sent -> try automatic verify (simulated), if not verified -> show upload panel
  iveSent?.addEventListener('click', async ()=>{
    // show checking spinner inside modal
    show(step2,false);
    // create a small checking screen (reuse bank-loading area)
    show(bankLoading, true); show(bankDetails, false);
    setBusy(true);
    // simulate check (3s)
    setTimeout(()=>{
      setBusy(false);
      show(bankLoading, false);
      // we attempt to auto-verify by calling a backend check endpoint (best-effort)
      (async ()=>{
        try {
          // optional: if you later have an endpoint to check by reference, hit it
          const reference = bankRef.textContent || '';
          if (!reference) throw new Error('no-ref');
          // If backend has /deposits/check?reference=...
          try {
            const check = await apiFetch(`/deposits/check?reference=${encodeURIComponent(reference)}`, { method: 'GET' });
            if (check?.status === 'confirmed'){
              // success: close modal and show center toast + add transaction
              const usdAmt = toUSD(Number(amountInput.value||0), 'NGN');
              addPendingTransaction({ type:'deposit', amount_usd: usdAmt, currency:'NGN', currency_amount: Number(amountInput.value||0) });
              const modal = $('tab-deposit'); if (modal) modal.classList.add('hidden');
              showCenterToast('Deposit confirmed', 2200);
              return;
            }
            // otherwise fallthrough to upload
          } catch(e) {
            // backend doesn't support check or returned 404 -> fallback to manual upload flow
          }
        } catch(e){}
        // Show upload UI
        show(step3, true);
        updateStepUI(3);
      })();
    }, 3000);
  });

  // navigation
  step2Back?.addEventListener('click', ()=> { show(step2,false); show(step1,true); updateStepUI(1); });
  step3Back?.addEventListener('click', ()=> { show(step3,false); show(step2,true); updateStepUI(2); });

  // file preview
  fileInput?.addEventListener('change', (e)=>{
    const f = e.target.files?.[0];
    if (!f){ show(filePreviewWrap,false); return; }
    filePreview.innerHTML = '';
    if (f.type.startsWith('image/')){
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.className = 'file-thumb';
      filePreview.appendChild(img);
    } else {
      const div = document.createElement('div');
      div.className = 'text-xs text-white/80';
      div.textContent = `${f.name} (${Math.round(f.size/1024)} KB)`;
      filePreview.appendChild(div);
    }
    show(filePreviewWrap, true);
  });

  // submit deposit (upload evidence -> create deposit record -> close modal -> toast & pending tx)
  submitDepositBtn?.addEventListener('click', async ()=>{
    const f = fileInput?.files?.[0];
    if (!f){ showCenterToast('Please upload a receipt', 1800); return; }

    const reference = bankRef.textContent || '';
    if (!reference){ showCenterToast('Missing reference. Go back and try again', 1800); return; }

    const accountId = await getAccountId();
    if (!accountId){ showCenterToast('No account', 1800); return; }

    setBusy(true);

    // upload file to /upload
    let evidenceUrl = FALLBACK_UPLOAD_URL;
    try {
      const fd = new FormData();
      fd.append('file', f);
      const up = await fetch(`${API}/upload`, {
        method:'POST',
        headers: token() ? { Authorization: `Bearer ${token()}` } : {},
        body: fd
      });
      if (up.ok){
        const upj = await up.json();
        evidenceUrl = upj.url || upj.location || upj.data?.url || evidenceUrl;
      } else {
        // fallback to local path
        evidenceUrl = FALLBACK_UPLOAD_URL;
      }
    } catch (e){
      console.warn('upload failed', e);
      evidenceUrl = FALLBACK_UPLOAD_URL;
    }

    // create deposit record
    try {
      const ngnAmount = Number(amountInput.value || 0);
      const usdValue = toUSD(ngnAmount, 'NGN');

      await apiFetch('/deposits/direct', {
        method: 'POST',
        body: JSON.stringify({
          amount: usdValue,
          currency: 'NGN',
          currency_amount: ngnAmount,
          reference,
          evidence_url: evidenceUrl,
          account_id: accountId
        })
      });

      // add pending tx to transactions UI
      addPendingTransaction({ type:'deposit', amount_usd: usdValue, currency:'NGN', currency_amount: ngnAmount });

      // close modal and show center toast
      const modal = $('tab-deposit'); if (modal) modal.classList.add('hidden');

      showCenterToast('Deposit submitted. Check Transactions tab for status.', 3000);

      // reset wizard
      fileInput.value = '';
      filePreview.innerHTML = '';
      show(filePreviewWrap, false);
      show(step3, false); show(step1, true); updateStepUI(1);

    } catch (err){
      console.error('submit deposit error', err);
      showCenterToast('Deposit failed. Try again.', 2600);
    } finally {
      setBusy(false);
    }

    // best-effort: notify user/admin via /notify/email (do not block UX)
    (async ()=>{
      try {
        const me = await apiFetch('/account/me');
        const userEmail = me?.email;
        const adminEmail = 'admin@glorivest.com';
        const bodyUser = `Hello ${me?.email || 'User'},\n\nWe received your deposit proof for ${ngnAmount} NGN. We will verify and credit your account.\nReference: ${reference}\n\n`;
        await fetch(`${API}/notify/email`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ to: userEmail, subject:'Deposit Received', body: bodyUser }) });
        await fetch(`${API}/notify/email`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ to: adminEmail, subject:'New Deposit Submitted', body: `User: ${me?.email} Ref: ${reference}` }) });
      } catch(e){ /* ignore */ }
    })();

  });

})();
