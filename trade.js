(() => {
  'use strict';

  /***** === Config (scoped) === *****/
  const API_BASE = "https://glorivest-api-a16f75b6b330.herokuapp.com";
  const WS_URL   = "wss://ws.binaryws.com/websockets/v3?app_id=1089";
  const TICKS    = "R_75";

  /***** === State === *****/
  // bot/progress
  let lastTickPrice = 0;
  let botRunning = localStorage.getItem('botRunning') === 'true';
  let capital = parseFloat(localStorage.getItem('capital')) || 0;
  let startTime = parseInt(localStorage.getItem('botStartTime')) || null;
  const totalSeconds = 30 * 24 * 60 * 60;
  let targetProfit = capital * 0.2;
  let tradeInterval = null;

  // chart data
  const prices = [];   // numbers
  const times  = [];   // timestamps (ms)
  let hoverX = null;
  let zoomLevel = 1;       // >=1  (1 = show all)
  let scrollOffset = 0;    // points from end
  let needsRedraw = true;
  let rafId = null;

  // WS
  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 2000;

  /***** === DOM === *****/
  const $ = (id) => document.getElementById(id);

  const botCapital         = $('bot-capital');
  const botProfit          = $('bot-profit');
  const botDays            = $('bot-days');
  const botProgress        = $('bot-progress');
  const botProgressLabel   = $('bot-progress-label');
  const botLoopProgress    = $('bot-loop-progress');
  const botActionLabel     = $('bot-action-label');
  const startBotBtn        = $('start-bot');
  const stopBotBtn         = $('stop-bot');
  const stopModal          = $('stop-modal');
  const cancelStop         = $('cancel-stop');
  const confirmStop        = $('confirm-stop');

  const vix75PriceTrade    = $('vix75-price-trade');
  const vix75PriceInline   = $('vix75-price-inline');

  const tradeSection       = $('tab-trade');
  const wrap               = $('vix-chart-wrap');   // square wrapper
  const canvas             = $('vix75-sparkline');
  const ctx                = canvas.getContext('2d');

  /***** === Chart layout === *****/
  const PAD_L = 8;
  const PAD_T = 8;
  const PAD_B = 18;
  const AXIS_R = 56;

  /***** === Sizing / HiDPI === *****/
  function resizeCanvas() {
    const rect = wrap.getBoundingClientRect();
    let cssW = rect.width;
    let cssH = rect.height;
    if (!cssW || !cssH) {
      // fallbacks if hidden momentarily
      const cs = getComputedStyle(wrap);
      cssW = parseFloat(cs.width) || 300;
      cssH = parseFloat(cs.height) || cssW; // keep it square
    }
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    needsRedraw = true;
    requestRedraw();
  }
  window.addEventListener('resize', resizeCanvas);

  // When the Trade tab becomes visible, re-measure & redraw
  if (tradeSection) {
    const visObs = new MutationObserver(() => {
      if (!tradeSection.classList.contains('hidden')) {
        setTimeout(resizeCanvas, 0);
      }
    });
    visObs.observe(tradeSection, { attributes: true, attributeFilter: ['class'] });
  }

  /***** === Bot progress === *****/
  function updateBotState() {
    targetProfit = capital * 0.2;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = startTime ? now - startTime : 0;
    const progress = Math.min(elapsed / totalSeconds, 1);
    const profit = progress * targetProfit;
    const projectedCapital = capital + profit;
    const daysPassed = Math.floor(progress * 30);

    if (botCapital) botCapital.textContent = `$${projectedCapital.toFixed(2)}`;
    if (botProfit)  botProfit.textContent  = `$${profit.toFixed(2)}`;
    if (botDays)    botDays.textContent    = daysPassed;
    if (botProgress) botProgress.style.width = `${(progress * 100).toFixed(1)}%`;
    if (botProgressLabel) botProgressLabel.textContent = `${(progress * 100).toFixed(1)}%`;

    if (progress >= 1) {
      botRunning = false;
      localStorage.setItem('botRunning', 'false');
      if (startBotBtn) {
        startBotBtn.disabled = true;
        startBotBtn.innerHTML = '<i class="fas fa-check"></i> <span>Completed</span>';
      }
    }
  }
  function animateCapital() {
    const interval = setInterval(() => {
      if (!botRunning) return clearInterval(interval);
      updateBotState();
    }, 60000);
  }
  function loopContractAnimation() {
    const stages = ['Buying Contract', 'Contract Bought', 'Contract Closed'];
    let i = 0;
    setInterval(() => {
      if (!botRunning) return;
      if (botActionLabel) botActionLabel.textContent = stages[i % 3];
      if (botLoopProgress) botLoopProgress.style.width = `${((i % 3) + 1) * 33.33}%`;
      i++;
    }, 1000);
  }

  /***** === WebSocket (with reconnection) === *****/
  function openWs() {
    closeWs();
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      reconnectDelay = 2000;
      ws.send(JSON.stringify({ ticks: TICKS, subscribe: 1 }));
    };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const price = parseFloat(data?.tick?.quote);
        if (!isFinite(price)) return;

        lastTickPrice = price;
        const label = `$${price.toFixed(2)}`;
        if (vix75PriceTrade)  vix75PriceTrade.textContent = label;
        if (vix75PriceInline) vix75PriceInline.textContent = label;

        prices.push(price);
        times.push(Date.now());
        if (prices.length > 2000) { prices.shift(); times.shift(); }

        needsRedraw = true;
        requestRedraw();
      } catch (_) {}
    };
    ws.onerror = handleWsClose;
    ws.onclose = handleWsClose;
  }
  function handleWsClose() {
    closeWs();
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
      openWs();
    }, reconnectDelay);
  }
  function closeWs() {
    if (ws) {
      try { ws.close(); } catch {}
      ws = null;
    }
  }

  /***** === Chart helpers === *****/
  function visibleSlice() {
    const count = Math.max(2, Math.floor(prices.length / zoomLevel));
    const maxOffset = Math.max(0, prices.length - count);
    scrollOffset = Math.min(Math.max(scrollOffset, 0), maxOffset);
    const start = Math.max(0, prices.length - count - scrollOffset);
    const end   = Math.max(start + 1, prices.length - scrollOffset);
    return { start, end };
  }
  function minMax(arr) {
    if (!arr.length) return { min: 0, max: 1 };
    let min = Infinity, max = -Infinity;
    for (const v of arr) { if (v < min) min = v; if (v > max) max = v; }
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.05;
    return { min: min - pad, max: max + pad };
  }
  function requestRedraw() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!needsRedraw) return;
      needsRedraw = false;
      drawChart();
    });
  }

  /***** === Draw chart === *****/
  function drawChart() {
    const cssW = canvas.clientWidth  || parseFloat(getComputedStyle(canvas).width)  || 300;
    const cssH = canvas.clientHeight || parseFloat(getComputedStyle(canvas).height) || cssW;

    ctx.clearRect(0, 0, cssW + 1, cssH + 1);

    const chartW = Math.max(10, cssW - PAD_L - AXIS_R);
    const chartH = Math.max(10, cssH - PAD_T - PAD_B);

    const { start, end } = visibleSlice();
    const data  = prices.slice(start, end);
    const tms   = times.slice(start, end);

    if (data.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.fillText('Waiting for live data…', PAD_L + 8, PAD_T + 20);
      return;
    }

    const { min, max } = minMax(data);
    const range = max - min || 1;
    const stepX = chartW / (data.length - 1);
    const toX = i => PAD_L + i * stepX;
    const toY = v => PAD_T + (max - v) / range * chartH;

    // grid (horizontal)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + (chartH / 4) * i;
      ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y);
    }
    ctx.stroke();

    // right-side price labels
    ctx.fillStyle = '#ddd';
    ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = PAD_T + (chartH / 4) * i;
      const priceLevel = max - (range / 4) * i;
      ctx.fillText(priceLevel.toFixed(2), PAD_L + chartW + AXIS_R - 8, y);
    }

    // price line
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00D2B1';
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = toX(i);
      const y = toY(data[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // gradient fill
    const g = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
    g.addColorStop(0, 'rgba(0,210,177,0.30)');
    g.addColorStop(1, 'rgba(0,210,177,0.00)');
    ctx.lineTo(PAD_L + chartW, PAD_T + chartH);
    ctx.lineTo(PAD_L, PAD_T + chartH);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    // live price dashed line + tag on right
    const latest = data[data.length - 1];
    const latestY = toY(latest);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD_L, latestY);
    ctx.lineTo(PAD_L + chartW, latestY);
    ctx.stroke();
    ctx.setLineDash([]);

    const tagX = PAD_L + chartW + AXIS_R - 8;
    const tagW = 60, tagH = 20;
    const tagY = Math.max(PAD_T + tagH/2, Math.min(latestY, PAD_T + chartH - tagH/2));
    drawTag(tagX - tagW, tagY - tagH/2, tagW, tagH, 8, '#00D2B1', '#000');
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(`$${latest.toFixed(2)}`, tagX - tagW/2, tagY);

    // x-axis time labels (sparse)
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '10px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    const every = Math.max(1, Math.floor(data.length / 6));
    for (let i = 0; i < data.length; i += every) {
      const x = toX(i);
      const t = tms[i];
      const label = t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${i}s`;
      ctx.fillText(label, x, PAD_T + chartH + 12);
    }

    // hover crosshair + tooltip
    if (hoverX != null) {
      const xClamped = Math.max(PAD_L, Math.min(PAD_L + chartW, hoverX));
      const idx = Math.round((xClamped - PAD_L) / stepX);
      const val = data[idx];
      if (val != null) {
        const x = toX(idx);
        const y = toY(val);
        // crosshair
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + chartH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y); ctx.stroke();
        ctx.setLineDash([]);
        // dot
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
        // tooltip
        const ts = tms[idx] ? new Date(tms[idx]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
        const tip = `$${val.toFixed(2)}  ${ts}`;
        const tw = ctx.measureText(tip).width + 14;
        const th = 22;
        let tx = x + 10, ty = y - (th + 10);
        if (tx + tw > PAD_L + chartW) tx = x - tw - 10;
        if (ty < PAD_T) ty = y + 10;
        drawTag(tx, ty, tw, th, 8, '#111', '#00D2B1');
        ctx.fillStyle = '#e7fffa';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.fillText(tip, tx + 7, ty + th/2);
      }
    }

    function drawTag(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }

  /***** === Interactions === *****/
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    hoverX = e.clientX - rect.left;
    needsRedraw = true; requestRedraw();
  });
  canvas.addEventListener('mouseleave', () => {
    hoverX = null; needsRedraw = true; requestRedraw();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (prices.length < 3) return;

    const rect = canvas.getBoundingClientRect();
    const cssW = canvas.clientWidth || 300;
    const chartW = Math.max(10, cssW - PAD_L - AXIS_R);
    const x = Math.max(PAD_L, Math.min(PAD_L + chartW, e.clientX - rect.left));

    const { start, end } = visibleSlice();
    const visibleLen = end - start;
    const anchorRatio = (x - PAD_L) / chartW;
    const prevVisible = visibleLen;

    if (e.deltaY < 0 && zoomLevel < 8)  zoomLevel = Math.min(8,  zoomLevel + 0.12);
    if (e.deltaY > 0 && zoomLevel > 1)  zoomLevel = Math.max(1,  zoomLevel - 0.12);

    const { start: ns, end: ne } = visibleSlice();
    const newVisible = ne - ns;
    scrollOffset += (newVisible - prevVisible) * (1 - anchorRatio);

    needsRedraw = true; requestRedraw();
  });
  canvas.addEventListener('mousedown', (e) => {
    const startX = e.clientX;
    function onMove(ev) {
      const dx = ev.clientX - startX;
      scrollOffset += Math.round(-dx / 8); // pan left/right
      needsRedraw = true; requestRedraw();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  /***** === Backend posting (positions) === *****/
  async function postClosedTrade({ side, qty, entry, exit }) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const fees = (Math.abs(entry * qty) + Math.abs(exit * qty)) * 0.001;
    let pnl = (side === 'BUY') ? (exit - entry) * qty : (entry - exit) * qty;
    pnl = Math.round(pnl * 100) / 100;

    const closedAt = new Date();
    const openedAt = new Date(closedAt.getTime() - 20_000);
    try {
      await fetch(`${API_BASE}/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: 'VIX75', side, qty,
          entry_price: entry, exit_price: exit, pnl, fees,
          status: 'CLOSED', opened_at: openedAt.toISOString(), closed_at: closedAt.toISOString(),
          strategy: 'AI_BOT_V1'
        })
      });
      document.dispatchEvent(new CustomEvent('positions:refresh'));
    } catch (e) {
      console.error('Failed to post trade:', e);
    }
  }

  /***** === Bot controls === *****/
  function startTradeLoop() {
    if (tradeInterval) return;
    tradeInterval = setInterval(() => {
      if (!botRunning || !lastTickPrice) return;
      const side  = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const qty   = 1;
      const entry = lastTickPrice;
      const drift = entry * (Math.random() * 0.005); // up to 0.5%
      const exit  = side === 'BUY' ? (entry + drift) : (entry - drift);
      postClosedTrade({ side, qty, entry, exit });
    }, 20_000);
  }
  function stopTradeLoop() {
    if (tradeInterval) {
      clearInterval(tradeInterval);
      tradeInterval = null;
    }
  }

  if (startBotBtn) {
    startBotBtn.addEventListener('click', () => {
      if (capital <= 0) return alert('Deposit first to start earning.');
      if (!botRunning) {
        botRunning = true;
        startTime = Math.floor(Date.now() / 1000);
        localStorage.setItem('botRunning', 'true');
        localStorage.setItem('botStartTime', startTime);
        animateCapital();
        loopContractAnimation();
        startBotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running</span>';
        if (stopBotBtn) stopBotBtn.classList.remove('hidden');
        startTradeLoop();
      }
    });
  }

  if (stopBotBtn) stopBotBtn.addEventListener('click', () => stopModal?.classList.remove('hidden'));
  if (cancelStop)  cancelStop.addEventListener('click', () => stopModal?.classList.add('hidden'));
  if (confirmStop) confirmStop.addEventListener('click', () => {
    botRunning = false;
    localStorage.setItem('botRunning', 'false');
    localStorage.removeItem('botStartTime');
    stopTradeLoop();
    stopModal?.classList.add('hidden');
    location.reload();
  });

  /***** === Init === *****/
  resizeCanvas();     // size once (even if tab initially hidden)
  openWs();           // open websocket

  updateBotState();
  if (botRunning) {
    animateCapital();
    loopContractAnimation();
    if (startBotBtn) startBotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running</span>';
    if (stopBotBtn)  stopBotBtn.classList.remove('hidden');
    startTradeLoop();
  }
})();
