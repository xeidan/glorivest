// dashboard.js — full replacement
// Assumptions:
// - `apiFetch(path, opts)` may exist globally. If not, fallback uses fetch + Authorization from localStorage token.
// - HTML IDs and classes are those in your dashboard.html provided earlier.

(function () {
  'use strict';

  // ---------- small helpers ----------
  function tokenHeader() {
    const t = localStorage.getItem('token') || '';
    return t ? { Authorization: 'Bearer ' + t } : {};
  }


    // ===== Notification Sheet Elements =====
const sheetNotif = qs('sheet-notifications');
const sheetNotifBg = qs('sheet-notifications-backdrop');
const sheetNotifPanel = qs('sheet-notifications-panel');

// ===== Guide Sheet Elements =====
const sheetGuide = qs('sheet-guide');
const sheetGuideBg = qs('sheet-guide-backdrop');
const sheetGuidePanel = qs('sheet-guide-panel');


  async function rawFetch(path, opts = {}) {
    const base = ''; // if your front-end proxies API, otherwise use full host in apiFetch
    const headers = Object.assign({ 'Content-Type': 'application/json' }, tokenHeader(), opts.headers || {});
    const res = await fetch((path.startsWith('http') ? path : base + path), Object.assign({}, opts, { headers }));
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      let json = null;
      try { json = JSON.parse(txt); } catch(e){}
      const err = new Error((json && json.message) || res.statusText || 'HTTP error');
      err.status = res.status;
      err.body = json || txt;
      throw err;
    }
    return res.json().catch(()=>null);
  }



  // If apiFetch exists, use it, otherwise fall back
  const APIFETCH = (typeof apiFetch === 'function') ? apiFetch : rawFetch;

  // ---------- formatting ----------
  function centsToNumber(cents) {
    if (cents === null || cents === undefined) return 0;
    // some fields come as strings
    return Number(cents || 0) / 100;
  }
  function money(n) {
    return `$${Number(n||0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // ---------- Tab switching & nav highlight ----------
  function showTab(tab) {
    document.querySelectorAll('.tab-section, .tab-content').forEach(el => el.classList.add('hidden'));
    // tab can be 'dashboard', 'earn', 'deposit', 'withdraw', 'transactions', ...
    const t = document.getElementById(`tab-${tab}`);
    if (t) t.classList.remove('hidden');

    // bottom nav highlight: mark selected by data-tab attribute if exists
    document.querySelectorAll('[data-tab]').forEach(el => {
      if (el.dataset.tab === tab) el.classList.add('active-tab');
      else el.classList.remove('active-tab');
    });

    // also toggle top-level "tab" buttons (if any) to green when active
    document.querySelectorAll('.nav-item').forEach(it => {
      const active = it.dataset.tab === tab;
      it.classList.toggle('text-green-400', active);
      it.classList.toggle('bg-white/5', !active);
    });
  }
  window.showTab = showTab;


  // expose closeTab used by HTML close buttons
  window.closeTab = function (btn) {
  const modal = btn.closest('.modal-overlay');
  if (modal) {
    modal.classList.add('hidden');
    return;
  }
  // re-activate dashboard tab on navbar
const dashNav = document.querySelector('[data-tab="dashboard"]');
document.querySelectorAll('[data-tab]').forEach(n => n.classList.remove('active-tab'));
if (dashNav) dashNav.classList.add('active-tab');


  // fallback: if it's actually a tab (earn, trade, etc)
  const tab = btn.closest('.tab-content');
  if (tab) tab.classList.add('hidden');

  // always show dashboard back
  const dash = document.getElementById('tab-dashboard');
  if (dash) dash.classList.remove('hidden');
};


  // ---------- balance visibility ----------
  let isBalanceVisible = true;
  function toggleBalance() {
    isBalanceVisible = !isBalanceVisible;
    const els = {
      total: document.getElementById('total-balance'),
      avail: document.getElementById('available-balance'),
      ref: document.getElementById('referral-earnings'),
      profit: document.getElementById('profit-increase'),
      perc: document.getElementById('percentage-increase'),
      eye: document.getElementById('real-balance-eye-icon')
    };

    ['total','avail','ref','profit'].forEach(k=>{
      const el = els[k];
      if (!el) return;
      if (isBalanceVisible) el.textContent = el.dataset.value || el.textContent;
      else el.textContent = '•••••••';
    });

    if (els.perc) {
      if (isBalanceVisible) els.perc.innerHTML = els.perc.dataset.value || els.perc.innerHTML;
      else els.perc.textContent = '•••••••';
    }

    if (els.eye) {
      els.eye.className = isBalanceVisible ? 'fa-solid fa-eye text-white/70 text-lg' : 'fa-solid fa-eye-slash text-white/70 text-lg';
    }
  }

  window.toggleBalance = toggleBalance;

  // optional: hook toggle button (if exists)
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-toggle-balance]');
    if (btn) { toggleBalance(); }
  });

  // ---------- load balances and account info ----------
  // keeps current loaded account object
  const state = {
    user: null,
    accounts: [],
    currentAccount: null
  };

  async function loadFullUser() {
    // returns object { user, account }
    try {
      const user = await APIFETCH('/auth/me');
      // fetch accounts
      const accounts = await APIFETCH('/accounts');
      state.user = user || null;
      state.accounts = Array.isArray(accounts) ? accounts : [];
      // choose default account: currentAccount if present, else default_account_id from user, else first
      const saved = Number(localStorage.getItem('currentAccountId') || 0);
      let account = null;
      if (saved) account = state.accounts.find(a => a.id === saved);
      if (!account && user && user.default_account_id) account = state.accounts.find(a => a.id === user.default_account_id);
      if (!account) account = state.accounts[0] || null;
      state.currentAccount = account;
      return { user: state.user, account: state.currentAccount };
    } catch (err) {
      console.warn('loadFullUser error', err);
      return { user: null, account: null };
    }
  }

  function computeAndRender(user, account) {
    if (!user || !account) return;

    // authoritative values come from account and user
    const total = centsToNumber(account.balance_cents);
    const botProfit = centsToNumber(account.profit_cents); // trading bot profit
    // referral/reward stored on user
    const referral = Number(user.referral_earnings || user.reward_balance || 0);

    // available: capital + referral - botProfit (per your spec)
    const available = Math.max(0, total + referral - botProfit);

    // percentage increase: percent profit made by bot relative to capital (avoid div by zero)
    const percentage = total > 0 ? ((botProfit / (total || 1)) * 100) : (botProfit > 0 ? 100 : 0);
    const percentageStr = `${percentage >= 0 ? '+' : ''}${Number(percentage).toFixed(1)}%`;
    const profitStr = `${botProfit >= 0 ? '+' : '-'}${money(Math.abs(botProfit))}`;

    // glorivest id & tier
    const glorivestId = user.glorivest_id || `GV${150000 + user.id}`;
    const email = user.email || '';
    const tier = account.tier_name || (account.tier || 'Standard');
    const code = account.account_code || glorivestId;

    // DOM elements
    const totalEl = document.getElementById('total-balance');
    const availEl = document.getElementById('available-balance');
    const refEl = document.getElementById('referral-earnings');
    const percEl = document.getElementById('percentage-increase');
    const profitEl = document.getElementById('profit-increase');
    const idEl = document.getElementById('glorivest-id');
    const emailEl = document.getElementById('user-email');
    const tierEl = document.getElementById('current-account-tier');
    const codeEl = document.getElementById('current-account-code');

    if (totalEl) { totalEl.textContent = money(total); totalEl.dataset.value = money(total); }
    if (availEl)  { availEl.textContent = money(available); availEl.dataset.value = money(available); }
    if (refEl)    { refEl.textContent = money(referral); refEl.dataset.value = money(referral); }
    if (profitEl) { profitEl.textContent = profitStr; profitEl.dataset.value = profitStr; }
    if (percEl)   { percEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; percEl.dataset.value = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`; }

    if (idEl) idEl.textContent = glorivestId;
    if (emailEl) emailEl.textContent = email;
    if (tierEl) tierEl.textContent = tier;
    if (codeEl) codeEl.textContent = code.startsWith('#') ? code : `#${code}`;

    // store for others
    state.user = user;
    state.currentAccount = account;
    // persist selection
    if (account && account.id) localStorage.setItem('currentAccountId', String(account.id));
  }

  // public refresh function
  async function loadBalances() {
    const { user, account } = await loadFullUser();
    if (!user || !account) return;
    computeAndRender(user, account);
  }

  // set up DOMContentLoaded auto-refresh
  document.addEventListener('DOMContentLoaded', () => {
    loadBalances();
    document.addEventListener('balances:refresh', loadBalances);
  });

  // ---------- Accounts bottom-sheet logic (improved) ----------
  function qs(id) { return document.getElementById(id); }
  async function fetchAccountsForSheet() {
    try {
      const accs = await APIFETCH('/accounts');
      state.accounts = Array.isArray(accs) ? accs : [];
      return state.accounts;
    } catch (e) {
      console.warn('fetchAccounts error', e);
      return [];
    }
  }

  function fmtUSD(cents) {
    return `$${(Number(cents||0)/100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
  }

  function applyHeader(acc) {
    if (!acc) return;
    const tierText = acc.tier_name || acc.tier || 'Standard';
    const rawCode = (acc.account_code || '').trim();
    qs('current-account-tier') && (qs('current-account-tier').textContent = tierText);
    qs('current-account-code') && (qs('current-account-code').textContent = rawCode.startsWith('#') ? rawCode : `#${rawCode || '—'}`);
    const bal = Number(acc.balance_cents || 0);
    const fmt = `$${(bal/100).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}`;
    qs('total-balance') && (qs('total-balance').textContent = fmt);
    qs('available-balance') && (qs('available-balance').textContent = fmt);
  }

  async function openAccountsSheet() {
    const aModal  = qs('sheet-accounts');
    const aBg     = qs('sheet-accounts-backdrop');
    const aPanel  = qs('sheet-accounts-panel');
    const aList   = qs('list-accounts');

    const accs = await fetchAccountsForSheet();
    const saved = Number(localStorage.getItem('currentAccountId')||0);
    const curr = accs.find(a=>a.id===saved) || accs[0] || null;
    if (curr) {
      state.currentAccount = curr;
      applyHeader(curr);
    }

    // render rows
    aList.innerHTML = '';
    if (!accs.length) {
      const no = document.createElement('div');
      no.className = 'text-center text-white/70';
      no.textContent = 'No accounts found';
      aList.appendChild(no);
    } else {
      accs.forEach(a=>{
        const btn = document.createElement('button');
        btn.className = 'w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 mb-2';
        btn.innerHTML = `
          <div class="flex items-center justify-between">
            <div>
              <div class="text-lg font-semibold text-white">${(a.tier_name||a.tier||'Standard').replace(/\s*Account$/i,'')}</div>
              <div class="mt-1 text-xs text-white/70"><span class="px-1 rounded-md bg-white/10 border border-white/10">${(a.account_code||'#—')}</span></div>
            </div>
            <div class="text-sm font-semibold text-white/90">${fmtUSD(a.balance_cents)}</div>
          </div>`;
        btn.addEventListener('click', ()=>{
          state.currentAccount = a;
          localStorage.setItem('currentAccountId', String(a.id));
          applyHeader(a);
          // rerender dashboard values
          computeAndRender(state.user, a);
          // close sheet
          aBg.classList.remove('opacity-100');
          aPanel.classList.add('translate-y-full');
          setTimeout(()=>aModal.classList.add('hidden'),220);
        });
        aList.appendChild(btn);
      });
    }

    // open visually
    aModal.classList.remove('hidden');
    requestAnimationFrame(()=>{
      aBg.classList.add('opacity-100');
      aPanel.classList.remove('translate-y-full');
    });
  }

  // wire accounts open button
  document.addEventListener('click', e => {
    if (e.target.closest('#btn-open-accounts')) {
      openAccountsSheet();
    }
    if (e.target.closest('#btn-accounts-create')) {
      // open create sheet
      const nModal = qs('sheet-new'), nBg = qs('sheet-new-backdrop'), nPanel = qs('sheet-new-panel');
      nModal.classList.remove('hidden');
      requestAnimationFrame(()=>{ nBg.classList.add('opacity-100'); nPanel.classList.remove('translate-y-full'); });
    }
  });

  // create account flow (confirm step)
  document.addEventListener('click', async (e) => {
    if (!e.target.closest('#btn-review-confirm')) return;
    const btn = qs('btn-review-confirm');
    const prev = btn.textContent;
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      // determine chosen tier from selected tier-card
      const selectedCard = document.querySelector('.tier-card[style*="border-color: rgb"]') || document.querySelector('.tier-card[style*="box-shadow:"]') || document.querySelector('.tier-card[data-selected="true"]');
      let tier = null;
      if (selectedCard) tier = selectedCard.dataset.tier;
      // fallback to state.selectedTier (if your previous code sets it)
      if (!tier) {
        tier = window.selectedTier || 'standard';
      }
      // call backend
      const body = { tier_slug: tier };
      const res = await APIFETCH('/accounts', { method: 'POST', body: JSON.stringify(body) });
      // refresh accounts list & header
      const accs = await fetchAccountsForSheet();
      const newAcc = accs.find(a => a.account_code === res.account_code) || accs[accs.length - 1];
      if (newAcc) {
        state.currentAccount = newAcc;
        localStorage.setItem('currentAccountId', String(newAcc.id));
        applyHeader(newAcc);
        computeAndRender(state.user, newAcc);
      }
      // close review -> open accounts sheet (so user sees new account)
      // close review
      const rBg = qs('sheet-review-backdrop'), rPanel = qs('sheet-review-panel'), rModal = qs('sheet-review');
      if (rBg && rPanel && rModal) {
        rBg.classList.remove('opacity-100'); rPanel.classList.add('translate-y-full');
        setTimeout(()=>rModal.classList.add('hidden'),220);
      }
      // open accounts so user sees the new account
      openAccountsSheet();
    } catch (err) {
      console.error('create account failed', err);
      alert((err && err.message) || 'Failed to create account');
    } finally {
      btn.disabled = false; btn.textContent = prev;
    }
  });

  // sheet close click handlers
  ['sheet-accounts-backdrop','sheet-new-backdrop','sheet-review-backdrop'].forEach(id=>{
    const el = qs(id);
    if (el) el.addEventListener('click', ()=>{
      const sheet = el.closest('.fixed');
      if (sheet) sheet.classList.add('hidden');
    });
  });

  // tier selection (click handling)
  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.tier-card');
    if (!card) return;
    document.querySelectorAll('.tier-card').forEach(c=>{
      c.style.borderColor = (c === card) ? '#00D2B1' : 'rgba(255,255,255,0.1)';
      c.style.background = (c === card) ? 'rgba(0,210,177,0.04)' : 'rgba(255,255,255,0.05)';
      c.dataset.selected = (c === card) ? 'true' : 'false';
    });
    // store selected for outside use
    window.selectedTier = card.dataset.tier;
  });

  // ---------- Refer Now → Earn fix ----------
  // Ensure clicking refer button shows earn tab and also highlights it
  const referBtn = document.querySelector('[data-refer-now]');
  if (referBtn) {
  referBtn.addEventListener('click', () => {
    showTab('earn');
    const earnNav = document.querySelector('[data-tab="earn"]');
    if (earnNav) {
      document.querySelectorAll('[data-tab]').forEach(n => n.classList.remove('active-tab'));
      earnNav.classList.add('active-tab');
    }
  });
}


  // ---------- Notification & Guide modal handlers ----------
  window.openModal = function(id) {
    const m = qs(id);
    if (!m) return;
    m.classList.remove('hidden');
  };
  window.closeModal = function(id) {
    const m = qs(id);
    if (!m) return;
    m.classList.add('hidden');
  };

  // ---------- small initialization ----------
  // add a class style for active-tab if not present (simple)
  (function ensureStyles(){
    const styleId = 'dashboard-js-inline-styles';
    if (document.getElementById(styleId)) return;
    const s = document.createElement('style');
    s.id = styleId;
    s.innerHTML = `
      .active-tab { color: #00D2B1 !important; }
      .nav-item.text-green-400 { color: #00D2B1 !important; }
    `;
    document.head.appendChild(s);
  })();

  // Expose loadBalances globally (page expects it)
  window.loadFullUser = loadFullUser;
  window.loadBalances = loadBalances;

  // initial run if DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(loadBalances, 120);
  } else {
    document.addEventListener('DOMContentLoaded', ()=> setTimeout(loadBalances, 120));
  }

  // also listen for a manual refresh event from other components
  document.addEventListener('balances:refresh', loadBalances);

})();





