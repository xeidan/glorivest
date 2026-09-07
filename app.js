// ============================================================================
// GLOBAL.JS
// Loaded FIRST on every page.
//
// Contains:
// - API configuration
// - authentication/token helpers
// - universal API fetch wrapper
// - user/account loading helpers
// - global DOM selector
// - top-level tab navigation
// - user header loading
// ============================================================================


// ============================================================================
// 1. BASE API + TOKEN HELPERS
// ============================================================================

window.API_BASE =
  'https://glorivest-api-production.up.railway.app/api';

window.getToken = function () {
  return localStorage.getItem('token');
};

window.setToken = function (token) {
  localStorage.setItem('token', token);
};

window.clearToken = function () {
  localStorage.removeItem('token');
};


// ============================================================================
// 2. UNIVERSAL API FETCH WRAPPER
// ============================================================================

window.apiFetch = async function (path, opts = {}) {
  const token = window.getToken();

  const res = await fetch(`${window.API_BASE}${path}`, {
    method: opts.method || 'GET',

    headers: {
      'Content-Type': 'application/json',

      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}),

      ...(opts.headers || {})
    },

    body: opts.body
      ? JSON.stringify(opts.body)
      : undefined
  });

  const contentType =
    res.headers.get('content-type') || '';

  const data =
    contentType.includes('application/json')
      ? await res.json()
      : await res.text();


  // ==========================================================================
  // MAINTENANCE MODE
  // ==========================================================================

  if (
    res.status === 503 &&
    data &&
    typeof data === 'object' &&
    data.maintenance
  ) {
    sessionStorage.setItem(
      'glorivest-maintenance',
      JSON.stringify(data)
    );

    const maintenanceUrl = new URL(
      'maintenance.html',
      window.location.href
    );

    window.location.replace(
      maintenanceUrl.href
    );

    return;
  }


  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  if (res.status === 401) {
    window.clearToken();

    if (
      !window.location.pathname.includes('login')
    ) {
      window.location.href =
        '/index.html?login=1';
    }

    throw new Error('Unauthorized');
  }


  // ==========================================================================
  // OTHER API ERRORS
  // ==========================================================================

  if (!res.ok) {
    throw new Error(
      data &&
      typeof data === 'object' &&
      data.message
        ? data.message
        : 'Request failed'
    );
  }

  return data;
};


// ============================================================================
// 3. USER + ACCOUNT LOADER
// ============================================================================

window.loadFullUser = async function () {
  const token = window.getToken();

  if (!token) {
    return {
      user: null,
      accounts: []
    };
  }

  const user =
    await window.apiFetch('/auth/me');

  return {
    user,
    accounts: Array.isArray(user?.accounts)
      ? user.accounts
      : []
  };
};


// ============================================================================
// 4. HEADER / CURRENT USER LOADER
// ============================================================================

window.loadMe = async function () {
  const token = window.getToken();

  if (!token) {
    return null;
  }

  try {
    const me =
      await window.apiFetch('/auth/me');

    document
      .querySelectorAll('[data-me="email"]')
      .forEach(el => {
        el.textContent = me.email ?? '';
      });

    return me;

  } catch (err) {
    console.error(
      'loadMe failed:',
      err
    );

    return null;
  }
};


// ============================================================================
// 5. GLOBAL DOM SELECTOR
// ============================================================================

window.qs = function (id) {
  return document.getElementById(id);
};


// ============================================================================
// 6. GLOBAL TOP-LEVEL TAB NAVIGATION
// ============================================================================

window.showTab = function (tab) {

  // Hide all top-level tab sections.
  document
    .querySelectorAll('.tab-section')
    .forEach(section => {
      section.classList.add('hidden');
    });


  // Find requested tab.
  const target =
    document.getElementById(`tab-${tab}`);

  if (!target) {
    return;
  }


  // Show requested tab.
  target.classList.remove('hidden');


  // Update bottom navigation state.
  document
    .querySelectorAll('[data-tab]')
    .forEach(button => {
      button.classList.toggle(
        'active-tab',
        button.dataset.tab === tab
      );
    });


  // Trade owns its own internal navigation.
  if (
    tab === 'trade' &&
    typeof window.showTradeTabContent === 'function'
  ) {
    window.showTradeTabContent('overview');
  }
};


