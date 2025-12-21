// (() => {
//   'use strict';

//   /***** === Config (scoped) === *****/
//   const API_BASE = "https://glorivest-api-a16f75b6b330.herokuapp.com";
//   const WS_URL   = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

//   const SYNTHETIC_INDICES_MAP = {
//       'R_75': 'Volatility 75 Index',
//       'R_10': 'Volatility 10 Index',
//       'R_25': 'Volatility 25 Index',
//       'R_50': 'Volatility 50 Index',
//       'R_100': 'Volatility 100 Index',
//       'RDBEAR': 'Bear Market Index',
//       'RDBULL': 'Bull Market Index',
//   };
//   const DEFAULT_TICK = 'R_75';

//   /***** === State === *****/
//   let lastTickPrices = {};
//   let botRunning = localStorage.getItem('botRunning') === 'true';
//   let activeCycleCapital = parseFloat(localStorage.getItem('activeCycleCapital')) || 0;
//   let activeCycleReturnRate = parseFloat(localStorage.getItem('activeCycleReturnRate')) || 0.20;
//   let startTime = parseInt(localStorage.getItem('botStartTime')) || null;
//   const totalSeconds = 30 * 24 * 60 * 60;
//   let tradeInterval = null;
//   let currentSymbol = DEFAULT_TICK;

//   // Wallet/Cycle State (SIMULATED - replace with actual API calls)
//   let mainWalletBalance = 1500.00;
//   let referralBalance = 150.50;
//   let withdrawableBotEarnings = 450.75; // Realized profits ready for transfer
//   let lifetimeTotalEarnings = 1200.00; // Total realized profits over time
//   let newCycleCapital = 0;

//   // Chart State (omitted for brevity)
//   const prices = [];
//   const times  = [];
//   let progress = 0; // Global progress variable

//   /***** === DOM === *****/
//   const $ = (id) => document.getElementById(id);

//   // Bot Summary (Overview Tab)
//   const botCapital         = $('summary-total-capital');
//   const botProfit          = $('summary-total-earnings'); // Now Realized Bot Profit
//   const activeCycleCountEl = $('summary-active-count');
//   const activeCyclesList   = $('active-cycles-list');
//   const cycleDaysRunEl     = document.querySelector('.cycle-days-run');

//   // Tab Controls
//   const tradeSection           = $('tab-trade');
//   const overviewTabContent     = $('trade-content-overview');
//   const startTabContent        = $('trade-content-start');
//   const chartTabContent        = $('trade-content-chart');
//   const transferTabContent     = $('trade-content-transfer');
//   const tabButtons             = document.querySelectorAll('.flex > button');

//   // Cycle Start Controls (New Cycle Tab)
//   const mainWalletBalanceEl      = $('main-wallet-balance');
//   const capitalInput             = $('new-cycle-capital');
//   const tierDetectionEl          = $('tier-detection');
//   const previewTierEl            = $('preview-tier');
//   const previewReturnEl          = $('preview-return');
//   const previewPayoutEl          = $('preview-payout');
//   const startNewCycleBtn         = $('start-new-cycle-btn');
//   const transferReferralAmountEl = $('transfer-referral-amount');
//   const transferReferralBtn      = $('transfer-referral-btn');

//   // Transfer Earnings Controls (Transfer Tab)
//   const withdrawableBotEarningsDisplay = $('withdrawable-bot-earnings-display');
//   const projectedMainWalletBalanceEl = $('projected-main-wallet-balance');
//   const transferBotEarningsBtn = $('transfer-bot-earnings-btn');


//   /***** === Cycle/Tier Logic === *****/

//   function getCycleTier(capital) {
//       if (capital >= 5000) return { tier: 'Elite', return: 0.25 };
//       if (capital >= 500)  return { tier: 'Pro', return: 0.20 };
//       if (capital >= 50)   return { tier: 'Standard', return: 0.15 };
//       return { tier: 'None', return: 0 };
//   }

//   function updateCyclePreview() {
//       // ... (existing logic remains the same) ...
//       newCycleCapital = parseFloat(capitalInput?.value) || 0;

//       if (isNaN(newCycleCapital) || newCycleCapital < 0) {
//           newCycleCapital = 0;
//       }

//       const { tier, return: returnRate } = getCycleTier(newCycleCapital);

//       const isReady = newCycleCapital >= 50 && newCycleCapital <= mainWalletBalance;

//       const returnPercent = (returnRate * 100).toFixed(0) + '%';
//       const expectedPayout = newCycleCapital * (1 + returnRate);

