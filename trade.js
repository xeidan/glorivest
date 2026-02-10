'use strict';

// ======================================================
// 1. GLOBAL HELPERS & SHARED STATE
// ======================================================

'use strict';

/* ---------- DOM Helper ---------- */
const qs = (id) => document.getElementById(id);

/* ---------- Auth Helper ---------- */
function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

/* ---------- Formatting ---------- */
function fmt(cents) {
  const value = (Number(cents || 0) / 100).toFixed(2);

  return window.__accountMode === 'DEMO'
    ? `$${Number(value).toLocaleString()}`
    : `$${value}`;
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Completed';

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
  const tabs = ['overview', 'start', 'charts', 'transfer'];

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

    case 'transfer':
      loadTransferTab();
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
          .map(c =>
            normalizeCycle({
              ...c,
              wallet_type: wallet.type
            })
          )
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

  const totalMs = end.getTime() - start.getTime();
  const elapsedMs = Math.max(0, Date.now() - start.getTime());

  const progress =
    totalMs > 0 ? Math.min(1, elapsedMs / totalMs) : 0;

  return {
    id: c.id,
    wallet_id: c.wallet_id,
    wallet_type: c.wallet_type || 'REAL',

    capital_cents: Number(c.capital_cents || 0),

    expected_profit_cents: Math.floor(
      Number(c.capital_cents || 0) *
      Number(c.expected_return_pct || 0) / 100
    ),

    realized_profit_cents: Number(c.realized_profit_cents || 0),

    start_at: start,
    end_at: end,

    duration_months: Number(c.duration_months || 1),

    progress,
    live_profit_cents: 0,

    total_days: Number(c.total_days ?? 0),
    elapsed_days: Number(c.elapsed_days ?? 0),
    remaining_days: Number(c.remaining_days ?? 0),

    // Bot terminal state
    bot_logs: [],
    bot_log_index: 0,
    pending_logs: [],
    typing_line: '',
    typing_index: 0,
    is_typing: false,

    time_left_label: '',

    status: (c.status || 'RUNNING').toUpperCase()
  };
}

/* ---------- Overview Loader ---------- */
async function loadTradeOverview() {
  await Promise.all([
    loadActiveCycles(),
    loadCompletedCycles()
  ]);

  renderActiveCapital();
  renderRealizedProfit();
  renderCycleHistory();
}

/* ---------- Summary Metrics ---------- */
function renderActiveCapital() {
  const active = getModeFilteredCycles(window.__activeCycles);

  const total = active.reduce(
    (sum, c) => sum + c.capital_cents,
    0
  );

  qs('summary-total-capital').textContent = fmt(total);
}

function renderRealizedProfit() {
  const completed = getModeFilteredCycles(window.__completedCycles);

  const total = completed.reduce(
    (sum, c) => sum + c.realized_profit_cents,
    0
  );

  qs('summary-total-earnings').textContent = fmt(total);
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
    list.insertAdjacentHTML('beforeend', `
      <div class="bg-[#1e1e1e] border border-white/10 rounded-xl p-4">

        <div class="flex justify-between items-center">
          <span class="text-sm text-white/70">
            ${c.total_days} Day Cycle
          </span>
          <span class="font-bold text-[#00D2B1]">
            +${fmt(c.realized_profit_cents)}
          </span>
        </div>

        <div class="flex justify-between text-xs text-white/40 mt-1">
          <span>Capital: ${fmt(c.capital_cents)}</span>
          <span>${c.end_at.toLocaleString()}</span>
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
        No active cycles in this account
      </div>
    `;
    return;
  }

  active.forEach(c => {
    const progress = Math.min(
      100,
      Math.floor((c.elapsed_days / c.total_days) * 100)
    );

    container.insertAdjacentHTML('beforeend', `
      <div class="bg-[#1e1e1e] border border-white/10 rounded-2xl p-5 space-y-4">

        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex gap-2">
            <span class="text-xs px-2 py-1 rounded bg-white/10">
              ${c.wallet_type === 'REAL' ? 'LIVE' : 'DEMO'}
            </span>
            <span class="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-semibold">
              RUNNING
            </span>
          </div>
          <span class="text-xs text-white/40">
            Started ${c.start_at.toLocaleString()}
          </span>
        </div>

        <!-- Capital -->
        <div class="flex justify-between items-center text-sm">
          <span class="text-white/60">Capital</span>
          <span class="font-bold">${fmt(c.capital_cents)}</span>
        </div>

        <!-- Expected Profit -->
        <div class="flex justify-between items-center text-sm">
          <span class="text-white/60">Expected Profit</span>
          <span class="font-mono text-green-400">
            +${fmt(c.expected_profit_cents)}
          </span>
        </div>

        <!-- Progress -->
        <div class="space-y-1">
          <div class="w-full h-2 bg-white/10 rounded overflow-hidden">
            <div
              class="h-full bg-[#00D2B1] transition-all duration-700"
              style="width:${progress}%">
            </div>
          </div>
          <div class="flex justify-between text-xs text-white/40">
            <span>${c.elapsed_days} days elapsed</span>
            <span>${c.remaining_days} days left</span>
          </div>
        </div>

        <!-- Bot Activity Terminal -->
        <div class="bot-terminal mt-3" data-bot-terminal="${c.id}">
          <div class="flex justify-between text-xs text-white/40 mb-1">
            <span>BOT ACTIVITY</span>
            <span>${c.time_left_label}</span>
          </div>

          ${c.bot_logs.map(l =>
            `<div class="bot-terminal-line">${l}</div>`
          ).join('')}

          <div class="bot-terminal-line text-green-400">▌</div>
        </div>

        <div class="w-full h-1 bg-white/10 rounded overflow-hidden mt-2">
          <div
            class="h-full bg-purple-400 transition-all duration-700"
            style="width:${c.bot_pulse}%">
          </div>
        </div>

        <!-- Stop Action -->
        <button
          data-stop-cycle="${c.id}"
          class="w-full mt-2 py-2 rounded-lg
                 border border-red-500/40 text-red-400 text-sm
                 hover:bg-red-500/10 transition">
          Stop Cycle (Forfeit Profit)
        </button>

      </div>
    `);
  });
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
    else if (amount < 5000) rate = 1.35;
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
}

