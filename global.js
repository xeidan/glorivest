// ===============================
// 1. Tab Navigation Handler
// ===============================
function showTab(tab, btn) {
    // Hide all tab sections
    document.querySelectorAll('.tab-section').forEach(el => el.classList.add('hidden'));
  
    // Show the selected tab
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
  
    // Remove active style from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
  
    // Highlight the clicked tab button
    if (btn) btn.classList.add('active-tab');
  
    // Remove active style from header icons (guide/notification)
    document.querySelectorAll('.header-icon').forEach(icon => icon.classList.remove('active-tab'));
  }
    // To close withdraw, depo and transactions
    function closeTab(el) {
  const tabSection = el.closest('.tab-content');
  if (tabSection) tabSection.classList.add('hidden');

  // Always return to dashboard
  const dashboardTab = document.getElementById('tab-dashboard');
  if (dashboardTab) dashboardTab.classList.remove('hidden');
}

    
    
  
  
  // ===============================
  // 2. Modal Toggle Logic (Guide & Notification)
  // ===============================
  window.addEventListener('DOMContentLoaded', () => {
    const notificationBtn = document.getElementById("notification-btn");
    const guideBtn = document.getElementById("guide-btn");
    const notificationModal = document.getElementById("notification-modal");
    const guideModal = document.getElementById("guide-modal");
  
    // Toggle Notification Modal
    notificationBtn.addEventListener("click", () => {
      guideModal.classList.add("hidden"); // hide guide
      notificationModal.classList.toggle("hidden"); // toggle notification
      notificationBtn.classList.toggle("text-[#00D2B1]"); // highlight icon
      guideBtn.classList.remove("text-[#00D2B1]");
    });
  
    // Toggle Guide Modal
    guideBtn.addEventListener("click", () => {
      notificationModal.classList.add("hidden"); // hide notification
      guideModal.classList.remove("hidden"); // show guide
      guideBtn.classList.add("text-[#00D2B1]");
      notificationBtn.classList.remove("text-[#00D2B1]");
    });
  });
  
  
  // ===============================
  // 3. Close Any Modal Programmatically
  // ===============================
  function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById("notification-btn").classList.remove("text-[#00D2B1]");
    document.getElementById("guide-btn").classList.remove("text-[#00D2B1]");
  }
  
  
  // ===============================
  // 4. Fetch & Display User Info
  // ===============================
  const API_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com/account/me';
  const token = localStorage.getItem('token');
  
  async function loadUserInfo() {
    if (!token) return;
  
    try {
      const res = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (!res.ok) throw new Error('Failed to fetch user');
  
      const user = await res.json();
  
      // Format name and ID
      const email = user.email || 'user@example.com';
      const namePart = email.split('@')[0];
      const initials = namePart.slice(0, 2).toUpperCase();
      const id = user.rave_id || `GV${String(user.id).padStart(6, '0')}`;
  
      // Inject into DOM
      document.getElementById('user-email').textContent = email;
      document.getElementById('gv-id').textContent = `#${id}`;
      document.getElementById('user-initials').textContent = initials;
  
    } catch (err) {
      console.error('Error loading user info:', err);
    }
  }
  
  // Run user info fetch on load
  window.addEventListener('DOMContentLoaded', loadUserInfo);
  