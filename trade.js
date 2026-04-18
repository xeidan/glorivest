'use strict';

// ======================================================
// 1. GLOBAL HELPERS & SHARED STATE
// ======================================================


/* ---------- DOM Helper ---------- */
const qs = (id) => document.getElementById(id);

/* ---------- Auth Helper ---------- */
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

/* ---------- Formatting ---------- */
function fmt(cents) {
  const value = Number(cents || 0) / 100;

  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatTimeRemaining(ms) {

  if (ms <= 0) {
    return 'Settling...';
  }

  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;

  return `${minutes}m`;
}

/* ---------- Global Trade State ---------- */
let activeWallet = null;
let selectedDurationMonths = 1;

let cycleSubmissionState = {
  submitting: false
};

/* ---------- Authoritative Trade Data ---------- */
window.__activeCycles = [];
window.__completedCycles = [];

/* ---------- Wallet Helpers ---------- */
function getModeFilteredCycles(cycles) {
  const mode = window.__accountMode === 'DEMO' ? 'DEMO' : 'REAL';
  return cycles.filter(c => c.wallet_type === mode);
}

function getTradeWallet() {
  const wallets = window.getAllWallets?.() || [];

  if (window.__accountMode === 'DEMO') {
    return wallets.find(w => w.type === 'DEMO') || null;
  }

  // LIVE
  return wallets.find(w => w.type === 'REAL') || null;
}

/* ---------- UI Locking During Submission ---------- */
function lockNewCycleUI() {
  cycleSubmissionState.submitting = true;

  qs('start-new-cycle-btn')?.setAttribute('disabled', 'true');
  qs('start-new-cycle-btn')?.classList.add('opacity-50', 'cursor-not-allowed');

  document
    .querySelectorAll('.duration-btn')
    .forEach(b => b.setAttribute('disabled', 'true'));
}

/* ---------- UI Unlocking After Submission ---------- */
function unlockNewCycleUI() {
  cycleSubmissionState.submitting = false;

  qs('start-new-cycle-btn')?.removeAttribute('disabled');
  qs('start-new-cycle-btn')?.classList.remove('opacity-50', 'cursor-not-allowed');

  document
    .querySelectorAll('.duration-btn')
    .forEach(b => b.removeAttribute('disabled'));
}






// ======================================================
// 2. TRADE TAB ROUTER (NAVIGATION)
// ======================================================

/* ---------- Main Router ---------- */
window.showTradeTabContent = function (tab) {
  const tabs = ['overview', 'start', 'charts'];

  // Cleanup when leaving Markets tab
  if (tab !== 'charts') {
    if (typeof stopMarketFeed === 'function') stopMarketFeed();
    if (typeof stopBotStateSimulation === 'function') stopBotStateSimulation();
  }

  // Hide all tabs + reset buttons
  tabs.forEach(t => {
    qs(`trade-content-${t}`)?.classList.add('hidden');

    const btnId =
      t === 'start' ? 'trade-tab-start' :
      t === 'charts' ? 'trade-tab-charts' :
      `trade-tab-${t}`;

    qs(btnId)?.classList.remove('trade-tab-active');
  });

  if (!tabs.includes(tab)) return;

  // Show active tab
  qs(`trade-content-${tab}`)?.classList.remove('hidden');
  qs(`trade-content-${tab}`)?.offsetHeight; // force reflow

  // Activate correct button
  const activeBtnId =
    tab === 'start' ? 'trade-tab-start' :
    tab === 'charts' ? 'trade-tab-charts' :
    `trade-tab-${tab}`;

  qs(activeBtnId)?.classList.add('trade-tab-active');

  // Tab-specific entry hooks
  switch (tab) {
    case 'overview':
      refreshTradeState();
      break;

    case 'start':
      loadStartCycle();
      break;

    case 'charts':
      loadMarkets();
      break;
  }
};

/* ---------- Tab Button Wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('[data-trade-tab]')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tradeTab;
        window.showTradeTabContent(tab);
      });
    });
});





// ======================================================
// 3. OVERVIEW TAB (READ-ONLY UI)
// ======================================================


/* ---------- Completed Cycles Loader ---------- */
async function loadActiveCycles() {
  try {
    const wallet = getTradeWallet();
    if (!wallet) {
      window.__activeCycles = [];
      return [];
    }

    const res = await apiFetch(
      `/cycle/active?walletId=${wallet.id}`
    );

    const resetAt = window.__demoResetAt || 0;

    window.__activeCycles = Array.isArray(res.cycles)
      ? res.cycles
          .filter(c => {
            // LIVE cycles are never affected by demo reset
            if (wallet.type !== 'DEMO') return true;

            if (!resetAt) return true;

            return new Date(c.started_at).getTime() >= resetAt;
          })
          .map(c =>
            normalizeCycle({
              ...c,
              wallet_type: wallet.type
            })
          )
      : [];

    return window.__activeCycles;
  } catch (err) {
    console.error('Active cycles load failed:', err);
    window.__activeCycles = [];
    return [];
  }
}

/* ---------- Completed Cycles Loader ---------- */
async function loadCompletedCycles() {
  try {
    const wallet = getTradeWallet();

    if (!wallet) {
      window.__completedCycles = [];
      return [];
    }

    const res = await apiFetch(
      `/cycle/completed?walletId=${wallet.id}`
    );

    const resetAt = window.__demoResetAt || 0;

    window.__completedCycles = Array.isArray(res.cycles)
      ? res.cycles
          .filter(c => {
            if (wallet.type !== 'DEMO') return true;
            if (!resetAt) return true;

            return new Date(c.started_at).getTime() >= resetAt;
          })
          .map(c => {
            const realizedProfitCents = Number(
              c.realized_profit_cents ??
              c.realized_profit ??
              0
            );

            return normalizeCycle({
              ...c,
              realized_profit_cents: realizedProfitCents,
              wallet_type: wallet.type
            });
          })
      : [];

    return window.__completedCycles;

  } catch (err) {
    console.error('Completed cycles load failed:', err);

    window.__completedCycles = [];
    return [];
  }
}


/* ---------- Cycle Normalization (Derive Progress, Expected Profit, etc) ---------- */
function normalizeCycle(c) {

  const start = new Date(c.started_at);
  const end   = new Date(c.ends_at);

  const startMs = start.getTime();
  const endMs   = end.getTime();
  const now     = Date.now();

  const totalMs   = Math.max(0, endMs - startMs);
  const elapsedMs = Math.max(0, now - startMs);
  const remainingMs = Math.max(0, endMs - now);

  const progress =
    totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;

  const totalDays =
    totalMs > 0 ? Math.ceil(totalMs / 86400000) : 0;

  const elapsedDays =
    totalMs > 0
      ? Math.min(totalDays, Math.floor(elapsedMs / 86400000))
      : 0;

  const remainingDays =
    totalMs > 0
      ? Math.max(0, Math.ceil(remainingMs / 86400000))
      : 0;

  return {
    id: c.id,
    wallet_id: c.wallet_id,
    wallet_type: c.wallet_type || 'REAL',

    capital_cents: Number(c.capital_cents || 0),

    expected_profit_cents: Math.floor(
      Number(c.capital_cents || 0) *
      Number(c.expected_return_pct || 0) / 100
    ),

    realized_profit_cents: Number(
      c.realized_profit_cents ??
      c.realized_profit ??
      0
    ),

    start_at: start,
    end_at: end,

    duration_months: Number(c.duration_months || 1),

    progress,
    live_profit_cents: 0,

    total_days: totalDays,
    elapsed_days: elapsedDays,
    remaining_days: remainingDays,

    bot_logs: [],
    bot_log_index: 0,
    pending_logs: [],
    typing_line: '',
    typing_index: 0,
    is_typing: false,

    time_left_label:
  remainingMs <= 0 ? 'Settling...' : formatTimeRemaining(remainingMs),

    status: (c.status || 'RUNNING').toUpperCase()
  };
}



function renderActiveCount() {
  const active = getModeFilteredCycles(window.__activeCycles);
  qs('summary-active-count').textContent = active.length;
}



/* ---------- Cycle History (Completed) ---------- */
function renderCycleHistory() {
  const list = qs('cycle-history-list');
  if (!list) return;

  const completed = getModeFilteredCycles(window.__completedCycles)
    .filter(c => c.end_at)
    .sort((a, b) => b.end_at - a.end_at);

  list.innerHTML = '';

  if (!completed.length) {
    list.innerHTML = `
      <p class="text-sm text-white/50 text-center py-6">
        No completed cycles yet
      </p>
    `;
    return;
  }

  completed.forEach(c => {

    const isForfeited = c.status === 'CANCELLED';

list.insertAdjacentHTML('beforeend', `
  <div class="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-4">

    <!-- Top Row -->
    <div class="flex items-start justify-between gap-3">

      <div>
        <p class="text-sm font-medium text-white/85">
          ${c.total_days} Day Cycle
        </p>

        <p class="text-[11px] text-white/35 mt-1">
          Closed ${c.end_at.toLocaleString()}
        </p>
      </div>

      <span class="text-[11px] px-3 py-1 rounded-full font-medium ${
        isForfeited
          ? 'bg-red-500/15 text-red-400'
          : 'bg-[#00D2B1]/15 text-[#00D2B1]'
      }">
        ${isForfeited ? 'FORFEITED' : 'COMPLETED'}
      </span>

    </div>

    <!-- Metrics -->
    <div class="grid grid-cols-2 gap-4">

      <div>
        <p class="text-[11px] uppercase tracking-wide text-white/35">
          Capital
        </p>

        <p class="mt-1 text-lg font-semibold text-white">
          ${fmt(c.capital_cents)}
        </p>
      </div>

      <div class="text-right">
        <p class="text-[11px] uppercase tracking-wide text-white/35">
          Result
        </p>

        <p class="mt-1 text-lg font-semibold ${
          isForfeited ? 'text-red-400' : 'text-[#00D2B1]'
        }">
          ${isForfeited ? 'Forfeited' : `+${fmt(c.realized_profit_cents)}`}
        </p>
      </div>

    </div>

  </div>
`);
  });
}



/* ---------- Active Cycles (Overview Cards) ---------- */
function renderOverviewActiveCycles() {
  const container = qs('overview-active-cycles');
  if (!container) return;

  const active = getModeFilteredCycles(window.__activeCycles);

  renderActiveCount();
  container.innerHTML = '';

  if (!active.length) {
    container.innerHTML = `
      <div class="text-sm text-white/50 text-center py-6">
        No active cycles

Start a cycle from the "New Cycle" tab to begin automated trading.
      </div>
    `;
    return;
  }

  active.forEach(c => {
    const progress = Math.floor(c.progress * 100);

 container.insertAdjacentHTML('beforeend', `
  <div class="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-4">

    <!-- Top Row -->
    <div class="flex items-start justify-between gap-3">

      <div class="flex gap-2 flex-wrap">
        <span class="text-[11px] px-3 py-1 rounded-full bg-white/10 text-white/80">
          ${c.wallet_type === 'REAL' ? 'LIVE' : 'DEMO'}
        </span>

        <span class="text-[11px] px-3 py-1 rounded-full bg-[#00D2B1]/15 text-[#00D2B1] font-semibold">
          RUNNING
        </span>
      </div>

      <span class="text-[11px] text-white/35 text-right leading-4">
        ${c.time_left_label}
      </span>

    </div>

    <!-- Main Metrics -->
<div class="flex items-start justify-between gap-4">

     <div class="min-w-0">
  <p class="text-[11px] uppercase tracking-wide text-white/35">
    Capital
  </p>

  <p class="mt-1 text-xl font-semibold text-white">
    ${fmt(c.capital_cents)}
  </p>
</div>

<div class="text-right shrink-0">
  <p class="text-[11px] uppercase tracking-wide text-white/35">
    Expected Profit
  </p>

  <p class="mt-1 text-xl font-semibold text-[#00D2B1]">
    +${fmt(c.expected_profit_cents)}
  </p>
</div>

    </div>

    <!-- Progress -->
    <div class="space-y-2">

      <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          class="h-full bg-[#00D2B1] transition-all duration-700"
          style="width:${progress}%">
        </div>
      </div>

      <div class="flex justify-between text-[11px] text-white/35">
        <span>${c.elapsed_days} days elapsed</span>
        <span>${c.remaining_days} days left</span>
      </div>

    </div>

    <!-- Terminal -->
    <div
      class="bot-terminal rounded-2xl border border-white/5 bg-black/40 p-3 font-mono text-[11px] leading-5"
      data-bot-terminal="${c.id}">

      <div class="text-white/35 mb-2 uppercase tracking-wide text-[10px]">
        Bot Activity
      </div>

      ${c.bot_logs.map(l =>
        `<div class="bot-terminal-line text-white/70">${l}</div>`
      ).join('')}

      <div class="bot-terminal-line text-[#00D2B1]">▌</div>
    </div>

    <!-- Stop -->
    <button
      data-stop-cycle="${c.id}"
      class="w-full h-11 rounded-2xl border border-red-500/35 text-red-400 text-sm font-medium hover:bg-red-500/10 transition">
      Stop Cycle
    </button>

  </div>
`);
  });
}

/* ---------- Profit Summary Update (ROI Tiers) ---------- */
function updateProfitSummary(months) {
  const badge = qs('profit-summary-badge');
  const t1 = qs('roi-tier-1');
  const t2 = qs('roi-tier-2');
  const t3 = qs('roi-tier-3');

  if (!badge || !t1 || !t2 || !t3) return;

  const table = {
    1: {
      label: '30 Days',
      values: ['15%', '17%', '20%']
    },
    3: {
      label: '90 Days',
      values: ['50%', '60%', '70%']
    },
    6: {
      label: '180 Days',
      values: ['110%', '125%', '150%']
    }
  };

  const config = table[months] || table[1];

  badge.textContent = config.label;
  t1.textContent = config.values[0];
  t2.textContent = config.values[1];
  t3.textContent = config.values[2];
}


/* ---------- Portfolio Summary (Top Metrics) ---------- */
function renderPortfolioSummary() {

  const wallet = getTradeWallet();
  const active = getModeFilteredCycles(window.__activeCycles);
  const completed = getModeFilteredCycles(window.__completedCycles);

  const walletBalance = wallet ? Number(wallet.balance_cents || 0) : 0;

  const lockedCapital = active.reduce(
    (sum, c) => sum + Number(c.capital_cents || 0),
    0
  );

  const activePnL = active.reduce(
    (sum, c) => sum + Number(c.live_profit_cents || 0),
    0
  );

  const completedPnL = completed.reduce(
    (sum, c) => sum + Number(c.realized_profit_cents || 0),
    0
  );

  const availableEl = qs('summary-available-capital');
  if (availableEl) availableEl.textContent = fmt(walletBalance);

  const lockedEl = qs('summary-locked-capital');
  if (lockedEl) lockedEl.textContent = fmt(lockedCapital);

  const activePnlEl = qs('summary-live-profit');
  if (activePnlEl) activePnlEl.textContent = fmt(activePnL);

  const completedEl = qs('summary-total-earnings');
  if (completedEl) completedEl.textContent = fmt(completedPnL);

  const activeCountEl = qs('summary-active-count');
  if (activeCountEl) activeCountEl.textContent = active.length;
}




// ======================================================
// 4. NEW CYCLE TAB (FORMS + SUBMISSION)
// ======================================================

/* ---------- Expected Returns Logic ---------- */
function calculateExpectedReturns(amount, months) {
  let rate = 0;

  if (months === 1) {
    if (amount < 500) rate = 0.15;
    else if (amount < 5000) rate = 0.17;
    else rate = 0.20;
  }

  if (months === 3) {
    if (amount < 500) rate = 0.50;
    else if (amount < 5000) rate = 0.60;
    else rate = 0.70;
  }

  if (months === 6) {
    if (amount < 500) rate = 1.10;
    else if (amount < 5000) rate = 1.25;
    else rate = 1.50;
  }

  return amount * rate;
}

/* ---------- Cycle Summary Recalculation ---------- */
function recalcCycleSummary() {
  const wallet = getTradeWallet();
  if (!wallet) return;

  const input = qs('new-cycle-capital');
  const btn = qs('start-new-cycle-btn');

  const amount = Number(input.value || 0);
  const amountCents = Math.floor(amount * 100);
  const months = selectedDurationMonths;

  const expected = calculateExpectedReturns(amount, months);

  // Preview
  qs('preview-amount').textContent = `$${amount.toFixed(2)}`;
  qs('preview-duration').textContent =
    `${months} Month${months > 1 ? 's' : ''}`;
  qs('preview-expected').textContent = `$${expected.toFixed(2)}`;

  // Validation (wallet authoritative)
  const valid =
    amountCents >= 5000 &&
    amountCents <= wallet.balance_cents &&
    !cycleSubmissionState.submitting;

  btn.disabled = !valid;
  btn.textContent = valid ? 'Start Cycle' : 'Enter Valid Amount';
  btn.classList.toggle('opacity-50', !valid);
  btn.classList.toggle('cursor-not-allowed', !valid);
}

/* ---------- Load Start Cycle Context ---------- */
function loadStartCycle() {
  const wallet = getTradeWallet();
  if (!wallet) return;

  qs('main-wallet-balance').textContent = fmt(wallet.balance_cents);

  qs('new-cycle-capital').value = '';
  qs('stake-slider').value = 0;
  qs('slider-pct').textContent = '0';

  qs('preview-amount').textContent = '$0.00';
  qs('preview-duration').textContent = '1 Month';
  qs('preview-expected').textContent = '$0.00';

  selectedDurationMonths = 1;

  const btn = qs('start-new-cycle-btn');
  btn.disabled = true;
  btn.textContent = 'Enter Amount';
  updateProfitSummary(1);
}

/* ---------- Duration Button Handling ---------- */
document.querySelectorAll('.duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document
      .querySelectorAll('.duration-btn')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    selectedDurationMonths = Number(btn.dataset.months);
    updateProfitSummary(selectedDurationMonths);
    recalcCycleSummary();
  });
});

