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
      const user = await apiFetch('/account/me');
  
      const balance    = Number(user.balance || 0);
      const earnings   = Number(user.reward_balance || 0);
      const percentage = ((earnings / (balance || 1)) * 100).toFixed(1);
      const glorivestId = user.glorivest_id || 'GV000000';
      const email       = user.email || 'Unknown';
  
      const balanceStr    = `$${balance.toFixed(2)}`;
      const earningsStr   = `$${earnings.toFixed(2)}`;
      const percentageStr = `+${percentage}%`;
      const profitStr     = `+$${earnings.toFixed(2)}`;
  
      const totalEl  = document.getElementById('total-balance');
      const availEl  = document.getElementById('available-balance');
      const refEl    = document.getElementById('referral-earnings');
      const percEl   = document.getElementById('percentage-increase');
      const profitEl = document.getElementById('profit-increase');
      const idEl     = document.getElementById('glorivest-id');
      const emailEl  = document.getElementById('user-email');
  
      if (totalEl)  { totalEl.textContent  = balanceStr;  totalEl.dataset.value  = balanceStr; }
      if (availEl)  { availEl.textContent  = balanceStr;  availEl.dataset.value  = balanceStr; }
      if (refEl)    { refEl.textContent    = earningsStr; refEl.dataset.value    = earningsStr; }
      if (percEl)   { percEl.innerHTML     = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; percEl.dataset.value = percentageStr; }
      if (profitEl) { profitEl.textContent = profitStr;   profitEl.dataset.value = profitStr; }
      if (idEl)     idEl.textContent = glorivestId;
      if (emailEl)  emailEl.textContent = email;
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  }
  


  


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

  

      (function(){
        const token = localStorage.getItem('token');
        const GREEN = '#00D2B1';
      
        // Header fields in your dashboard
        const elTier  = document.getElementById('current-account-tier');
        const elCode  = document.getElementById('current-account-code');
        const elTotal = document.getElementById('total-balance');
        const elAvail = document.getElementById('available-balance');
      
        // Header chevron must have id="btn-open-accounts"
        const btnOpenAccounts = document.getElementById('btn-open-accounts');
      
        // ===== Accounts sheet =====
        const aModal  = document.getElementById('sheet-accounts');
        const aBg     = document.getElementById('sheet-accounts-backdrop');
        const aPanel  = document.getElementById('sheet-accounts-panel');
        const aHandle = document.getElementById('sheet-accounts-handle');
        const aList   = document.getElementById('list-accounts');
        const btnAccountsCreate = document.getElementById('btn-accounts-create');
      
        // ===== New sheet =====
        const nModal  = document.getElementById('sheet-new');
        const nBg     = document.getElementById('sheet-new-backdrop');
        const nPanel  = document.getElementById('sheet-new-panel');
        const nHandle = document.getElementById('sheet-new-handle');
        const btnNewBack   = document.getElementById('btn-new-back');
        const btnNewCreate = document.getElementById('btn-new-create');
        const listTiers    = document.getElementById('list-tiers');
      
        // ===== Review sheet =====
        const rModal  = document.getElementById('sheet-review');
        const rBg     = document.getElementById('sheet-review-backdrop');
        const rPanel  = document.getElementById('sheet-review-panel');
        const rHandle = document.getElementById('sheet-review-handle');
        const btnReviewBack    = document.getElementById('btn-review-back');
        const btnReviewConfirm = document.getElementById('btn-review-confirm');
        const reviewBody       = document.getElementById('review-body');
        const reviewTitle      = document.getElementById('review-title'); // add id to your <h3> in review header
      
        const TIER_META = {
          standard: { name:'Standard', feeLabel:'Free', fee_cents:0,     return_pct:15, min_cents:  2000 },
          pro:      { name:'Pro',      feeLabel:'$20',  fee_cents:2000,  return_pct:20, min_cents: 20000 },
          elite:    { name:'Elite',    feeLabel:'$50',  fee_cents:5000,  return_pct:25, min_cents:100000 },
        };
      
        const state = { accounts: [], currentId: null, selectedTier: 'standard' };
      
        // ---------- utils
        function fmtUSD(cents = 0){
          const n = Number(cents||0)/100;
          return `${n.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})} USD`;
        }
      
        async function fetchAccounts() {
          try {
            const list = await apiFetch('/accounts');
            return Array.isArray(list) ? list : [];
          } catch (e) {
            console.warn('fetchAccounts:', e.message || e);
            return [];
          }
        }
        
      
        function applyHeader(acc){
          if (!acc) return;
          const tierText = (acc.display_name || acc.tier || '').replace(/\s*Account$/i,'') || 'Standard';
          const rawCode  = (acc.account_code || '').trim();
          const codeText = rawCode.startsWith('#') ? rawCode : `#${rawCode || '—'}`;
      
          elTier && (elTier.textContent = tierText);
          elCode && (elCode.textContent = codeText);
      
          const bal = Number(acc.balance_cents || 0);
          const fmt = `$${(bal/100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
          elTotal && (elTotal.textContent = fmt);
          elAvail && (elAvail.textContent = fmt);
        }
      
        function renderAccounts(){
          aList.innerHTML = '';
          const accs = state.accounts;
      
          aList.classList.remove('justify-center','items-center','flex');
          aList.classList.add('flex','flex-col','gap-2');
          if (accs.length === 1) aList.classList.add('justify-center','items-center');
      
          const row = (acc, current=false) => {
            const el = document.createElement('button');
            el.className = 'w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3';
            el.innerHTML = `
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-lg font-semibold text-white">${(acc.display_name||acc.tier||'Standard').replace(/\s*Account$/i,'')}</div>
                  <div class="mt-1 flex items-center gap-2 text-xs text-white/70">
                    <span class="px-1 rounded-md bg-white/10 border border-white/10">
                      ${(acc.account_code && acc.account_code.startsWith('#')) ? acc.account_code : '#'+(acc.account_code||'—')}
                    </span>
                  </div>
                </div>
                <div class="text-sm font-semibold text-white/90">${fmtUSD(acc.balance_cents)}</div>
              </div>
              ${current ? '<div class="mt-2 text-[11px]" style="color:'+GREEN+'">Current</div>' : ''}
            `;
            el.addEventListener('click', ()=>{
              state.currentId = acc.id;
              localStorage.setItem('currentAccountId', String(acc.id));
              applyHeader(acc);
              closeAccounts();
            });
            aList.appendChild(el);
          };
      
          if (!accs.length) {
            row({ display_name:'Standard Account', account_code:(elCode?.textContent||'').replace(/^#?/,'#'), balance_cents:0, id: state.currentId||0 }, true);
            return;
          }
          accs.forEach(a => row(a, a.id === state.currentId));
        }
      
        function renderReview(){
          const t = TIER_META[state.selectedTier] || TIER_META.standard;
      
          // Header title becomes the selected tier in custom green
          const titleEl = document.getElementById('review-title');
          if (titleEl) {
            titleEl.textContent = t.name;
            titleEl.style.color = '#00D2B1'; // custom green
            titleEl.style.fontWeight = 600;
          }
      
          // Rich body (NO "Tier" row)
          reviewBody.innerHTML = `
            <div class="space-y-4">
              <div class="text-sm text-white/70">
                You’re creating a <span class="text-white font-semibold">${t.name}</span> account.
              </div>
      
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="text-white/60">Return</span>
                  <span class="font-semibold text-white">${t.return_pct}%</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-white/60">Min Deposit</span>
                  <span class="font-semibold text-white">$${(t.min_cents/100).toLocaleString()}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-white/60">Network</span>
                  <span class="font-semibold text-white">USDT-TRC20 (TRON)</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-white/60">One-time Fee</span>
                  <span class="font-semibold text-white">${t.feeLabel}</span>
                </div>
              </div>
      
              <div class="space-y-2 text-xs text-white/60 text-center pt-4">
                <p>Send only <span class="text-white">USDT-TRC20 (TRON)</span> to the generated wallet.</p>
                <p>Deposits below the minimum may not activate earnings for this account.</p>
               
              </div>
            </div>
          `;
        }
      
        function setSelectedTier(tier){
          state.selectedTier = tier;
          document.querySelectorAll('.tier-card').forEach(card=>{
            const on = card.dataset.tier === tier;
            card.style.borderColor = on ? GREEN : 'rgba(255,255,255,0.1)';
            card.style.boxShadow   = on ? '0 0 0 2px '+GREEN+'33 inset' : 'none';
            card.style.background  = on ? 'rgba(0,210,177,0.08)' : 'rgba(255,255,255,0.05)';
          });
      
          // Optional nicety: live-update Review screen if it's open
          if (!rModal.classList.contains('hidden')) renderReview();
        }
      
        // ---------- sheet open/close
        function openAccounts(){ aModal.classList.remove('hidden'); requestAnimationFrame(()=>{ aBg.classList.add('opacity-100'); aPanel.classList.remove('translate-y-full'); }); }
        function closeAccounts(){ aBg.classList.remove('opacity-100'); aPanel.classList.add('translate-y-full'); setTimeout(()=>aModal.classList.add('hidden'),220); }
        function openNew(){ nModal.classList.remove('hidden'); requestAnimationFrame(()=>{ nBg.classList.add('opacity-100'); nPanel.classList.remove('translate-y-full'); }); }
        function closeNew(){ nBg.classList.remove('opacity-100'); nPanel.classList.add('translate-y-full'); setTimeout(()=>nModal.classList.add('hidden'),220); }
        function openReview(){ renderReview(); rModal.classList.remove('hidden'); requestAnimationFrame(()=>{ rBg.classList.add('opacity-100'); rPanel.classList.remove('translate-y-full'); }); }
        function closeReview(){ rBg.classList.remove('opacity-100'); rPanel.classList.add('translate-y-full'); setTimeout(()=>rModal.classList.add('hidden'),220); }
      
        function attachDragClose(handle, closeFn, panel){
          let startY=0, currentY=0, dragging=false;
          const down = e => { dragging=true; startY=(e.touches?e.touches[0].clientY:e.clientY); panel.style.transition='none'; };
          const move = e => { if(!dragging) return; currentY=(e.touches?e.touches[0].clientY:e.clientY); const dy=Math.max(0,currentY-startY); panel.style.transform=`translateY(${dy}px)`; };
          const up   = () => { if(!dragging) return; dragging=false; panel.style.transition=''; const dy=Math.max(0,currentY-startY); if(dy>70) closeFn(); else panel.style.transform=''; };
          handle.addEventListener('mousedown',down); handle.addEventListener('touchstart',down,{passive:true});
          window.addEventListener('mousemove',move); window.addEventListener('touchmove',move,{passive:true});
          window.addEventListener('mouseup',up);     window.addEventListener('touchend',up);
        }
      
        // ---------- events (flow: Accounts → New → Review)
        btnOpenAccounts?.addEventListener('click', async ()=>{
          state.accounts = await fetchAccounts();
          const saved = Number(localStorage.getItem('currentAccountId')||0);
          const curr = state.accounts.find(a=>a.id===saved) || state.accounts[0] || null;
          if (curr){ state.currentId = curr.id; applyHeader(curr); }
          renderAccounts();
          openAccounts();
        });
      
        aBg.addEventListener('click', closeAccounts);
        nBg.addEventListener('click', closeNew);
        rBg.addEventListener('click', closeReview);
      
        btnAccountsCreate.addEventListener('click', ()=>{ closeAccounts(); openNew(); });
        btnNewBack.addEventListener('click', ()=>{ closeNew(); openAccounts(); });
        btnNewCreate.addEventListener('click', ()=>{ closeNew(); openReview(); });
        btnReviewBack.addEventListener('click', ()=>{ closeReview(); openNew(); });
      
        listTiers.addEventListener('click', e=>{
          const btn = e.target.closest('.tier-card');
          if (!btn) return;
          setSelectedTier(btn.dataset.tier);
        });
        setSelectedTier('standard');
      
        btnReviewConfirm.addEventListener('click', async () => {
          const tier = state.selectedTier || 'standard';
          const prevText = btnReviewConfirm.textContent;
          btnReviewConfirm.disabled = true;
          btnReviewConfirm.textContent = 'Creating…';
        
          try {
            await apiFetch('/accounts', {
              method: 'POST',
              body: JSON.stringify({ tier })
            });
        
            closeReview();
        
            state.accounts = await fetchAccounts();
            const newest = state.accounts[state.accounts.length - 1] || null;
            if (newest) {
              state.currentId = newest.id;
              localStorage.setItem('currentAccountId', String(newest.id));
              applyHeader(newest);
            }
        
            renderAccounts();
            openAccounts();
          } catch (e) {
            alert(e.message || 'Failed to create account');
          } finally {
            btnReviewConfirm.disabled = false;
            btnReviewConfirm.textContent = prevText;
          }
        });
        
      
        attachDragClose(aHandle, closeAccounts, aPanel);
        attachDragClose(nHandle, closeNew, nPanel);
        attachDragClose(rHandle, closeReview, rPanel);
      
        // Initial header sync
        (async ()=>{
          const accs = await fetchAccounts();
          if (!accs.length) return;
          const saved = Number(localStorage.getItem('currentAccountId')||0);
          const curr = accs.find(a=>a.id===saved) || accs[0];
          state.currentId = curr.id; applyHeader(curr);
        })();
      })();


        (function(){
          const nav = document.getElementById('bottom-nav'); // give your nav this id
          if (nav) {
            document.documentElement.style.setProperty('--bottom-nav-h', nav.offsetHeight + 'px');
          }
        })();


  window.addEventListener("DOMContentLoaded", loadBalances);
  