// ============================================================================
// REFER NOW → EARN TAB
// ============================================================================

document.addEventListener(
  'click',
  function (event) {

    const button =
      event.target.closest(
        '[data-refer-now]'
      );

    if (!button) {
      return;
    }

    window.showTab('earn');
  }
);


// ============================================================================
// INITIALIZE TOP-LEVEL TABS
// ============================================================================

document.addEventListener(
  'DOMContentLoaded',
  function () {

    const tabButtons =
      document.querySelectorAll(
        '.tab-btn'
      );

    tabButtons.forEach(button => {

      button.addEventListener(
        'click',
        function () {

          window.showTab(
            button.dataset.tab
          );

        }
      );

    });


    // Dashboard is the default tab.
    window.showTab('dashboard');

  }
);


// ============================================================================
// 7. USER HEADER LOADING
// ============================================================================

async function loadUserHeader() {

  try {

    const user =
      await window.apiFetch('/auth/me');

    if (!user) {
      return;
    }


    const email =
      user.email ||
      'user@example.com';

    const glorivestId =
      user.glorivest_id ||
      `GV${String(user.id).padStart(6, '0')}`;

    const initials =
      email
        .slice(0, 2)
        .toUpperCase();


    const emailElement =
      window.qs('user-email');

    const idElement =
      window.qs('glorivest-id');

    const initialsElement =
      window.qs('user-initials');


    if (emailElement) {
      emailElement.textContent =
        email;
    }

    if (idElement) {
      idElement.textContent =
        glorivestId;
    }

    if (initialsElement) {
      initialsElement.textContent =
        initials;
    }

  } catch (err) {

    console.error(
      'Error loading user header:',
      err
    );

  }
}


window.addEventListener(
  'DOMContentLoaded',
  loadUserHeader
);

// ============================================================================
// 8. GLOBAL SHEET SYSTEM — Notifications & Guide
// ============================================================================


// ============================================================================
// GLOBAL SHEET ELEMENTS
// ============================================================================

const sheetNotif =
  qs('sheet-notifications');

const sheetNotifBg =
  qs('sheet-notifications-backdrop');

const sheetNotifPanel =
  qs('sheet-notifications-panel');


const sheetGuide =
  qs('sheet-guide');

const sheetGuideBg =
  qs('sheet-guide-backdrop');

const sheetGuidePanel =
  qs('sheet-guide-panel');


const btnNotif =
  qs('btn-open-notifications');

const btnGuide =
  qs('btn-open-guide');


// ============================================================================
// RESET ACTIVE ICONS
// ============================================================================

function clearIconActive() {
  btnNotif?.classList.remove('icon-active');
  btnGuide?.classList.remove('icon-active');
}


// ============================================================================
// OPEN GLOBAL SHEET
// ============================================================================

function openGlobalSheet(
  sheet,
  backdrop,
  panel,
  triggerBtn
) {
  if (!sheet || !backdrop || !panel) {
    return;
  }

  sheet.classList.remove('hidden');

  clearIconActive();

  triggerBtn?.classList.add('icon-active');

  requestAnimationFrame(() => {
    backdrop.classList.add('opacity-100');
    panel.classList.remove('translate-y-full');
  });
}


// ============================================================================
// CLOSE GLOBAL SHEET
// ============================================================================

function closeGlobalSheet(
  sheet,
  backdrop,
  panel,
  triggerBtn
) {
  if (!sheet || !backdrop || !panel) {
    return;
  }

  backdrop.classList.remove('opacity-100');

  panel.classList.add('translate-y-full');

  triggerBtn?.classList.remove('icon-active');

  setTimeout(() => {
    sheet.classList.add('hidden');
  }, 220);
}