/* ---------- Slider Input ---------- */
qs('stake-slider')?.addEventListener('input', (e) => {
  const wallet = getTradeWallet();
  if (!wallet) return;

  const pct = Number(e.target.value);
  const balance = wallet.balance_cents / 100;
  const amount = (pct / 100) * balance;

  qs('new-cycle-capital').value = amount.toFixed(2);
  qs('slider-pct').textContent = pct;

  recalcCycleSummary();
});

/* ---------- Capital Input ---------- */
qs('new-cycle-capital')?.addEventListener('input', () => {
  const wallet = getTradeWallet();
  if (!wallet) return;

  const cents = Math.floor(
    Number(qs('new-cycle-capital').value) * 100
  );

  const pct = Math.min(
    100,
    Math.floor((cents / wallet.balance_cents) * 100)
  );

  qs('stake-slider').value = pct;
  qs('slider-pct').textContent = pct;

  recalcCycleSummary();
});

/* ---------- Cycle Submission ---------- */
async function startNewCycle() {
  if (cycleSubmissionState.submitting) return;

  const wallet = getTradeWallet();
  if (!wallet) {
    alert('No wallet selected');
    return;
  }

  const amount = Number(qs('new-cycle-capital')?.value || 0);
  const amountCents = Math.floor(amount * 100);

  if (amountCents < 5000) {
    alert('Minimum cycle is $50');
    return;
  }

  if (amountCents > wallet.balance_cents) {
    alert('Insufficient balance');
    return;
  }

  lockNewCycleUI();
  qs('start-new-cycle-btn').textContent = 'Starting…';

  try {
    await apiFetch('/cycle/start', {
      method: 'POST',
      headers: {
        'Idempotency-Key': crypto.randomUUID()
      },
      body: {
        walletId: wallet.id,
        capitalAmount: amountCents,
        expectedProfit: Math.floor(
          calculateExpectedReturns(amount, selectedDurationMonths) * 100
        ),
        durationMonths: selectedDurationMonths
      }
    });

    await refreshTradeState();

    qs('new-cycle-capital').value = '';
    qs('stake-slider').value = 0;
    recalcCycleSummary();

    showTradeTabContent('overview');

  } catch (err) {
    console.error(err);
    alert('Failed to start cycle');
  } finally {
    unlockNewCycleUI();
    qs('start-new-cycle-btn').textContent = 'Start Cycle';
  }
}