// ------------------------------------------------------ //
// ---------- Notifications & Guide sheets logic ----------
// ------------------------------------------------------ //
(function(){

  function qs(id){ return document.getElementById(id); }

  // ===== Sheet Elements (ONLY HERE) =====
  const sheetNotif = qs('sheet-notifications');
  const sheetNotifBg = qs('sheet-notifications-backdrop');
  const sheetNotifPanel = qs('sheet-notifications-panel');
  const sheetNotifHandle = qs('sheet-notifications-handle');
  const notifList = qs('notifications-list');
  const notifEmpty = qs('notifications-empty');

  const sheetGuide = qs('sheet-guide');
  const sheetGuideBg = qs('sheet-guide-backdrop');
  const sheetGuidePanel = qs('sheet-guide-panel');
  const sheetGuideHandle = qs('sheet-guide-handle');
  const guideBody = qs('guide-body');

  // buttons
  const btnBell = document.getElementById('btn-open-notifications');
  const btnGuide = document.getElementById('btn-open-guide');

  // utilities
  function setSheetActive(tab, on){
    const nav = document.querySelector('[data-tab="'+tab+'"]');
    if (nav) nav.classList.toggle('active-tab', on);
  }

  function openSheet(sheet, bg, panel, tab){
    sheet.classList.remove('hidden');
    bg.classList.remove('opacity-0');
    requestAnimationFrame(()=>{
      bg.classList.add('opacity-100');
      panel.classList.remove('translate-y-full');
    });
    setSheetActive(tab,true);
  }

  function closeSheet(sheet, bg, panel, tab){
    bg.classList.remove('opacity-100');
    panel.classList.add('translate-y-full');
    setTimeout(()=>{
      sheet.classList.add('hidden');
      setSheetActive(tab,false);
    },250);
  }

  // drag-close
  function attachDragClose(handle,panel,closeFn){
    if (!handle) return;
    let startY=0,currentY=0,drag=false;

    handle.addEventListener('touchstart', e=>{
      drag=true;
      startY=e.touches[0].clientY;
      panel.style.transition='none';
    },{passive:true});

    handle.addEventListener('touchmove', e=>{
      if(!drag) return;
      currentY=e.touches[0].clientY;
      const dy=Math.max(0,currentY-startY);
      panel.style.transform=`translateY(${dy}px)`;
    },{passive:true});

    handle.addEventListener('touchend', ()=>{
      drag=false;
      panel.style.transition='';
      if(currentY-startY>70) closeFn();
      else panel.style.transform='';
    });
  }


  // fetch notifications
  async function fetchNotifications(){
    notifList.innerHTML='';
    notifEmpty.textContent='Loading...';

    let data=null;
    try{ data=await APIFETCH('/notify'); }catch{}
    if(!data){
      try{ data=await APIFETCH('/notifications'); }catch{}
    }

    let items=[];
    if(Array.isArray(data)) items=data;
    else if(data?.data) items=data.data;
    else if(data?.notifications) items=data.notifications;

    if(!items.length){
      notifEmpty.textContent='No notifications yet.';
      return;
    }

    notifEmpty.textContent='';

    items.forEach(n=>{
      const li=document.createElement('li');
      li.className='bg-white/5 p-3 rounded-lg border border-white/8';
      li.innerHTML=`
        <div class="text-white font-semibold">${n.title||'Notification'}</div>
        <div class="text-xs text-white/70 mt-1">${n.message||''}</div>
      `;
      notifList.appendChild(li);
    });
  }


  // -------------- OPEN / CLOSE LOGIC --------------------

  btnBell?.addEventListener('click', async ()=>{
    forceCloseGuide();
    setTimeout(()=>{
      openSheet(sheetNotif, sheetNotifBg, sheetNotifPanel, 'notifications');
    },200);
    fetchNotifications();
  });

  btnGuide?.addEventListener('click', ()=>{
    forceCloseNotifications();
    setTimeout(()=>{
      openSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, 'guide');
    },200);
  });

  sheetNotifBg?.addEventListener('click', ()=>closeSheet(sheetNotif,sheetNotifBg,sheetNotifPanel,'notifications'));
  sheetGuideBg?.addEventListener('click', ()=>closeSheet(sheetGuide,sheetGuideBg,sheetGuidePanel,'guide'));

  attachDragClose(sheetNotifHandle,sheetNotifPanel,()=>closeSheet(sheetNotif,sheetNotifBg,sheetNotifPanel,'notifications'));
  attachDragClose(sheetGuideHandle,sheetGuidePanel,()=>closeSheet(sheetGuide,sheetGuideBg,sheetGuidePanel,'guide'));

  // expose cross-closing (inside same scope!)
  window.forceCloseNotifications = function(){
    if(!sheetNotif.classList.contains('hidden')){
      closeSheet(sheetNotif,sheetNotifBg,sheetNotifPanel,'notifications');
    }
  };

  window.forceCloseGuide = function(){
    if(!sheetGuide.classList.contains('hidden')){
      closeSheet(sheetGuide,sheetGuideBg,sheetGuidePanel,'guide');
    }
  };

})();