/* ---------- Duration Button Handling ---------- */
document.querySelectorAll('.duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document
      .querySelectorAll('.duration-btn')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    selectedDurationMonths = Number(btn.dataset.months);

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
    const progress = Math.floor(
      (c.elapsed_days / c.total_days) * 100
    );

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

    renderActiveCapital();
    renderRealizedProfit();
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
  if (profitTicker) return;

  profitTicker = setInterval(() => {
    const now = Date.now();

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

  qs('summary-total-earnings').textContent = fmt(totalLive);

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

  if (!tab || !container || tab.classList.contains('hidden')) return;

  resetMarket();
  initChart();

  if (!MARKET.candleSeries) return;

  await loadHistoricalCandles(); // REST first
  startBinanceWS();              // WS after
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
// 7. TRANSFER TAB
// ======================================================

function loadTransferTab() {
  const cycles = Array.isArray(window.__completedCycles)
    ? window.__completedCycles
    : [];

  // Sum withdrawable profits (display only)
  const profits = cycles.reduce(
    (sum, c) => sum + Number(c.realized_profit_cents || 0),
    0
  );

  // Available profits
  const profitEl = qs('withdrawable-bot-earnings-display');
  if (profitEl) {
    profitEl.textContent = fmt(profits);
  }

  // Projected wallet balance (display only)
  const wallet = getTradeWallet();
  const currentBalance = wallet ? Number(wallet.balance_cents || 0) : 0;

  const projectedEl = qs('projected-main-wallet-balance');
  if (projectedEl) {
    projectedEl.textContent = fmt(currentBalance + profits);
  }

  // Enable / disable transfer button
  const btn = qs('transfer-bot-earnings-btn');
  if (btn) {
    const disabled = profits <= 0;
    btn.disabled = disabled;
    btn.classList.toggle('opacity-50', disabled);
    btn.classList.toggle('cursor-not-allowed', disabled);
  }
}




/* ---------- Transfer Profits Handler ---------- */
async function transferProfits() {
  const btn = qs('transfer-bot-earnings-btn');
  if (!btn) return;

  const token = getAuthToken();
  if (!token) {
    alert('Not authenticated');
    return;
  }

  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');

  try {
    const res = await fetch(`${API_BASE}/transfer/profits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      alert(data.error || 'Transfer failed');
      return;
    }

    alert(`Transferred ${fmt(data.transferred)} successfully`);

    // non-fatal UI refresh
    await Promise.allSettled([
      loadWallet(),
      loadCompletedCycles()
    ]);

    loadTransferTab();

  } catch (err) {
    console.error(err);
    alert('Network error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}





// Wire button
const transferBtn = qs('transfer-bot-earnings-btn');
if (transferBtn) {
  transferBtn.addEventListener('click', transferProfits);
}





// ======================================================
// 8. GLOBAL EVENT BINDINGS & INIT
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

  renderActiveCapital();
  renderRealizedProfit();
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

  try {
    await apiFetch('/cycle/forfeit', {
      method: 'POST',
      body: { cycleId }
    });

    await refreshTradeState();
  } catch (err) {
    console.error('Stop cycle failed:', err);
    alert('Failed to stop cycle');
  }
});