/* ---------- Market Active Cycles Render ---------- */
function renderMarketActiveCycles() {
  const container = qs('market-active-cycles');
  if (!container) return;

  container.innerHTML = '';

  if (!window.__activeCycles.length) {
    container.innerHTML = `
      <p class="text-sm text-white/50 text-center py-4">
        No active trading cycles
      </p>`;
    return;
  }

  window.__activeCycles.forEach(c => {
    const progress = Math.floor(c.progress * 100);

    container.innerHTML += `
      <div class="bg-[#1e1e1e] border border-white/10 rounded-xl p-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span>Capital</span><span>${fmt(c.capital_cents)}</span>
        </div>
        <div class="w-full h-1 bg-white/10 rounded">
          <div class="h-full bg-[#00D2B1]" style="width:${progress}%"></div>
        </div>
        <p class="text-xs text-right">${progress}% complete</p>
      </div>`;
  });
}

/* ---------- Refresh Trade State (After Actions) ---------- */
async function refreshTradeState({ wallet = true, cycles = true } = {}) {
  try {

    if (wallet) {
      await loadWallets();
    }

    if (cycles) {
      await Promise.all([
        loadActiveCycles(),
        loadCompletedCycles()
      ]);
    }

    renderPortfolioSummary();
    renderCycleHistory();
    renderOverviewActiveCycles();
    renderMarketActiveCycles();

    startProfitTicker();

  } catch (err) {
    console.error('Trade state refresh failed:', err);
  }
}