// ============================================================================
// DRAG-TO-CLOSE
// ============================================================================

function attachGlobalDrag(
  panel,
  closeFn
) {
  if (!panel) {
    return;
  }

  let startY = 0;
  let dragging = false;


  function start(e) {
    dragging = true;

    startY =
      e.touches
        ? e.touches[0].clientY
        : e.clientY;

    panel.style.transition = 'none';
  }


  function move(e) {
    if (!dragging) {
      return;
    }

    const y =
      e.touches
        ? e.touches[0].clientY
        : e.clientY;

    const dy =
      Math.max(0, y - startY);

    panel.style.transform =
      `translateY(${dy}px)`;
  }


  function end() {
    if (!dragging) {
      return;
    }

    dragging = false;

    const transform =
      panel.style.transform || '';

    const match =
      transform.match(
        /translateY\(([-\d.]+)px\)/
      );

    const dy =
      match
        ? parseFloat(match[1])
        : 0;

    panel.style.transition = '';

    if (dy > 70) {
      closeFn();
    } else {
      panel.style.transform = '';
    }
  }


  panel.addEventListener(
    'mousedown',
    start
  );

  panel.addEventListener(
    'touchstart',
    start,
    { passive: true }
  );


  window.addEventListener(
    'mousemove',
    move
  );

  window.addEventListener(
    'touchmove',
    move,
    { passive: true }
  );


  window.addEventListener(
    'mouseup',
    end
  );

  window.addEventListener(
    'touchend',
    end
  );
}


// ============================================================================
// ATTACH SHEET DRAG HANDLERS
// ============================================================================

if (sheetNotifPanel) {
  attachGlobalDrag(
    sheetNotifPanel,
    () =>
      closeGlobalSheet(
        sheetNotif,
        sheetNotifBg,
        sheetNotifPanel,
        btnNotif
      )
  );
}


if (sheetGuidePanel) {
  attachGlobalDrag(
    sheetGuidePanel,
    () =>
      closeGlobalSheet(
        sheetGuide,
        sheetGuideBg,
        sheetGuidePanel,
        btnGuide
      )
  );
}


// ============================================================================
// NOTIFICATIONS BUTTON
// ============================================================================

btnNotif?.addEventListener(
  'click',
  () => {

    closeGlobalSheet(
      sheetGuide,
      sheetGuideBg,
      sheetGuidePanel,
      btnGuide
    );

    setTimeout(() => {

      openGlobalSheet(
        sheetNotif,
        sheetNotifBg,
        sheetNotifPanel,
        btnNotif
      );

    }, 120);
  }
);


// ============================================================================
// GUIDE BUTTON
// ============================================================================

btnGuide?.addEventListener(
  'click',
  () => {

    const notificationOpen =
      !sheetNotif?.classList.contains('hidden');


    closeGlobalSheet(
      sheetNotif,
      sheetNotifBg,
      sheetNotifPanel,
      btnNotif
    );


    if (notificationOpen) {

      setTimeout(() => {

        openGlobalSheet(
          sheetGuide,
          sheetGuideBg,
          sheetGuidePanel,
          btnGuide
        );

      }, 180);

    } else {

      openGlobalSheet(
        sheetGuide,
        sheetGuideBg,
        sheetGuidePanel,
        btnGuide
      );

    }
  }
);


// ============================================================================
// BACKDROP CLOSE
// ============================================================================

sheetNotifBg?.addEventListener(
  'click',
  () =>
    closeGlobalSheet(
      sheetNotif,
      sheetNotifBg,
      sheetNotifPanel,
      btnNotif
    )
);


sheetGuideBg?.addEventListener(
  'click',
  () =>
    closeGlobalSheet(
      sheetGuide,
      sheetGuideBg,
      sheetGuidePanel,
      btnGuide
    )
);


