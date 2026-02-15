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
      <div class="bg-black/40 p-4 rounded-lg">
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
  if (!els.tbody || tableLoaded) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${window.API_BASE}/performance`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed');

    const json = await res.json();

    // 🔥 HANDLE REAL RESPONSE SHAPE
    const rows =
      Array.isArray(json) ? json :
      Array.isArray(json.data) ? json.data :
      Array.isArray(json.positions) ? json.positions :
      [];
window.__perfTrades = rows;

    if (!rows.length) {
      els.tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-4 text-center text-white/60">
            No performance data yet.
          </td>
        </tr>
      `;
      return;
    }

    els.tbody.innerHTML = rows.map(p => `
      <tr class="hover:bg-black/20 transition">
        <td class="p-4 text-xs text-white/80">
          ${new Date(p.opened_at).toLocaleString()}
        </td>
        <td class="p-4 text-white/90">${p.symbol}</td>
        <td class="p-4 text-white/90">${p.side}</td>
        <td class="text-right p-4 text-white/90">
          ${Number(p.size).toFixed(4)}
        </td>
        <td class="text-right p-4 text-white/90">
          ${Number(p.entry_price).toFixed(2)}
        </td>
        <td class="text-right p-4 text-white/90">
          ${p.exit_price ? Number(p.exit_price).toFixed(2) : '—'}
        </td>
        <td class="p-4 font-semibold ${
          Number(p.pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }">
          ${Number(p.pnl) >= 0 ? 'WIN' : 'LOSS'}
        </td>

        <td class="p-4 text-white/70">${p.status}</td>
      </tr>
    `).join('');

    tableLoaded = true;

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