// ======================================================
// 5. BOT ACTIVITY & LIVE PROFIT ENGINE
// ======================================================

/* ---------- Bot Log Definitions ---------- */
const BOT_LOG_LINES = [
  '[SYS] Bot initialized',

  '[SCAN] Volatility window detected',
  '[SCAN] Market conditions sampled',

  '[MODEL] Parameters evaluated',
  '[MODEL] Risk band validated',
  '[MODEL] Signal confidence normalized',

  '[EXEC] Strategy path selected',
  '[EXEC] Contract request submitted',
  '[EXEC] Contract accepted',
  '[EXEC] Exposure opened',

  '[MON] Position monitoring active',
  '[MON] Execution health stable',
  '[MON] Latency within bounds',

  '[EXEC] Exposure reduced',
  '[EXEC] Contract closed',

  '[SETTLE] Cycle stabilized'
];

/* ---------- Bot Log Queue ---------- */
function queueBotLog(c) {
  if (!c.pending_logs) c.pending_logs = [];

  if (Date.now() % 7000 < 1000) {
    const line = BOT_LOG_LINES[c.bot_log_index];

    if (line) {
      c.pending_logs.push(line);
      c.bot_log_index++;
    } else {
      c.bot_log_index = 1;
    }
  }
}

/* ---------- Typing Simulation ---------- */
function typeBotLogs(c) {
  if (!c.pending_logs || !c.pending_logs.length) return;

  if (!c.is_typing) {
    c.typing_line = c.pending_logs.shift();
    c.typing_index = 0;
    c.is_typing = true;
  }

  c.typing_index++;

  if (c.typing_index >= c.typing_line.length) {
    c.bot_logs.push(c.typing_line);
    c.typing_line = '';
    c.is_typing = false;

    if (c.bot_logs.length > 7) {
      c.bot_logs.shift();
    }
  }
}

