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
  
  // --- Populate Dashboard Balances ---
  window.addEventListener('DOMContentLoaded', () => {
    const total = 12960;
    const available = 10500;
    const referral = 560;
    const profit = total - (available + referral); // 1900
    const percentage = ((profit / total) * 100).toFixed(2); // e.g. 14.66
  
    const totalEl = document.getElementById('total-balance');
    const availEl = document.getElementById('available-balance');
    const refEl = document.getElementById('referral-earnings');
    const percEl = document.getElementById('percentage-increase');
    const profitEl = document.getElementById('profit-increase');
  
    if (totalEl) {
      const val = `$${total.toFixed(2)}`;
      totalEl.textContent = val;
      totalEl.dataset.value = val;
    }
  
    if (availEl) {
      const val = `$${available.toFixed(2)}`;
      availEl.textContent = val;
      availEl.dataset.value = val;
    }
  
    if (refEl) {
      const val = `$${referral.toFixed(2)}`;
      refEl.textContent = val;
      refEl.dataset.value = val;
    }
  
    if (percEl) {
      const val = `+${percentage}%`;
      percEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> ${val}`;
      percEl.dataset.value = val;
    }
  
    if (profitEl) {
      const val = `+$${profit.toFixed(2)}`;
      profitEl.textContent = val;
      profitEl.dataset.value = val;
    }
  });
  