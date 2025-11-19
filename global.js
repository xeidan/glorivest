// ==== global.js (load first on every page) ====
window.API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

window.getToken = () => localStorage.getItem('token');
window.setToken = (t) => localStorage.setItem('token', t);
window.clearToken = () => localStorage.removeItem('token');

// Generic fetch wrapper that auto-attaches Authorization
// global.js
window.apiFetch = async (path, opts = {}) => {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (!('Content-Type' in headers) && opts.body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // Handle 401 globally: clear token and bounce to login (or show a toast)
  if (res.status === 401) {
    try { await res.text(); } catch {}
    clearToken();
    // 👉 choose: redirect or surface a message somewhere
    if (window.location.pathname !== '/login.html') {
      window.location.href = '/login.html';
    }
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status; err.body = body;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
};


// Make sure a default account exists (creates 'standard' if none)
window.ensureDefaultAccount = async () => {
  if (!getToken()) return null;
  const accounts = await apiFetch('/accounts', { method: 'GET' });
  if (Array.isArray(accounts) && accounts.length) return accounts[0];

  // <-- this is exactly where your snippet goes -->
  return await apiFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify({ tier: 'standard' })
  });
};

// Fetch /account/me and paint a couple fields (optional helper)
window.loadMe = async () => {
  if (!getToken()) return null;
  const me = await apiFetch('/account/me', { method: 'GET' });

  // Example UI hooks (use data-* attributes anywhere you want these values)
  document.querySelectorAll('[data-me="email"]').forEach(el => el.textContent = me.email ?? '');
  document.querySelectorAll('[data-me="account-id"]').forEach(el => el.textContent = me.default_account_id ?? '—');

  return me;
};



// ===============================
// 1. Main Tab Navigation (Bottom Nav)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabSections = document.querySelectorAll(".tab-section");

  function activateTab(tabName) {
    // Hide all sections
    tabSections.forEach(section => {
      section.classList.add("hidden");
    });

    // Show selected section
    const targetSection = document.getElementById(`tab-${tabName}`);
    if (targetSection) targetSection.classList.remove("hidden");

    // Remove active class from all buttons
    tabButtons.forEach(btn => btn.classList.remove("active-tab"));

    // Add active class to selected button
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active-tab");
  }

  // Attach click listeners to all buttons
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      activateTab(tab);
    });
  });

  // Activate Dashboard by default
  activateTab("dashboard");
});





// ===============================
// 2. Open Deposit/Withdraw/Tx Modals
// ===============================
function openModalTab(tabId) {
  // Show modal
  const modal = document.getElementById(`tab-${tabId}`);
  if (modal) modal.classList.remove('hidden');
}



// ===============================
// 3. Close Modal Tab and Reset to Dashboard
// ===============================
function closeTab(el) {
  const tabSection = el.closest('.tab-content');
  if (tabSection) tabSection.classList.add('hidden');

  // Always go back to dashboard
  showTab('dashboard');
}



// ===============================
// 4. Modal Toggle (Guide + Notification)
// ===============================
window.addEventListener('DOMContentLoaded', () => {
  const notificationBtn = document.getElementById("notification-btn");
  const guideBtn = document.getElementById("guide-btn");
  const notificationModal = document.getElementById("notification-modal");
  const guideModal = document.getElementById("guide-modal");

  notificationBtn.addEventListener("click", () => {
    guideModal.classList.add("hidden");
    notificationModal.classList.toggle("hidden");
    notificationBtn.classList.toggle("text-[#00D2B1]");
    guideBtn.classList.remove("text-[#00D2B1]");
  });

  guideBtn.addEventListener("click", () => {
    notificationModal.classList.add("hidden");
    guideModal.classList.remove("hidden");
    guideBtn.classList.add("text-[#00D2B1]");
    notificationBtn.classList.remove("text-[#00D2B1]");
  });
});



// ===============================
// 5. Close Modals Programmatically
// ===============================
function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
  document.getElementById("notification-btn")?.classList.remove("text-[#00D2B1]");
  document.getElementById("guide-btn")?.classList.remove("text-[#00D2B1]");
}



// ===============================
// 6. Load User Header Info (Email, ID, Initials)
// ===============================
async function loadUserHeader() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/account/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch user data");

    const user = await res.json();

    const email = user.email || "user@example.com";
    const glorivestId = user.glorivest_id || `GV${String(user.id).padStart(6, '0')}`;
    const initials = email.split("@")[0].slice(0, 2).toUpperCase();

    // Populate header elements
    document.getElementById("user-email").textContent = email;
    document.getElementById("glorivest-id").textContent = glorivestId;
    document.getElementById("user-initials").textContent = initials;

  } catch (err) {
    console.error("Error loading user header:", err);
  }
}

window.addEventListener('DOMContentLoaded', loadUserHeader);