/* ---------- Bot Terminal Render ---------- */
function renderBotTerminal(c) {
  const el = document.querySelector(
    `[data-bot-terminal="${c.id}"]`
  );
  if (!el) return;

  const lines = [...c.bot_logs];

  if (c.is_typing) {
    lines.push(c.typing_line.slice(0, c.typing_index));
  }

  el.innerHTML = `
    <div class="flex justify-between text-xs text-white/40 mb-1">
      <span>BOT ACTIVITY</span>
      <span>${c.time_left_label}</span>
    </div>

    ${lines.map(l =>
      `<div class="bot-terminal-line">${l}</div>`
    ).join('')}

    <div class="bot-terminal-line text-green-400">▌</div>
  `;
}

/* ---------- Live Profit Ticker ---------- */
let profitTicker = null;

function startProfitTicker() {

  if (profitTicker) {
    clearInterval(profitTicker);
  }

  profitTicker = setInterval(() => {
    const now = Date.now();

    if (!window.__activeCycles.length) {
      stopProfitTicker();
      return;
    }

    window.__activeCycles.forEach(c => {
      const startMs = c.start_at.getTime();
      const endMs   = c.end_at.getTime();

      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        c.progress = 0;
        c.live_profit_cents = 0;
        c.time_left_label = '—';
        return;
      }

      const totalMs = endMs - startMs;
      const elapsedMs = Math.max(0, now - startMs);
      const remainingMs = Math.max(0, endMs - now);

      c.progress = Math.min(1, elapsedMs / totalMs);
      c.live_profit_cents = Math.floor(
        c.expected_profit_cents * c.progress
      );
      c.time_left_label = formatTimeRemaining(remainingMs);
      c.bot_pulse = 40 + Math.floor(Math.random() * 50);

      queueBotLog(c);
      typeBotLogs(c);
      renderBotTerminal(c);
    });

    renderLiveProfitUI();
  }, 1000);
}

