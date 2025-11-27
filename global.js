// ============================================================================
//  GLOBAL.JS  —  Loaded FIRST on every page
//  Contains ONLY cross-page utilities, API helpers, tab navigation, header load,
//  and global balance visibility logic.
// ============================================================================


// ============================================================================
// 1. BASE API + TOKEN HELPERS
// ============================================================================
window.API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

window.getToken  = () => localStorage.getItem('token');
window.setToken  = (t) => localStorage.setItem('token', t);
window.clearToken = () => localStorage.removeItem('token');


// ============================================================================
// 2. UNIVERSAL FETCH WRAPPER
// ============================================================================
window.apiFetch = async (path, opts = {}) => {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };

  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

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



// ============================================================================
// 3. USER + ACCOUNT LOADERS
// ============================================================================

// Full loader (user + accounts)
window.loadFullUser = async () => {
  const token = getToken();
  if (!token) return { user: null, account: null };

  let user = null;
  let accounts = [];

  // Fetch user
  try {
    user = await apiFetch('/auth/me');
  } catch (e) {
    console.error("loadFullUser: /auth/me failed", e);
    return { user: null, account: null };
  }

  // Fetch accounts
  try {
    const accRes = await apiFetch('/accounts');
    accounts = Array.isArray(accRes) ? accRes : (accRes.data || []);
  } catch (e) {
    console.error("loadFullUser: /accounts failed", e);
    accounts = [];
  }

  // Pick current
  let selectedId = Number(localStorage.getItem('currentAccountId') || 0);
  let account = accounts.find(a => a.id === selectedId) || accounts[0] || null;

  if (account) {
    localStorage.setItem('currentAccountId', String(account.id));
  }

  return { user, account };
};


// Simple header loader
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


// Just return current account ID
window.getCurrentAccountId = async () => {
  const { user, account } = await window.loadFullUser();
  return account ? account.id : null;
};



// ============================================================================
// 4. GLOBAL SELECTOR
// ============================================================================
window.qs = (id) => document.getElementById(id);



// ============================================================================
// 5. GLOBAL TAB NAVIGATION
// ============================================================================
window.showTab = function (tab) {
  document.querySelectorAll('.tab-section, .tab-content')
    .forEach(el => el.classList.add('hidden'));

  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active-tab', btn.dataset.tab === tab);
  });
};


// Auto activate dashboard on page load
document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn =>
    btn.addEventListener("click", () => showTab(btn.dataset.tab))
  );

  showTab("dashboard");
});



// ============================================================================
// 6. USER HEADER LOADING (email, ID, initials)
// ============================================================================
async function loadUserHeader() {
  try {
    const { user } = await window.loadFullUser();
    if (!user) return;

    const email = user.email || "user@example.com";
    const glorivestId = user.glorivest_id || `GV${String(user.id).padStart(6, '0')}`;
    const initials = email.split("@")[0].slice(0, 2).toUpperCase();

    qs("user-email").textContent = email;
    qs("glorivest-id").textContent = glorivestId;
    qs("user-initials").textContent = initials;

  } catch (err) {
    console.error("Error loading user header:", err);
  }
}

window.addEventListener('DOMContentLoaded', loadUserHeader);



// ============================================================================
// 7. GLOBAL BALANCE VISIBILITY TOGGLE (show/hide balances with eye icon)
// ============================================================================
let isBalanceVisible = true;

window.toggleBalance = function () {
  isBalanceVisible = !isBalanceVisible;

  const ids = [
    'total-balance',
    'available-balance',
    'referral-earnings',
    'profit-increase',
    'percentage-increase'
  ];

  ids.forEach(id => {
    const el = qs(id);
    if (!el) return;
    el.textContent = isBalanceVisible ? (el.dataset.value || el.textContent) : '•••••••';
  });

  const eye = qs('real-balance-eye-icon');
  if (eye) {
    eye.className = isBalanceVisible
      ? 'fa-solid fa-eye text-white/70 text-lg'
      : 'fa-solid fa-eye-slash text-white/70 text-lg';
  }
};