//       if (tierDetectionEl) {
//           if (newCycleCapital < 50) {
//               tierDetectionEl.innerHTML = `Minimum investment is $50.`;
//           } else if (newCycleCapital > mainWalletBalance) {
//                tierDetectionEl.innerHTML = `<span class="text-red-500">Insufficient balance. Max available: $${mainWalletBalance.toFixed(2)}</span>`;
//           } else {
//               tierDetectionEl.innerHTML = `Tier: <span class="text-yellow-400">${tier} (${returnPercent} guaranteed return)</span>`;
//           }
//       }

//       if (previewTierEl) previewTierEl.textContent = tier;
//       if (previewReturnEl) previewReturnEl.textContent = returnPercent;
//       if (previewPayoutEl) previewPayoutEl.textContent = `$${expectedPayout.toFixed(2)}`;

//       if (startNewCycleBtn) {
//           startNewCycleBtn.disabled = !isReady;
//           startNewCycleBtn.classList.toggle('opacity-50', !isReady);
//           startNewCycleBtn.classList.toggle('bg-[#00D2B1]', isReady);
//           startNewCycleBtn.classList.toggle('bg-gray-600', !isReady);
//           startNewCycleBtn.classList.toggle('cursor-not-allowed', !isReady);
//           startNewCycleBtn.textContent = isReady ? 'Confirm & Start Cycle' : (newCycleCapital > mainWalletBalance ? 'Insufficient Funds' : 'Enter Valid Capital');
//       }
//   }


//   /***** === Transfer Earnings Logic (Transfer Tab) === *****/

//   function updateTransferTab() {
//       const available = withdrawableBotEarnings;
//       const projectedTotal = mainWalletBalance + available;
//       const isReady = available > 0.01;

//       if (withdrawableBotEarningsDisplay) withdrawableBotEarningsDisplay.textContent = `$${available.toFixed(2)}`;
//       if (projectedMainWalletBalanceEl) projectedMainWalletBalanceEl.textContent = `$${projectedTotal.toFixed(2)}`;

//       if (transferBotEarningsBtn) {
//           transferBotEarningsBtn.disabled = !isReady;
//           transferBotEarningsBtn.classList.toggle('opacity-50', !isReady);
//           transferBotEarningsBtn.classList.toggle('bg-[#00D2B1]', isReady);
//           transferBotEarningsBtn.classList.toggle('bg-gray-600', !isReady);
//           transferBotEarningsBtn.classList.toggle('cursor-not-allowed', !isReady);
//           transferBotEarningsBtn.textContent = isReady
//               ? `Transfer $${available.toFixed(2)} to Main Wallet`
//               : 'No Profits Available to Transfer';
//       }
//   }

//   function transferBotEarnings() {
//       const amount = withdrawableBotEarnings;
//       if (amount <= 0.01) return;

//       mainWalletBalance += amount;
//       withdrawableBotEarnings = 0;

//       if (mainWalletBalanceEl) mainWalletBalanceEl.textContent = `$${mainWalletBalance.toFixed(2)}`;
//       updateTransferTab();
//       renderActiveCycleCard();
//       alert(`$${amount.toFixed(2)} of bot profits successfully transferred to your main wallet.`);
//   }


//   /***** === Internal Tab Switching === *****/

//   window.showTradeTabContent = (tabName) => {
//       const allContents = [overviewTabContent, startTabContent, chartTabContent, transferTabContent];
//       const selectedContent = $(`trade-content-${tabName}`);

//       // Toggle button active state
//       tabButtons.forEach(btn => {
//           btn.classList.remove('trade-tab-active', 'text-[#00D2B1]');
//           btn.classList.add('text-white/60');
//           if (btn.getAttribute('onclick')?.includes(`'${tabName}'`)) {
//               btn.classList.add('trade-tab-active', 'text-[#00D2B1]');
//               btn.classList.remove('text-white/60');
//           }
//       });

//       // Toggle content visibility
//       allContents.forEach(content => content?.classList.add('hidden'));
//       selectedContent?.classList.remove('hidden');

//       // Post-switch actions
//       if (tabName === 'chart') {
//           // Reset chart data, resubscribe, resize
//           // ... (chart logic) ...
//       }

//       if (tabName === 'start') {
//           if (mainWalletBalanceEl) mainWalletBalanceEl.textContent = `$${mainWalletBalance.toFixed(2)}`;
//           if (transferReferralAmountEl) transferReferralAmountEl.textContent = `$${referralBalance.toFixed(2)}`;
//           updateCyclePreview();
//       }