function stopProfitTicker() {
  clearInterval(profitTicker);
  profitTicker = null;
}

/* ---------- Live Profit UI ---------- */
function renderLiveProfitUI() {
  const totalLive = window.__activeCycles.reduce(
    (s, c) => s + (c.live_profit_cents || 0),
    0
  );

  const pnlEl = qs('summary-live-profit');
if (pnlEl) pnlEl.textContent = fmt(totalLive);

  window.__activeCycles.forEach(c => {
    const profitEl = document.querySelector(
      `[data-cycle-profit="${c.id}"]`
    );
    if (profitEl) {
      profitEl.textContent = fmt(c.live_profit_cents);
    }

    const bar = document.querySelector(
      `[data-cycle-progress="${c.id}"]`
    );
    if (bar) {
      bar.style.width = `${Math.floor(c.progress * 100)}%`;
    }
  });
}

/* ---------- External Bot Tick Hook (Future) ---------- */
window.onBotTick = function (payload) {
  const cycle = window.__activeCycles.find(
    c => c.id === payload.cycleId
  );
  if (!cycle) return;

  if (typeof payload.profitCents === 'number') {
    cycle.live_profit_cents = payload.profitCents;
  }

  if (typeof payload.progress === 'number') {
    cycle.progress = payload.progress;
  }

  renderLiveProfitUI();
};





