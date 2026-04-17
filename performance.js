// performance.js — Mirrors Trade Engine + Real Backend Positions
(function () {
  'use strict';

  const els = {
    section: document.getElementById('tab-performance'),
    summary: document.getElementById('perf-summary'),
    chart: document.getElementById('perf-chart'),
    tbody: document.getElementById('perf-tbody')
  };

  let chartInstance = null;
  let lineSeries = null;
  let perfInterval = null;
  let tableLoaded = false;

  /* ============================================
     MODE + CYCLE ACCESS (Mirror Trade Tab)
  ============================================ */

  function getMode() {
    return window.__accountMode === 'DEMO' ? 'DEMO' : 'REAL';
  }

  function getCycles() {
    const mode = getMode();

    const active = (window.__activeCycles || [])
      .filter(c => c.wallet_type === mode);

    const completed = (window.__completedCycles || [])
      .filter(c => c.wallet_type === mode);

    return { active, completed };
  }

  function fmt(n) {
    return Number(n || 0).toFixed(2);
  }

  /* ============================================
     SIMULATED TOTAL PNL (Same Logic as Trade)
  ============================================ */

  function computeSimulatedTotal() {
    const { active, completed } = getCycles();

    let total = 0;

    // Completed cycles use realized profit
    completed.forEach(c => {
      total += Number(c.realized_profit_cents || 0);
    });

    // Active cycles use progress simulation
    active.forEach(c => {
      const expected = Number(c.expected_profit_cents || 0);
      const progress = Number(c.progress || 0);
      total += Math.floor(expected * progress);
    });

    return total / 100;
  }

  /* ============================================
     SUMMARY RENDER
  ============================================ */

  function renderSummary() {
    if (!els.summary) return;

    const total = computeSimulatedTotal();

    els.summary.innerHTML = `
      <div class="rounded-3xl border border-white/10 bg-[#121212] p-5">
        <div class="text-white/60 text-xs">Bot PnL</div>
        <div class="text-emerald-400 text-lg font-bold">
          $${fmt(total)}
        </div>
      </div>
    `;
  }

  /* ============================================
     EQUITY CURVE (Mirror Growth)
  ============================================ */

function buildEquityCurve(trades) {
  if (!Array.isArray(trades) || trades.length === 0) return [];

  const closed = trades
    .filter(t => t.status === 'CLOSED')
    .sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at));

  if (!closed.length) return [];

  let cumulative = 0;

  return closed.map(t => {
    const pnl =
      t.side === 'LONG'
        ? (t.exit_price - t.entry_price) * t.size
        : (t.entry_price - t.exit_price) * t.size;

    cumulative += Number(pnl);

    return {
      time: Math.floor(new Date(t.opened_at).getTime() / 1000),
      value: Number(cumulative.toFixed(4))
    };
  });
}



  function initChart() {
    if (!els.chart) return;

    chartInstance = LightweightCharts.createChart(els.chart, {
      layout: {
        background: { color: '#1e1e1e' },
        textColor: '#aaa'
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' }
      },
      width: els.chart.clientWidth,
      height: 300
    });

    lineSeries = chartInstance.addSeries(
      LightweightCharts.LineSeries,
      {
        color: '#00d2b1',
        lineWidth: 3
      }
    );

    chartInstance.timeScale().fitContent();
  }

function renderChart(trades) {
  if (!els.chart) return;

  const data = buildEquityCurve(trades);
  if (!data.length) return;

  if (!chartInstance) {
    chartInstance = LightweightCharts.createChart(els.chart, {
      layout: {
        background: { color: '#1e1e1e' },
        textColor: '#aaa'
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' }
      },
      width: els.chart.clientWidth,
      height: 300
    });

    lineSeries = chartInstance.addLineSeries({
      color: '#00d2b1',
      lineWidth: 3
    });
  }

  lineSeries.setData(data);
  chartInstance.timeScale().fitContent();
}



  /* ============================================
     BACKEND POSITIONS TABLE (REAL DATA)
  ============================================ */
