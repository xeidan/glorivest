// ============================================================================
//  GLOBAL.JS  —  Loaded FIRST on every page
//  Contains ONLY cross-page utilities, API helpers, tab navigation, header load,
//  and global balance visibility logic.
// ============================================================================
const BASE_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const getToken = () => localStorage.getItem('token');
const setToken = (t) => localStorage.setItem('token', t);

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid server response');
  }

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}


// ============================================================================
// 1. BASE API + TOKEN HELPERS
// ============================================================================
window.API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

window.getToken  = () => localStorage.getItem('token');
window.setToken  = (t) => localStorage.setItem('token', t);
window.clearToken = () => localStorage.removeItem('token');


// ============================================================================
// 2. UNIVERSAL FETCH WRAPPER
// ============================================================================
window.apiFetch = async (path, opts = {}) => {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });

  if (res.status === 401) {
    clearToken();
    if (!location.pathname.includes('login')) {
      location.href = '/login.html';
    }
    throw new Error('Unauthorized');
  }

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    throw new Error(data?.message || 'Request failed');
  }

  return data;
};




// ============================================================================
// 3. USER + WALLET LOADERS
// ============================================================================

// Full loader (user + accounts)
window.loadFullUser = async () => {
  const token = getToken();
  if (!token) return { user: null, wallets: [] };

  const user = await apiFetch('/auth/me');
  const wallets = await apiFetch('/wallets');

  return { user, wallets };
};


// ============================================================================
// 4. HEADER LOADER
// ============================================================================
window.loadMe = async () => {
  const token = getToken();
  if (!token) return null;

  try {
    const me = await apiFetch('/auth/me');

    document.querySelectorAll('[data-me="email"]').forEach(el => {
      el.textContent = me.email ?? '';
    });

    return me;
  } catch (e) {
    console.error("loadMe failed:", e);
    return null;
  }
};




// ============================================================================
// 5. GLOBAL SELECTOR
// ============================================================================
window.qs = (id) => document.getElementById(id);



// ============================================================================
// 6. GLOBAL TAB NAVIGATION
// ============================================================================
window.showTab = function (tab) {
  // Hide all top-level tabs
  document.querySelectorAll('.tab-section').forEach(el => {
    el.classList.add('hidden');
  });

  const target = document.getElementById(`tab-${tab}`);
  if (!target) return;

  target.classList.remove('hidden');

  // Update bottom nav
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active-tab', btn.dataset.tab === tab);
  });

  // 🔒 CRITICAL: Trade manages its own internal routing
  if (tab === 'trade' && typeof window.showTradeTabContent === 'function') {
    window.showTradeTabContent('overview');
  }
};

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-refer-now]');
  if (!btn) return;

  window.showTab('earn');
});


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
    const user = await apiFetch('/auth/me');
    if (!user) return;

    const email = user.email || "user@example.com";
    const glorivestId = user.glorivest_id || `GV${String(user.id).padStart(6, '0')}`;
    const initials = email.slice(0, 2).toUpperCase();

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
  const notifOpen = !sheetNotif?.classList.contains("hidden");

  closeGlobalSheet(sheetNotif, sheetNotifBg, sheetNotifPanel, btnNotif);

  if (notifOpen) {
    setTimeout(() => {
      openGlobalSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, btnGuide);
    }, 180);
  } else {
    openGlobalSheet(sheetGuide, sheetGuideBg, sheetGuidePanel, btnGuide);
  }
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







// ===============================
// GLOBAL ACCOUNT MODE
// ===============================
window.__accountMode = localStorage.getItem('accountMode') || 'LIVE';

window.setAccountMode = function (mode) {
  if (!['LIVE', 'DEMO'].includes(mode)) return;

  window.__accountMode = mode;
  localStorage.setItem('accountMode', mode);

  // ❌ do NOT touch UI here
  document.dispatchEvent(new Event('accountMode:changed'));
};



document.addEventListener('accountMode:changed', updateAccountModeTag);



function updateAccountModeTag() {
  const toggle = qs('account-mode-toggle');
  const balance = qs('account-mode-balance');

  if (!toggle || !balance) return;

  const wallets = window.__wallets || [];

  const wallet =
    window.__accountMode === 'DEMO'
      ? wallets.find(w => w.type === 'DEMO')
      : wallets.find(w => w.type === 'REAL');

  toggle.classList.remove('is-demo', 'is-live');
  toggle.classList.add(
    window.__accountMode === 'DEMO' ? 'is-demo' : 'is-live'
  );

  const cents = Number(wallet?.balance_cents || 0);

  balance.textContent = `$${(cents / 100).toLocaleString(undefined,{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  })}`;
}



window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('account-mode-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next =
      window.__accountMode === 'LIVE'
        ? 'DEMO'
        : 'LIVE';

    window.setAccountMode(next);
  });
});


// ===============================
// GLOBAL WALLET STATE (AUTHORITATIVE)
// ===============================
window.loadWallets = async function () {
  const token = localStorage.getItem('token');
  if (!token) {
    window.__wallets = [];
    return;
  }

  const res = await fetch(
    'https://glorivest-api-a16f75b6b330.herokuapp.com/api/wallets',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    console.error('Wallet fetch failed', res.status);
    window.__wallets = [];
    return;
  }

  window.__wallets = await res.json();

  // 🔽🔽🔽 ADD THIS BLOCK 🔽🔽🔽
  const demoWallet = window.__wallets.find(w => w.type === 'DEMO');
  if (demoWallet?.demo_reset_at) {
    const ts = new Date(demoWallet.demo_reset_at).getTime();
    window.__demoResetAt = ts;
    localStorage.setItem('demoResetAt', String(ts));
  }
  // 🔼🔼🔼 END ADDITION 🔼🔼🔼

  updateAccountModeTag();
  document.dispatchEvent(new Event('wallets:refresh'));
};




// Accessors
window.getAllWallets = function () {
  return window.__wallets || [];
};

window.getActiveWallet = function () {
  // legacy helper — default to REAL
  return window.__wallets.find(w => w.type === 'REAL') || null;
};



Object.defineProperty(window, 'loadWallets', {
  writable: false,
  configurable: false
});




window.__demoResetAt = Number(localStorage.getItem('demoResetAt') || 0);




window.addEventListener('DOMContentLoaded', () => {
  updateAccountModeTag();
});