// ======================================================
// 6. MARKETS TAB (BINANCE — FINAL STABLE IMPLEMENTATION)
// ======================================================

const MARKET = {
  symbol: 'BTCUSDT',
  interval: '1m',
  chart: null,
  candleSeries: null,
  ws: null,
  lastCandleTime: null
};

// ---------- PRICE STATE ----------
let lastPrice = null;

const priceEl = document.getElementById('live-price');
const priceWrapper = document.getElementById('price-wrapper');
const priceArrow = document.getElementById('price-arrow');

// ======================================================
// INIT / ENTRY
// ======================================================
async function loadMarkets() {
  const tab = qs('trade-content-charts');
  const container = qs('vix75-chart');

  if (!tab || !container) return;

  tab.classList.remove('hidden');

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  resetMarket();
  initChart();

  if (!MARKET.candleSeries) return;

  await loadHistoricalCandles();
  startBinanceWS();
}

// ======================================================
// CLEANUP
// ======================================================
function stopBinanceWS() {
  if (MARKET.ws) {
    MARKET.ws.close();
    MARKET.ws = null;
  }
}

function resetMarket() {
  stopBinanceWS();

  if (MARKET.chart) {
    MARKET.chart.remove();
    MARKET.chart = null;
  }

  MARKET.candleSeries = null;
  MARKET.lastCandleTime = null;
  lastPrice = null;
}

// ======================================================
// CHART INIT (LIGHTWEIGHT CHARTS v4)
// ======================================================
function initChart() {
  const el = qs('vix75-chart');
  const { width, height } = el.getBoundingClientRect();
  if (!width || !height) return;

  MARKET.chart = LightweightCharts.createChart(el, {
    width,
    height,
    layout: {
      background: { color: '#0b0f14' },
      textColor: '#9ca3af',
      fontFamily: 'Inter, system-ui',
      fontSize: 12
    },
    grid: {
      vertLines: { color: 'rgba(255,255,255,0.02)' },
      horzLines: { color: 'rgba(255,255,255,0.04)' }
    },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: true },
    crosshair: { mode: 1 }
  });

  MARKET.candleSeries = MARKET.chart.addSeries(
    LightweightCharts.CandlestickSeries,
    {
      upColor: '#00D2B1',
      downColor: '#ef4444',
      wickUpColor: '#00D2B1',
      wickDownColor: '#ef4444',
      borderVisible: false
    }
  );

  MARKET.chart.timeScale().fitContent();
}

// ======================================================
// PRICE UI
// ======================================================
function updateMarketPrice(price) {
  if (!priceEl) return;

  priceEl.textContent = Number(price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (lastPrice !== null) {
    const up = price > lastPrice;

    priceWrapper.classList.toggle('text-[#00D2B1]', up);
    priceWrapper.classList.toggle('text-red-500', !up);
    priceArrow.textContent = up ? '▲' : '▼';
  }

  lastPrice = price;
}

// ======================================================
// REST — HISTORICAL CANDLES
// ======================================================
async function loadHistoricalCandles() {
  const url =
    `https://api.binance.com/api/v3/klines` +
    `?symbol=${MARKET.symbol}` +
    `&interval=${MARKET.interval}` +
    `&limit=500`;

  const res = await fetch(url);
  const data = await res.json();
  if (!MARKET.candleSeries) return;

  const candles = data.map(k => ({
    time: k[0] / 1000,
    open: +k[1],
    high: +k[2],
    low: +k[3],
    close: +k[4]
  }));

  MARKET.candleSeries.setData(candles);

  const last = candles[candles.length - 1];
  if (last) updateMarketPrice(last.close);

  MARKET.lastCandleTime = last?.time;
  
}





// ======================================================
// WEBSOCKET — LIVE DATA
// ======================================================
function startBinanceWS() {
  stopBinanceWS();

  const ws = new WebSocket(
    `wss://stream.binance.com:9443/ws/${MARKET.symbol.toLowerCase()}@kline_${MARKET.interval}`
  );

  MARKET.ws = ws;

ws.onmessage = (e) => {
  if (!MARKET.candleSeries) return;

  const k = JSON.parse(e.data).k;
  if (!k || k.i !== MARKET.interval) return;

  const time = k.t / 1000;
  const close = +k.c;

  MARKET.lastCandleTime = time;

  MARKET.candleSeries.update({
    time,
    open: +k.o,
    high: +k.h,
    low: +k.l,
    close
  });

  updateMarketPrice(close);
};

}

// ======================================================
// DROPDOWN — ASSET SELECTION (FIXED)
// ======================================================
const assetToggle = qs('asset-toggle');
const assetMenu = qs('asset-menu');
const assetLabel = qs('asset-label');

assetToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  assetMenu.classList.toggle('hidden');
});

