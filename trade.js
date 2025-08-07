// trade.js

let botRunning = false;
let capital = parseFloat(localStorage.getItem('capital')) || 1000;
let daysActive = parseInt(localStorage.getItem('botDays')) || 0;
const totalDays = 30;
const targetProfit = capital * 0.2;
const targetCapital = capital + targetProfit;

const botCapital = document.getElementById('bot-capital');
const botProfit = document.getElementById('bot-profit');
const botDays = document.getElementById('bot-days');
const botProgress = document.getElementById('bot-progress');
const botProgressLabel = document.getElementById('bot-progress-label');
const botLoopProgress = document.getElementById('bot-loop-progress');
const botActionLabel = document.getElementById('bot-action-label');
const startBotBtn = document.getElementById('start-bot');
const stopModal = document.getElementById('stop-modal');
const cancelStop = document.getElementById('cancel-stop');
const confirmStop = document.getElementById('confirm-stop');

// Sparkline setup
const sparklineCanvas = document.getElementById('vix75-sparkline');
const ctx = sparklineCanvas.getContext('2d');
const sparklineData = [];

function updateUI() {
  const profit = capital - 1000;
  const progress = Math.min((capital / targetCapital) * 100, 100);

  botCapital.textContent = `$${capital.toFixed(2)}`;
  botProfit.textContent = `$${profit.toFixed(2)}`;
  botDays.textContent = daysActive;
  botProgress.style.width = `${progress}%`;
  botProgressLabel.textContent = `${progress.toFixed(1)}%`;
}

function simulateTrade() {
    if (!botRunning || daysActive >= totalDays) return;
  
    // Create trade entry
    const entryPrice = 74 + Math.random(); // fake price
    const isWin = true;
    const trade = {
      time: new Date().toISOString(),
      amount: 10,
      entry: entryPrice,
      status: isWin ? "won" : "lost"
    };
  
    // Save to localStorage
    const history = JSON.parse(localStorage.getItem("tradeHistory") || "[]");
    history.push(trade);
    localStorage.setItem("tradeHistory", JSON.stringify(history));
  
    // Update stats
    capital += targetProfit / totalDays;
    daysActive++;
  
    localStorage.setItem('capital', capital);
    localStorage.setItem('botDays', daysActive);
  
    updateUI();
    drawSparkline();
  
    if (daysActive >= totalDays) {
      botRunning = false;
      startBotBtn.disabled = true;
      startBotBtn.innerHTML = '<i class="fas fa-check"></i> <span>Completed</span>';
    }
  }
  

function drawSparkline() {
  sparklineData.push(capital);
  if (sparklineData.length > 30) sparklineData.shift();

  ctx.clearRect(0, 0, sparklineCanvas.width, sparklineCanvas.height);
  ctx.beginPath();
  ctx.strokeStyle = '#00D2B1';
  ctx.lineWidth = 2;

  const max = Math.max(...sparklineData);
  const min = Math.min(...sparklineData);
  const range = max - min || 1;
  const step = sparklineCanvas.width / (sparklineData.length - 1);

  sparklineData.forEach((val, i) => {
    const x = i * step;
    const y = sparklineCanvas.height - ((val - min) / range) * sparklineCanvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

startBotBtn.addEventListener('click', () => {
  if (!botRunning && daysActive < totalDays) {
    botRunning = true;
    startBotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Running</span>';
    runBot();
  }
});

function runBot() {
  if (!botRunning) return;

  botActionLabel.textContent = 'Buying Contract';
  botLoopProgress.style.width = '0%';

  let loop = 0;
  const loopInterval = setInterval(() => {
    loop += 33;
    botLoopProgress.style.width = `${loop}%`;

    if (loop >= 100) {
      clearInterval(loopInterval);
      simulateTrade();
      if (botRunning) setTimeout(runBot, 2000); // Next trade after 2s
    }
  }, 500);
}

// Stop modal logic
confirmStop.addEventListener('click', () => {
  botRunning = false;
  localStorage.removeItem('capital');
  localStorage.removeItem('botDays');
  stopModal.classList.add('hidden');
  location.reload();
});

cancelStop.addEventListener('click', () => {
  stopModal.classList.add('hidden');
});

// Live price (mocked)
setInterval(() => {
  const price = (74 + Math.random()).toFixed(2);
  document.getElementById('vix75-price-trade').textContent = `$${price}`;
  document.getElementById('vix75-price-inline').textContent = `$${price}`;
}, 1000);

// Initial load
updateUI();
drawSparkline();

// DOM Content Load
window.addEventListener("DOMContentLoaded", () => {
    updateUI();
    drawSparkline();
  });
  