//       if (tabName === 'overview') {
//           renderActiveCycleCard();
//       }

//       if (tabName === 'transfer') {
//           updateTransferTab();
//       }
//   };


//   /***** === Bot progress & Rendering (Overview Tab) === *****/

//   function renderActiveCycleCard() {
//       if (!activeCyclesList) return;
//       activeCyclesList.innerHTML = ''; // Clear existing content

//       if (botProfit) botProfit.textContent = `$${lifetimeTotalEarnings.toFixed(2)}`; // Update lifetime earnings

//       if (!botRunning || activeCycleCapital <= 0) {
//           activeCyclesList.innerHTML = `<p class="text-white/60 text-center py-8">No active trading cycles found. Start one below or in the New Cycle tab.</p>`;
          
//           // Render only the start button if no cycle is active
//           activeCyclesList.innerHTML += `
//              <div class="flex justify-center pt-3">
//                 <button class="py-2 px-8 bg-[#00D2B1] text-black font-bold rounded-lg text-sm transition" onclick="showTradeTabContent('start')">
//                    Start Trading Bot
//                 </button>
//              </div>
//           `;
          
//           if (botCapital) botCapital.textContent = '$0.00';
//           if (activeCycleCountEl) activeCycleCountEl.textContent = '0';
//           return;
//       }

//       updateBotState();

//       const { tier } = getCycleTier(activeCycleCapital);
//       const targetProfit = activeCycleCapital * activeCycleReturnRate;
//       const daysPassed = Math.floor(progress * 30);
//       const progressPercent = (progress * 100).toFixed(1);

//       // Total Summary Update
//       if (botCapital) botCapital.textContent = `$${activeCycleCapital.toFixed(2)}`;
//       if (activeCycleCountEl) activeCycleCountEl.textContent = '1';

//       // Determine if cycle is complete (simulated for UI)
//       const isComplete = progress >= 1;
//       const statusText = isComplete ? 'Status: Complete' : 'Status: Running';
//       const statusColor = isComplete ? 'text-yellow-400' : 'text-green-400';
//       const buttonDisplay = isComplete ? 'Claim Payout' : 'End Cycle Early';
//       const buttonClass = isComplete
//           ? 'bg-[#00D2B1] text-black hover:bg-[#00bca3]'
//           : 'bg-red-600/10 hover:bg-red-600/20 text-red-400';
//       const buttonAction = isComplete ? `claimProfit(1, ${targetProfit.toFixed(2)})` : `showStopModal('cycle-1')`;
//       const startButtonHidden = isComplete ? 'hidden' : '';
//       const endButtonHidden = isComplete ? 'hidden' : '';


//       // Render the single active cycle card
//       activeCyclesList.innerHTML = `
//           <div class="cycle-card bg-[#1e1e1e] border border-white/10 rounded-xl p-5 space-y-3">
//               <div class="flex justify-between items-center pb-2 border-b border-white/10">
//                   <span class="cycle-status-badge text-sm font-medium ${statusColor}">${statusText}</span>
//                   <div class="text-sm text-white/60">Tier: <span class="text-yellow-400 font-semibold cycle-tier">${tier}</span></div>
//               </div>

//               <div class="grid grid-cols-3 gap-3 py-2 text-center">
//                   <div>
//                       <p class="text-xs text-white/50">Invested</p>
//                       <p class="font-bold text-lg text-white cycle-capital">$${activeCycleCapital.toFixed(2)}</p>
//                   </div>
//                    <div>
//                       <p class="text-xs text-white/50">Days Run</p>
//                       <p class="font-bold text-lg text-white cycle-days-run">${daysPassed} / 30</p>
//                   </div>
//                   <div>
//                       <p class="text-xs text-white/50">Est. Payout</p>
//                       <p class="font-bold text-lg text-[#00D2B1] cycle-profit">$${targetProfit.toFixed(2)}</p>
//                   </div>
//               </div>

//               <div class="pt-1">
//                   <div class="relative w-full h-1 rounded-full bg-white/10 overflow-hidden">
//                       <div class="cycle-progress-bar absolute h-full left-0 top-0 bg-[#00D2B1]" style="width: ${progressPercent}%"></div>
//                   </div>
//                   <p class="cycle-progress-label text-xs text-white/70 text-right mt-1">${progressPercent}% Complete</p>
//               </div>