// ============================================================================
// GLOBAL TOAST HELPER
// ============================================================================

window.showToast = function (
  msg = '',
  timeout = 2500
) {
  const toast =
    document.getElementById('toast');

  const text =
    document.getElementById('toast-text');

  if (!toast || !text) {
    return;
  }

  text.textContent = msg;

  toast.classList.remove(
    'opacity-0'
  );

  toast.classList.add(
    'opacity-100'
  );


  setTimeout(() => {

    toast.classList.remove(
      'opacity-100'
    );

    toast.classList.add(
      'opacity-0'
    );

  }, timeout);
};


// ============================================================================
// GLOBAL ACCOUNT MODE
// ============================================================================
//
// Current supported modes:
//   LIVE
//   DEMO
//
// This value controls which account is displayed by the dashboard.
// It does NOT itself modify account balances.
// ============================================================================

window.__accountMode =
  localStorage.getItem('accountMode') || 'LIVE';


window.setAccountMode = function (mode) {

  const normalized =
    String(mode || '').toUpperCase();


  if (
    !['LIVE', 'DEMO'].includes(
      normalized
    )
  ) {
    return;
  }


  window.__accountMode =
    normalized;


  localStorage.setItem(
    'accountMode',
    normalized
  );


  // Other dashboard components listen
  // for this event and refresh themselves.
  document.dispatchEvent(
    new Event('accountMode:changed')
  );
};


// ============================================================================
// NORMALIZED ACTIVE ACCOUNT LOOKUP
// ============================================================================

function getAccountForMode(mode) {

  const wallets =
    window.__wallets || [];


  const normalizedMode =
    String(mode || '').toUpperCase();


  return wallets.find(
    wallet =>
      String(wallet.type || '').toUpperCase() ===
      normalizedMode
  ) || null;
}


// ============================================================================
// UPDATE HEADER ACCOUNT MODE + BALANCE
// ============================================================================