assetMenu.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-symbol]');
  if (!btn) return;

  const symbol = btn.dataset.symbol;
  if (symbol === MARKET.symbol) {
    assetMenu.classList.add('hidden');
    return;
  }

  MARKET.symbol = symbol;
  assetLabel.textContent = btn.textContent;
  assetMenu.classList.add('hidden');

  await loadMarkets();
});

document.addEventListener('click', () => {
  assetMenu.classList.add('hidden');
});

// ======================================================
// TIMEFRAME SWITCHING (FIXED)
// ======================================================
document.querySelectorAll('[data-tf]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tf = btn.dataset.tf;
    if (MARKET.interval === tf) return;

    document.querySelectorAll('[data-tf]')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');
    MARKET.interval = tf;

    await loadMarkets();
  });
});



// ======================================================
// RESIZE
// ======================================================
window.addEventListener('resize', () => {
  if (!MARKET.chart) return;
  const el = qs('vix75-chart');
  MARKET.chart.resize(el.clientWidth, el.clientHeight);
});





// ======================================================
// 7. GLOBAL EVENT BINDINGS & INIT
// ======================================================

// ------------------------------
// Trade tab navigation (single source of truth)
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const tradeRoot = document.getElementById('tab-trade');
  if (!tradeRoot) return;

  document
    .querySelectorAll('[data-trade-tab]')
    .forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const tab = btn.dataset.tradeTab;
        if (!tab) return;

        showTradeTabContent(tab);
      });
    });

  // Initial view
  showTradeTabContent('overview');
});


// ------------------------------
// Capital input → live recalculation
// (duration logic lives ONLY in New Cycle section)
// ------------------------------
qs('new-cycle-capital')?.addEventListener('input', () => {
  recalcCycleSummary();
});


// ------------------------------
// Global account mode change
// ------------------------------
document.addEventListener('accountMode:changed', () => {
  refreshTradeState();

  // If user is currently on New Cycle tab, rebind wallet context
  const startTab = qs('trade-content-start');
  if (startTab && !startTab.classList.contains('hidden')) {
    loadStartCycle();
    recalcCycleSummary();
  }
});


// ------------------------------
// Demo reset handler
// ------------------------------
document.addEventListener('demo:reset', () => {
  window.__activeCycles = [];
  window.__completedCycles = [];

  renderPortfolioSummary();
  renderCycleHistory();
  renderOverviewActiveCycles();
});


// ------------------------------
// Delegated stop-cycle handler
// ------------------------------
document.addEventListener('click', async (e) => {

  const btn = e.target.closest('[data-stop-cycle]');
  if (!btn) return;

  const cycleId = btn.dataset.stopCycle;
  if (!cycleId) return;

  const ok = confirm(
    'Stopping this cycle will forfeit all accrued profit.\n\nContinue?'
  );

  if (!ok) return;

  // prevent double submission
  if (btn.disabled) return;

  btn.disabled = true;
  btn.classList.add('opacity-50','cursor-not-allowed');

  try {

    await apiFetch('/cycle/forfeit', {
      method: 'POST',
      body: { cycleId }
    });

    await refreshTradeState();

  } catch (err) {

    console.error('Stop cycle failed:', err);
    alert(err.message || 'Failed to stop cycle');

  } finally {

    btn.disabled = false;
    btn.classList.remove('opacity-50','cursor-not-allowed');

  }

});