//               <div class="flex justify-between pt-3 gap-3 border-t border-white/10 mt-4">
//                   <button class="${startButtonHidden} py-2 px-4 bg-gray-600 text-black font-bold rounded-lg text-sm transition" onclick="showTradeTabContent('start')">
//                       Start New Cycle
//                   </button>
//                   <button class="${endButtonHidden} py-2 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 font-semibold rounded-lg text-sm transition" onclick="showStopModal('cycle-1')">
//                       End Cycle Early
//                   </button>
//                   <button class="py-2 px-4 font-bold rounded-lg text-sm transition ${buttonClass} ${isComplete ? '' : 'hidden'}" onclick="${buttonAction}">
//                       ${buttonDisplay}
//                   </button>
//               </div>
//           </div>
//       `;
//   }

//   function updateBotState() {
//     const now = Math.floor(Date.now() / 1000);
//     const elapsed = startTime ? now - startTime : 0;
//     progress = Math.min(elapsed / totalSeconds, 1);
//   }

//   function animateCapital() {
//     const interval = setInterval(() => {
//       if (!botRunning) return clearInterval(interval);
//       updateBotState();
//       renderActiveCycleCard();
//     }, 60000);
//   }

//   window.claimProfit = (cycleId, profitAmount) => {
//     // 1. Move capital + profit to withdrawable earnings (SIMULATED)
//     withdrawableBotEarnings += activeCycleCapital; // Return capital
//     withdrawableBotEarnings += activeCycleCapital * activeCycleReturnRate; // Realized profit

//     // Update lifetime total earnings
//     lifetimeTotalEarnings += activeCycleCapital * activeCycleReturnRate;

//     // 2. Clear cycle state
//     botRunning = false;
//     activeCycleCapital = 0;
//     activeCycleReturnRate = 0;
//     startTime = null;
//     localStorage.clear();

//     // 3. Update UI
//     alert(`Cycle completed. Total payout moved to Transfer tab.`);
//     window.showTradeTabContent('overview');
//   }


//   /***** === Initialization === *****/

//   function initializeTradeTab() {
//       // 1. Start WS Connection (multi-index)
//       // openWs(); // Omitted connection for simplicity

//       // 2. Update existing cycle state and start loops if necessary
//       updateBotState();
//       if (botRunning) {
//         animateCapital();
//       }

//       // 3. Set the default symbol for the chart
//       currentSymbol = DEFAULT_TICK;

//       // 4. Force default view to the Overview tab
//       window.showTradeTabContent('overview');
//   }

//   // initializeTradeTab(); // Uncomment to run the init script on page load

// })();


// /***** === PWA Installation Logic === *****/
//   let deferredPrompt;
//   const installAppAction = document.querySelector('[data-action="install"]');
  
//   // 1. Listen for the browser's install prompt event
//   window.addEventListener('beforeinstallprompt', (e) => {
//     // Prevent the mini-infobar from appearing on mobile
//     e.preventDefault();
//     // Stash the event so it can be triggered later
//     deferredPrompt = e;
    
//     // Visually enable the install button
//     if (installAppAction) {
//         installAppAction.style.display = 'flex'; // Make sure it's visible if hidden by default
//         installAppAction.classList.add('cursor-pointer');
//         // Add a visual indicator that it's ready
//         installAppAction.querySelector('i').classList.add('text-[#00D2B1]');
//         installAppAction.querySelector('i').classList.remove('text-white/70');
//     }
//   });
  
//   // 2. Handle the click event on the "Install Web App" element
//   if (installAppAction) {
//     installAppAction.addEventListener('click', (e) => {
//       e.preventDefault();
      
//       if (deferredPrompt) {
//         // Show the prompt
//         deferredPrompt.prompt();
        
//         // Wait for the user to respond to the prompt
//         deferredPrompt.userChoice.then((choiceResult) => {
//           if (choiceResult.outcome === 'accepted') {
//             console.log('User accepted the install prompt');
//             alert('App is installing! Look for the "Glorivest" icon on your home screen.');
//           } else {
//             console.log('User dismissed the install prompt');
//           }
//           // Clear the deferred prompt variable
//           deferredPrompt = null;
          
//           // Optionally hide the button after one attempt
//           if (installAppAction) {
//             installAppAction.style.display = 'none'; 
//           }
//         });
//       } else {
//         alert("The app is already installed or your browser doesn't support the manual prompt. Check your browser settings for an 'Install App' option.");
//       }
//     });
//   }

//   // 3. Register the Service Worker
//   if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//       navigator.serviceWorker.register('/service-worker.js')
//         .then(registration => {
//           console.log('ServiceWorker registration successful with scope: ', registration.scope);
//         }, err => {
//           console.log('ServiceWorker registration failed: ', err);
//         });
//     });
//   }

// })();