// trade.js - Enhanced chart with zoom, scroll, axis, tooltip, and live price line

let botRunning = localStorage.getItem('botRunning') === 'true';
let capital = parseFloat(localStorage.getItem('capital')) || 0;
let startTime = parseInt(localStorage.getItem('botStartTime')) || null;
const totalSeconds = 30 * 24 * 60 * 60;
let targetProfit = capital * 0.2;
let targetCapital = capital + targetProfit;

const botCapital = document.getElementById('bot-capital');
const botProfit = document.getElementById('bot-profit');
const botDays = document.getElementById('bot-days');
const botProgress = document.getElementById('bot-progress');
const botProgressLabel = document.getElementById('bot-progress-label');
const botLoopProgress = document.getElementById('bot-loop-progress');
const botActionLabel = document.getElementById('bot-action-label');
const startBotBtn = document.getElementById('start-bot');
const stopBotBtn = document.getElementById('stop-bot');
const stopModal = document.getElementById('stop-modal');
const cancelStop = document.getElementById('cancel-stop');
const confirmStop = document.getElementById('confirm-stop');
const vix75PriceTrade = document.getElementById('vix75-price-trade');
const vix75PriceInline = document.getElementById('vix75-price-inline');
const sparklineCanvas = document.getElementById('vix75-sparkline');
const ctx = sparklineCanvas.getContext('2d');
const sparklineData = [];
let hoverX = null;
let zoomLevel = 1;
let scrollOffset = 0;

function updateBotState(currentCapital = capital) {
  targetProfit = capital * 0.2;
  targetCapital = capital + targetProfit;
  const now = Math.floor(Date.now() / 1000);
  const elapsed = startTime ? now - startTime : 0;
  const progress = Math.min(elapsed / totalSeconds, 1);
  const profit = progress * targetProfit;
  const projectedCapital = capital + profit;
  const daysPassed = Math.floor(progress * 30);

  botCapital.textContent = `$${projectedCapital.toFixed(2)}`;
  botProfit.textContent = `$${profit.toFixed(2)}`;
  botDays.textContent = daysPassed;
  botProgress.style.width = `${(progress * 100).toFixed(1)}%`;
  botProgressLabel.textContent = `${(progress * 100).toFixed(1)}%`;

  if (progress >= 1) {
    botRunning = false;
    localStorage.setItem('botRunning', 'false');
    startBotBtn.disabled = true;
    startBotBtn.innerHTML = '<i class="fas fa-check"></i> <span>Completed</span>';
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
    botActionLabel.textContent = stages[i % 3];
    botLoopProgress.style.width = `${((i % 3) + 1) * 33.33}%`;
    i++;
  }, 1000);
}

function drawSparkline() {
  const price = parseFloat(vix75PriceTrade.textContent.replace('$', '')) || 0;
  sparklineData.push(price);
  if (sparklineData.length > 500) sparklineData.shift();

  ctx.clearRect(0, 0, sparklineCanvas.width, sparklineCanvas.height);
  const visibleCount = Math.floor(sparklineData.length / zoomLevel);
  const viewData = sparklineData.slice(-visibleCount - scrollOffset, sparklineData.length - scrollOffset);

  const max = Math.max(...viewData);
  const min = Math.min(...viewData);
  const range = max - min || 1;
  const stepX = sparklineCanvas.width / (viewData.length - 1);

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#ccc';

  for (let i = 0; i <= 4; i++) {
    const y = (sparklineCanvas.height / 4) * i;
    const priceLevel = max - (range / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(sparklineCanvas.width, y);
    ctx.stroke();
    ctx.fillText(priceLevel.toFixed(2), 2, y - 2);
  }

  for (let i = 0; i < viewData.length; i += 20) {
    const x = i * stepX;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, sparklineCanvas.height);
    ctx.stroke();
    ctx.fillText(`${i}s`, x + 2, sparklineCanvas.height - 4);
  }

  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00D2B1';
  viewData.forEach((val, i) => {
    const x = i * stepX;
    const y = scaleY(val, min, range);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, 0, 0, sparklineCanvas.height);
  gradient.addColorStop(0, 'rgba(0, 210, 177, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 210, 177, 0)');
  ctx.lineTo(sparklineCanvas.width, sparklineCanvas.height);
  ctx.lineTo(0, sparklineCanvas.height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  const liveY = scaleY(price, min, range);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, liveY);
  ctx.lineTo(sparklineCanvas.width, liveY);
  ctx.stroke();

  if (hoverX !== null) {
    const index = Math.floor(hoverX / stepX);
    const value = viewData[index]?.toFixed(2);
    if (value) {
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, sparklineCanvas.height);
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.fillRect(hoverX + 5, 10, 60, 20);
      ctx.fillStyle = '#00D2B1';
      ctx.fillText(`$${value}`, hoverX + 10, 25);
    }
  }

  function scaleY(val, min, range) {
    return sparklineCanvas.height - ((val - min) / range) * sparklineCanvas.height;
  }
}

sparklineCanvas.addEventListener('mousemove', (e) => {
  const rect = sparklineCanvas.getBoundingClientRect();
  hoverX = e.clientX - rect.left;
  drawSparkline();
});

sparklineCanvas.addEventListener('mouseleave', () => {
  hoverX = null;
  drawSparkline();
});

sparklineCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.deltaY < 0 && zoomLevel < 5) zoomLevel += 0.1;
  if (e.deltaY > 0 && zoomLevel > 1) zoomLevel -= 0.1;
  drawSparkline();
});

sparklineCanvas.addEventListener('mousedown', (e) => {
  const startX = e.clientX;
  function onMove(ev) {
    const dx = ev.clientX - startX;
    scrollOffset += Math.floor(dx / 10);
    if (scrollOffset < 0) scrollOffset = 0;
    if (scrollOffset > sparklineData.length - 30) scrollOffset = sparklineData.length - 30;
    drawSparkline();
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

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
    stopBotBtn.classList.remove('hidden');
  }
});

stopBotBtn.addEventListener('click', () => {
  stopModal.classList.remove('hidden');
});

cancelStop.addEventListener('click', () => {
  stopModal.classList.add('hidden');
});

confirmStop.addEventListener('click', () => {
  botRunning = false;
  localStorage.setItem('botRunning', 'false');
  localStorage.removeItem('botStartTime');
  stopModal.classList.add('hidden');
  location.reload();
});

let ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");

ws.onopen = () => {
  ws.send(JSON.stringify({ ticks: "R_75", subscribe: 1 }));
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  const price = parseFloat(data.tick?.quote || 0).toFixed(2);
  vix75PriceTrade.textContent = `$${price}`;
  vix75PriceInline.textContent = `$${price}`;
  drawSparkline();
};

updateBotState();
if (botRunning) {
  animateCapital();
  loopContractAnimation();
  startBotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running</span>';
  stopBotBtn.classList.remove('hidden');
}