function updateAccountModeTag() {

  const toggle =
    qs('account-mode-toggle');

  const balance =
    qs('account-mode-balance');


  if (!toggle || !balance) {
    return;
  }


  const mode =
    window.__accountMode === 'DEMO'
      ? 'DEMO'
      : 'LIVE';


  const account =
    getAccountForMode(mode);


  // Update toggle styling.
  toggle.classList.remove(
    'is-demo',
    'is-live'
  );


  toggle.classList.add(
    mode === 'DEMO'
      ? 'is-demo'
      : 'is-live'
  );


  // Account balances are stored in cents.
  const cents =
    Number(
      account?.balance_cents || 0
    );


  const dollars =
    cents / 100;


  balance.textContent =
    `$${dollars.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;
}


// Make it available to the rest of the dashboard.
window.updateAccountModeTag =
  updateAccountModeTag;


// ============================================================================
// ACCOUNT MODE CHANGE LISTENER
// ============================================================================

document.addEventListener(
  'accountMode:changed',
  () => {

    updateAccountModeTag();

    // Tell other dashboard components
    // that the selected account changed.
    document.dispatchEvent(
      new Event('wallets:refresh')
    );

  }
);


// ============================================================================
// ACCOUNT MODE TOGGLE
// ============================================================================

window.addEventListener(
  'DOMContentLoaded',
  () => {

    const btn =
      document.getElementById(
        'account-mode-toggle'
      );


    if (!btn) {
      return;
    }


    btn.addEventListener(
      'click',
      () => {

        const next =
          window.__accountMode === 'LIVE'
            ? 'DEMO'
            : 'LIVE';


        window.setAccountMode(
          next
        );

      }
    );

  }
);


// ============================================================================
// GLOBAL ACCOUNT STATE
// ============================================================================
//
// IMPORTANT:
//
// The current financial engine has separate account records:
//
//   DEMO
//   LIVE
//   REFERRAL
//
// We must NOT determine LIVE by saying:
//     "anything that isn't DEMO is LIVE"
//
// Instead:
//   1. Prefer account_type from the API.
//   2. Fall back to account_code.
//   3. Only use tier as a legacy fallback.
//
// /accounts is the authoritative account endpoint.
// ============================================================================

window.loadWallets = async function () {

  const token =
    window.getToken();


  if (!token) {

    window.__accounts = [];
    window.__wallets = [];

    updateAccountModeTag();

    return;

  }


  try {

    const accounts =
      await window.apiFetch(
        '/accounts'
      );


    if (!Array.isArray(accounts)) {
      throw new Error(
        'Invalid accounts response'
      );
    }


    // Preserve the raw API response.
    window.__accounts =
      accounts;


    // Normalize account records for
    // the rest of the frontend.
    window.__wallets =
      accounts.map(account => {

        const accountType =
          String(
            account.account_type || ''
          ).toUpperCase();


        const accountCode =
          String(
            account.account_code || ''
          ).toUpperCase();


        const tierSlug =
          String(
            account.tier_slug ||
            account.tier ||
            ''
          ).toLowerCase();


        let type = null;


        // ------------------------------------------------
        // 1. Explicit account_type
        // ------------------------------------------------

        if (
          accountType === 'DEMO'
        ) {
          type = 'DEMO';

        } else if (
          accountType === 'LIVE'
        ) {
          type = 'LIVE';

        } else if (
          accountType === 'REFERRAL'
        ) {
          type = 'REFERRAL';
        }


        // ------------------------------------------------
        // 2. Account-code fallback
        // ------------------------------------------------

        if (!type) {

          if (
            accountCode.includes('-DEM')
          ) {
            type = 'DEMO';

          } else if (
            accountCode.includes('-LIVE')
          ) {
            type = 'LIVE';

          } else if (
            accountCode.startsWith('REF-')
          ) {
            type = 'REFERRAL';
          }

        }


        // ------------------------------------------------
        // 3. Legacy tier fallback
        // ------------------------------------------------

        if (!type) {

          if (
            tierSlug === 'demo'
          ) {
            type = 'DEMO';

          } else {
            type = 'LIVE';
          }

        }


        return {

          id:
            account.id,

          code:
            account.account_code,

          account_code:
            account.account_code,

          type,

          account_type:
            accountType || type,

          balance_cents:
            Number(
              account.balance_cents || 0
            ),

          locked_balance_cents:
            Number(
              account.locked_balance_cents || 0
            ),

          profit_cents:
            Number(
              account.profit_cents || 0
            ),

          status:
            account.status,

          tier_id:
            account.tier_id,

          tier_name:
            account.tier_name,

          tier_slug:
            account.tier_slug

        };

      });





    // Update header immediately.
    updateAccountModeTag();


    // Notify dashboard components.
    document.dispatchEvent(
      new Event('wallets:refresh')
    );


  } catch (err) {

    console.error(
      '[ACCOUNTS] Failed to load accounts:',
      err
    );


    window.__accounts = [];
    window.__wallets = [];


    updateAccountModeTag();

  }
};


// ============================================================================
// GLOBAL ACCOUNT ACCESSORS
// ============================================================================

window.getAllWallets = function () {

  return window.__wallets || [];

};


window.getActiveWallet = function () {

  return getAccountForMode(
    window.__accountMode
  );

};


// ============================================================================
// PREVENT ACCIDENTAL REPLACEMENT OF loadWallets
// ============================================================================

Object.defineProperty(
  window,
  'loadWallets',
  {
    writable: false,
    configurable: false
  }
);


// ============================================================================
// DEMO RESET STATE
// ============================================================================

window.__demoResetAt =
  Number(
    localStorage.getItem(
      'demoResetAt'
    ) || 0
  );


// ============================================================================
// INITIAL ACCOUNT MODE DISPLAY
// ============================================================================

window.addEventListener(
  'DOMContentLoaded',
  () => {

    updateAccountModeTag();

  }
);