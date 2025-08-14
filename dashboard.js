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
      const token = localStorage.getItem("token");
      if (!token) return;
  
      const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/account/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      if (!res.ok) throw new Error("Failed to fetch user data");
  
      const user = await res.json();
  
      const balance = parseFloat(user.balance || 0);
      const earnings = parseFloat(user.reward_balance || 0);
      const percentage = ((earnings / (balance || 1)) * 100).toFixed(1);
      const glorivestId = user.glorivest_id || 'GV000000';
      const email = user.email || 'Unknown';
  
      // Format values
      const balanceStr = `$${balance.toFixed(2)}`;
      const earningsStr = `$${earnings.toFixed(2)}`;
      const percentageStr = `+${percentage}%`;
      const profitStr = `+$${earnings.toFixed(2)}`;
  
      // Inject into DOM
      const totalEl = document.getElementById('total-balance');
      const availEl = document.getElementById('available-balance');
      const refEl = document.getElementById('referral-earnings');
      const percEl = document.getElementById('percentage-increase');
      const profitEl = document.getElementById('profit-increase');
      const idEl = document.getElementById('glorivest-id');
      const emailEl = document.getElementById('user-email');
  
      if (totalEl) {
        totalEl.textContent = balanceStr;
        totalEl.dataset.value = balanceStr;
      }
  
      if (availEl) {
        availEl.textContent = balanceStr;
        availEl.dataset.value = balanceStr;
      }
  
      if (refEl) {
        refEl.textContent = earningsStr;
        refEl.dataset.value = earningsStr;
      }
  
      if (percEl) {
        percEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${percentageStr}`;
        percEl.dataset.value = percentageStr;
      }
  
      if (profitEl) {
        profitEl.textContent = profitStr;
        profitEl.dataset.value = profitStr;
      }
  
      if (idEl) idEl.textContent = glorivestId;
      if (emailEl) emailEl.textContent = email;
  
    } catch (err) {
      console.error("Error loading balances:", err);
    }
  }
  
  window.addEventListener("DOMContentLoaded", loadBalances);
  
  