// Click handler for any element with [data-toggle-balance]
document.addEventListener('click', e => {
  if (e.target.closest('[data-toggle-balance]')) {
    toggleBalance();
  }
});



// ============================================================================
// 8. GLOBAL SHEET SYSTEM — Notifications & Guide (System A)
// ============================================================================

// Elements
const sheetNotif      = qs("sheet-notifications");
const sheetNotifBg    = qs("sheet-notifications-backdrop");
const sheetNotifPanel = qs("sheet-notifications-panel");

const sheetGuide      = qs("sheet-guide");
const sheetGuideBg    = qs("sheet-guide-backdrop");
const sheetGuidePanel = qs("sheet-guide-panel");

const btnNotif = qs("btn-open-notifications");
const btnGuide = qs("btn-open-guide");


// Reset active icons
function clearIconActive() {
  btnNotif?.classList.remove("icon-active");
  btnGuide?.classList.remove("icon-active");
}


// Opening a sheet
function openGlobalSheet(sheet, backdrop, panel, triggerBtn) {
  sheet.classList.remove("hidden");
  clearIconActive();
  triggerBtn?.classList.add("icon-active");

  requestAnimationFrame(() => {
    backdrop.classList.add("opacity-100");
    panel.classList.remove("translate-y-full");
  });
}


// Closing a sheet
function closeGlobalSheet(sheet, backdrop, panel, triggerBtn) {
  backdrop.classList.remove("opacity-100");
  panel.classList.add("translate-y-full");
  triggerBtn?.classList.remove("icon-active");

  setTimeout(() => sheet.classList.add("hidden"), 220);
}


// Drag to close
function attachGlobalDrag(panel, closeFn) {
  let startY = 0;
  let dragging = false;

  panel.addEventListener("mousedown", start);
  panel.addEventListener("touchstart", start, { passive: true });

  function start(e) {
    dragging = true;
    startY = (e.touches ? e.touches[0].clientY : e.clientY);
    panel.style.transition = "none";
  }

  window.addEventListener("mousemove", move);
  window.addEventListener("touchmove", move, { passive: true });

  function move(e) {
    if (!dragging) return;
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    const dy = Math.max(0, y - startY);
    panel.style.transform = `translateY(${dy}px)`;
  }

  window.addEventListener("mouseup", end);
  window.addEventListener("touchend", end);

  function end() {
    if (!dragging) return;
    dragging = false;

    const dy = parseFloat(panel.style.transform.replace("translateY(", "")) || 0;
    panel.style.transition = "";

    if (dy > 70) closeFn();
    else panel.style.transform = "";
  }
}


// Attach drag
if (sheetNotifPanel) attachGlobalDrag(sheetNotifPanel, () =>
  closeGlobalSheet(sheetNotif, sheetNotifBg, sheetNotifPanel, btnNotif)
);

if (sheetGuidePanel) attachGlobalDrag(sheetGuidePanel, () =>
  closeGlobalSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, btnGuide)
);


// Buttons
btnNotif?.addEventListener("click", () => {
  closeGlobalSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, btnGuide);
  setTimeout(() => openGlobalSheet(sheetNotif, sheetNotifBg, sheetNotifPanel, btnNotif), 120);
});

btnGuide?.addEventListener("click", () => {
  closeGlobalSheet(sheetNotif, sheetNotifBg, sheetNotifPanel, btnNotif);
  setTimeout(() => openGlobalSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, btnGuide), 120);
});


// Backdrop click
sheetNotifBg?.addEventListener("click", () =>
  closeGlobalSheet(sheetNotif, sheetNotifBg, sheetNotifPanel, btnNotif)
);

sheetGuideBg?.addEventListener("click", () =>
  closeGlobalSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, btnGuide)
);



// ============================================================================
//JS HELPER
// ============================================================================
window.showToast = function (msg = "", timeout = 2500) {
  const toast = document.getElementById("toast");
  const text = document.getElementById("toast-text");
  if (!toast || !text) return;

  text.textContent = msg;
  toast.classList.remove("opacity-0");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.remove("opacity-100");
    toast.classList.add("opacity-0");
  }, timeout);
};