async function loadPositions() {
  if (tableLoaded) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  const tbody = document.getElementById('perf-tbody');
  const cards = document.getElementById('perf-cards');

  try {
    const res = await fetch(`${window.API_BASE}/performance`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed');

    const json = await res.json();

    const rows =
      Array.isArray(json) ? json :
      Array.isArray(json.data) ? json.data :
      Array.isArray(json.positions) ? json.positions :
      [];

    window.__perfTrades = rows;

    if (!rows.length) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="px-4 py-8 text-center text-white/40">
              No performance data yet.
            </td>
          </tr>
        `;
      }

      if (cards) {
        cards.innerHTML = `
          <div class="rounded-3xl border border-white/10 bg-[#121212] p-5 text-center text-white/40">
            No performance data yet.
          </div>
        `;
      }

      return;
    }

    /* DESKTOP TABLE */
    if (tbody) {
      tbody.innerHTML = rows.map(p => {
        const pnl = Number(p.pnl || 0);
        const win = pnl >= 0;

        return `
          <tr class="border-t border-white/5">
            <td class="px-4 py-3 text-xs text-white/55 whitespace-nowrap">
              ${new Date(p.opened_at).toLocaleString()}
            </td>

            <td class="px-4 py-3 text-white font-medium">${p.symbol}</td>

            <td class="px-4 py-3 ${p.side === 'LONG' ? 'text-[#00D2B1]' : 'text-rose-400'}">
              ${p.side}
            </td>

            <td class="px-4 py-3 text-right text-white/80">
              ${Number(p.size).toFixed(4)}
            </td>

            <td class="px-4 py-3 text-right text-white/80">
              ${Number(p.entry_price).toFixed(2)}
            </td>

            <td class="px-4 py-3 text-right text-white/80">
              ${p.exit_price ? Number(p.exit_price).toFixed(2) : '—'}
            </td>

            <td class="px-4 py-3 text-right font-semibold ${win ? 'text-[#00D2B1]' : 'text-rose-400'}">
              ${pnl.toFixed(2)}
            </td>

            <td class="px-4 py-3 text-white/55">
              ${p.status}
            </td>
          </tr>
        `;
      }).join('');
    }

    /* MOBILE CARDS */
    if (cards) {
      cards.innerHTML = rows.map(p => {
        const pnl = Number(p.pnl || 0);
        const win = pnl >= 0;

        return `
          <div class="rounded-3xl border border-white/10 bg-[#121212] p-5 space-y-4">

            <div class="flex items-start justify-between gap-3">

              <div class="min-w-0">
                <h3 class="text-xl font-semibold text-white truncate">
                  ${p.symbol}
                </h3>

                <p class="text-xs text-white/40 mt-1">
                  ${new Date(p.opened_at).toLocaleString()}
                </p>
              </div>

              <span class="px-3 h-8 inline-flex items-center rounded-full text-xs font-semibold ${
                p.side === 'LONG'
                  ? 'bg-[#00D2B1]/15 text-[#00D2B1]'
                  : 'bg-rose-500/15 text-rose-400'
              }">
                ${p.side}
              </span>

            </div>

            <div class="grid grid-cols-2 gap-x-6 gap-y-4">

              <div>
                <p class="text-[11px] uppercase tracking-wide text-white/35">Entry</p>
                <p class="mt-1 text-white">${Number(p.entry_price).toFixed(2)}</p>
              </div>

              <div>
                <p class="text-[11px] uppercase tracking-wide text-white/35">Exit</p>
                <p class="mt-1 text-white">
                  ${p.exit_price ? Number(p.exit_price).toFixed(2) : '—'}
                </p>
              </div>

              <div>
                <p class="text-[11px] uppercase tracking-wide text-white/35">Size</p>
                <p class="mt-1 text-white">${Number(p.size).toFixed(4)}</p>
              </div>

              <div>
                <p class="text-[11px] uppercase tracking-wide text-white/35">Status</p>
                <p class="mt-1 text-white">${p.status}</p>
              </div>

            </div>

            <div class="pt-4 border-t border-white/5 flex items-center justify-between">

              <span class="text-sm font-semibold ${
                win ? 'text-[#00D2B1]' : 'text-rose-400'
              }">
                ${win ? 'WIN' : 'LOSS'}
              </span>

              <span class="text-base font-bold ${
                win ? 'text-[#00D2B1]' : 'text-rose-400'
              }">
                ${win ? '+' : ''}${pnl.toFixed(2)}
              </span>

            </div>

          </div>
        `;
      }).join('');
    }

    tableLoaded = true;
    sync();

  } catch (err) {
    console.error('Position load failed:', err);
  }
}


  /* ============================================
     SYNC ENGINE
  ============================================ */

  function sync() {
  renderSummary();

  if (Array.isArray(window.__perfTrades)) {
    renderChart(window.__perfTrades);
  }
}


  function startSync() {
    if (perfInterval) return;
    perfInterval = setInterval(sync, 1000);
  }

  function stopSync() {
    clearInterval(perfInterval);
    perfInterval = null;
  }

  /* ============================================
     INIT WHEN TAB OPENS
  ============================================ */

  if (els.section) {
    const observer = new MutationObserver(() => {
      if (!els.section.classList.contains('hidden')) {

        if (!chartInstance) initChart();

        sync();
        loadPositions();
        startSync();

      } else {
        stopSync();
      }
    });

    observer.observe(els.section, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  document.addEventListener('accountMode:changed', () => {
    tableLoaded = false;
    loadPositions();
    sync();
  });

})();
