// ==== global.js (load first on every page) ====
window.API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

// Token helpers
window.getToken = () => localStorage.getItem('token');
window.setToken = (t) => localStorage.setItem('token', t);
window.clearToken = () => localStorage.removeItem('token');


// ======================================================
//  UNIVERSAL FETCH WRAPPER
// ======================================================
window.apiFetch = async (path, opts = {}) => {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };

  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // Global unauthorized handler
  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login.html') {
      window.location.href = '/login.html';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
};



// ======================================================
//   loadFullUser() — correct authoritative loader
// ======================================================
window.loadFullUser = async () => {
  const token = getToken();
  if (!token) return { user: null, account: null };

  let user = null;
  let accounts = [];

  try {
    // ✔ Correct user endpoint
    user = await apiFetch('/auth/me');
  } catch (e) {
    console.error("loadFullUser: /auth/me failed", e);
    return { user: null, account: null };
  }

  try {
  const accRes = await apiFetch('/accounts'); // returns {count, data}
  accounts = Array.isArray(accRes) ? accRes : (accRes.data || []);
} catch (e) {
  console.error("loadFullUser: /accounts failed", e);
  accounts = [];
}


  let selectedId = Number(localStorage.getItem('currentAccountId') || 0);
  let account = accounts.find(a => a.id === selectedId) || accounts[0] || null;

  if (account) {
    localStorage.setItem('currentAccountId', String(account.id));
  }

  return { user, account };
};



// ======================================================
//   loadMe — for simple header loads
// ======================================================
window.loadMe = async () => {
  const token = getToken();
  if (!token) return null;

  try {
    const me = await apiFetch('/auth/me');
    document.querySelectorAll('[data-me="email"]').forEach(el => el.textContent = me.email ?? '');
    document.querySelectorAll('[data-me="account-id"]').forEach(el => el.textContent = me.default_account_id ?? '—');
    return me;
  } catch (e) {
    console.error("loadMe failed:", e);
    return null;
  }
};



// ======================================================
//   getCurrentAccountId helper
// ======================================================
window.getCurrentAccountId = async () => {
  const { user, account } = await window.loadFullUser();
  return account ? account.id : null;
};



// ======================================================
//  TAB NAVIGATION (unchanged)
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabSections = document.querySelectorAll(".tab-section");

  function activateTab(tabName) {
    tabSections.forEach(section => section.classList.add("hidden"));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.remove("hidden");

    tabButtons.forEach(btn => btn.classList.remove("active-tab"));
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active-tab");
  }

  tabButtons.forEach(btn => btn.addEventListener("click", () => activateTab(btn.getAttribute("data-tab"))));

  activateTab("dashboard");
});



// ======================================================
//  USER HEADER LOADER (fixed to use /auth/me)
// ======================================================
async function loadUserHeader() {
  try {
    const { user } = await window.loadFullUser();
    if (!user) return;

    const email = user.email || "user@example.com";
    const glorivestId = user.glorivest_id || `GV${String(user.id).padStart(6, '0')}`;
    const initials = email.split("@")[0].slice(0, 2).toUpperCase();

    document.getElementById("user-email").textContent = email;
    document.getElementById("glorivest-id").textContent = glorivestId;
    document.getElementById("user-initials").textContent = initials;

  } catch (err) {
    console.error("Error loading user header:", err);
  }
}

window.addEventListener('DOMContentLoaded', loadUserHeader);
