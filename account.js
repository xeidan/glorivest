(() => {
  'use strict';
  const API = window.API_BASE || '';

  let deferredPrompt = null;

  /* ==================================================
     HELPERS
  ================================================== */

  const $ = (sel, root = document) => root.querySelector(sel);

  function toast(msg) {
    if (window.showToast) return window.showToast(msg);
    alert(msg);
  }

  function escapeHtml(str = '') {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  /* ==================================================
     MODAL SYSTEM
  ================================================== */

  function closeModal() {
    $('#settings-modal')?.remove();
  }

  function openModal(title, bodyHtml) {
    closeModal();

    const wrap = document.createElement('div');
    wrap.id = 'settings-modal';

    wrap.className =
'fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4';

    wrap.innerHTML = `
      <div class="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b0b] overflow-hidden shadow-2xl">
        
        <div class="px-5 pt-3 pb-2">
          <div class="w-14 h-1.5 bg-white/15 rounded-full mx-auto mb-4"></div>

          <div class="flex items-center justify-between pb-4 border-b border-white/10">
            <h3 class="text-white text-xl font-semibold">${escapeHtml(title)}</h3>

            <button id="settings-close"
              class="w-10 h-10 rounded-full text-white/60 hover:bg-white/10">
              <span class="text-2xl leading-none">&times;</span>
            </button>
          </div>
        </div>

        <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          ${bodyHtml}
        </div>

      </div>
    `;

    document.body.appendChild(wrap);

    $('#settings-close')?.addEventListener('click', closeModal);

    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) closeModal();
    });
  }

  /* ==================================================
     SECURITY
  ================================================== */

function openSecurity() {
  openModal(
    'Security',
    `
    <div class="space-y-4">

      <div id="security-msg"
        class="hidden rounded-2xl border px-4 py-3 text-sm leading-6">
      </div>

      <div class="rounded-2xl border border-white/10 bg-[#121212] p-4 space-y-3">

  <!-- Current -->
  <div class="relative">
    <input
      id="pw-current"
      type="password"
      placeholder="Current Password"
      class="w-full h-12 pl-4 pr-12 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#00D2B1]"
    >
    <button
      type="button"
      class="toggle-pass absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
      data-target="pw-current"
    >
      <i class="fa-solid fa-eye"></i>
    </button>
  </div>

  <!-- New -->
  <div class="relative">
    <input
      id="pw-new"
      type="password"
      placeholder="New Password"
      class="w-full h-12 pl-4 pr-12 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#00D2B1]"
    >
    <button
      type="button"
      class="toggle-pass absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
      data-target="pw-new"
    >
      <i class="fa-solid fa-eye"></i>
    </button>
  </div>

  <!-- Confirm -->
  <div class="relative">
    <input
      id="pw-confirm"
      type="password"
      placeholder="Confirm New Password"
      class="w-full h-12 pl-4 pr-12 rounded-xl bg-black/30 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[#00D2B1]"
    >
    <button
      type="button"
      class="toggle-pass absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white"
      data-target="pw-confirm"
    >
      <i class="fa-solid fa-eye"></i>
    </button>
  </div>

</div>

      <div class="rounded-2xl border border-[#00D2B1]/20 bg-[#00D2B1]/8 p-4">
        <p class="text-sm text-white/70 leading-7">
          Your new password must contain letters, numbers and symbols.
        </p>
      </div>

      <button
        id="save-password"
        class="w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold">
        Send Verification Code
      </button>

    </div>
    `
  );

document.querySelectorAll('.toggle-pass').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;

    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';

    btn.innerHTML = hidden
      ? '<i class="fa-solid fa-eye-slash"></i>'
      : '<i class="fa-solid fa-eye"></i>';
  });
});

  const box = $('#security-msg');

  function showMsg(text, ok = false) {
    box.className =
      'rounded-2xl border px-4 py-3 text-sm leading-6';

    if (ok) {
      box.classList.add(
        'border-[#00D2B1]/30',
        'bg-[#00D2B1]/10',
        'text-[#7CF7E3]'
      );
    } else {
      box.classList.add(
        'border-red-500/30',
        'bg-red-500/10',
        'text-red-300'
      );
    }

    box.textContent = text;
  }

  $('#save-password')?.addEventListener('click', async () => {
    const btn = $('#save-password');

    const currentPassword = $('#pw-current').value.trim();
    const newPassword = $('#pw-new').value.trim();
    const confirmPassword = $('#pw-confirm').value.trim();

    if (!currentPassword) return showMsg('Enter current password');
    if (!newPassword) return showMsg('Enter new password');
    if (newPassword !== confirmPassword) {
      return showMsg('Passwords do not match');
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Sending...';

      const token = localStorage.getItem('token');

      const res = await fetch(`${API}/auth/change-password/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        return showMsg(data.message || 'Request failed');
      }

      openPasswordOtpModal();

    } catch (err) {
      showMsg('Network error');
    } finally {
      const live = $('#save-password');
      if (live) {
        live.disabled = false;
        live.textContent = 'Send Verification Code';
      }
    }
  });
}

function openPasswordOtpModal() {
  openModal(
    'Verify Code',
    `
    <div class="space-y-4">

      <div id="otp-msg"
        class="hidden rounded-2xl border px-4 py-3 text-sm leading-6">
      </div>

      <div class="rounded-2xl border border-white/10 bg-[#121212] p-4">
        <input
          id="pw-otp"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          class="w-full h-14 px-4 rounded-xl bg-black/30 border border-white/10 text-white text-center text-2xl tracking-[0.35em] placeholder-white/20 outline-none focus:border-[#00D2B1]"
        >
      </div>

      <button
        id="confirm-password-otp"
        class="w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold">
        Confirm Password Change
      </button>

    </div>
    `
  );

  const box = $('#otp-msg');

  function showOtp(text, ok = false) {
    box.className =
      'rounded-2xl border px-4 py-3 text-sm leading-6';

    if (ok) {
      box.classList.add(
        'border-[#00D2B1]/30',
        'bg-[#00D2B1]/10',
        'text-[#7CF7E3]'
      );
    } else {
      box.classList.add(
        'border-red-500/30',
        'bg-red-500/10',
        'text-red-300'
      );
    }

    box.textContent = text;
  }

  $('#confirm-password-otp')?.addEventListener('click', async () => {
    const btn = $('#confirm-password-otp');
    const code = $('#pw-otp').value.replace(/\D/g, '').trim();

    if (code.length !== 6) {
      return showOtp('Enter valid 6-digit code');
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Verifying...';

      const token = localStorage.getItem('token');

      const res = await fetch(`${API}/auth/change-password/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (!res.ok) {
        return showOtp(data.message || 'Verification failed');
      }

      showOtp('Password updated. Redirecting...', true);

      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }, 900);

    } catch (err) {
      showOtp('Network error');
    } finally {
      const live = $('#confirm-password-otp');
      if (live) {
        live.disabled = false;
        live.textContent = 'Confirm Password Change';
      }
    }
  });
}

/* ==================================================
   INSTALL APP
================================================== */

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function isiPhone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

function openInstallModal() {
  const modal = document.getElementById('install-modal');
  if (!modal) return;

  const title = document.getElementById('install-title');
  const subtitle = document.getElementById('install-subtitle');
  const steps = document.getElementById('install-steps');
  const actions = document.getElementById('install-actions');
  const confirmBtn = document.getElementById('confirm-install');

  steps.innerHTML = '';
  steps.classList.add('hidden');

  if (deferredPrompt) {
    title.textContent = 'Install App';
    subtitle.textContent =
      'Add Glorivest to your home screen for faster access.';
    actions.classList.remove('grid');
    actions.classList.add('grid');
    confirmBtn.textContent = 'Install';
  } else {
    title.textContent = 'Install App';
    subtitle.textContent = 'Use your browser menu to add Glorivest.';

    steps.classList.remove('hidden');

    if (isiPhone() && isSafari()) {
      steps.innerHTML = `
        <div>1. Tap the Share icon in Safari</div>
        <div>2. Scroll down</div>
        <div>3. Tap <strong>Add to Home Screen</strong></div>
      `;
    } else {
      steps.innerHTML = `
        <div>1. Open your browser menu</div>
        <div>2. Find <strong>Install App</strong> or <strong>Add to Home Screen</strong></div>
        <div>3. Confirm installation</div>
      `;
    }

    actions.classList.remove('grid-cols-2');
    actions.classList.add('grid-cols-1');
    confirmBtn.textContent = 'Got it';
  }

  modal.classList.remove('hidden');
}

function closeInstallModal() {
  document.getElementById('install-modal')?.classList.add('hidden');
}

async function handleInstall() {
  openInstallModal();
}

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-action="install"]')) {
    handleInstall();
  }

  if (e.target.closest('#confirm-install')) {
    if (!deferredPrompt) {
      closeInstallModal();
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    closeInstallModal();
  }
});

  /* ==================================================
     LOGOUT
  ================================================== */

  function handleLogout() {
    openModal(
      'Log Out',
      `
      <div class="space-y-4">

        <div class="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <p class="text-white/75 text-sm leading-7">
            Are you sure you want to log out of your account?
          </p>
        </div>

        <button
          id="confirm-logout"
          class="w-full h-12 rounded-xl bg-red-500 text-white font-semibold">
          Yes, Log Out
        </button>

        <button
          id="cancel-logout"
          class="w-full h-12 rounded-xl border border-white/10 text-white">
          Cancel
        </button>

      </div>
      `
    );

    $('#cancel-logout')?.addEventListener('click', closeModal);

    $('#confirm-logout')?.addEventListener('click', () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    });
  }


  /* ==================================================
   CONTACT SUPPORT
================================================== */

function openSupportModal() {
  openModal(
    'Contact Support',
    `
    <div class="space-y-4">

      <div class="rounded-2xl border border-white/10 bg-[#121212] p-4">
        <p class="text-sm text-white/70 leading-7">
          Need help with deposits, withdrawals, verification or account access?
          Our support team is available to assist you.
        </p>
      </div>

      <div class="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
        <p class="text-xs uppercase tracking-[0.18em] text-white/35 mb-2">
          Support Email
        </p>

        <div class="flex items-center justify-between gap-3">
          <span
            id="support-email-text"
            class="text-white font-medium break-all"
          >
            support@glorivest.com
          </span>

          <button
            type="button"
            id="copy-support-email"
            class="shrink-0 px-3 h-9 rounded-xl bg-white/5 text-white/70 text-sm"
          >
            Copy
          </button>
        </div>
      </div>

      <button
        id="open-support-email"
        class="w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold"
      >
        Open Email App
      </button>

      <button
        id="close-support-modal"
        class="w-full h-12 rounded-xl border border-white/10 text-white"
      >
        Cancel
      </button>

    </div>
    `
  );

  $('#close-support-modal')?.addEventListener('click', closeModal);

  $('#open-support-email')?.addEventListener('click', () => {
    window.location.href = 'mailto:support@glorivest.com';
  });

  $('#copy-support-email')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('support@glorivest.com');

      const btn = $('#copy-support-email');
      if (!btn) return;

      const old = btn.textContent;
      btn.textContent = 'Copied';

      setTimeout(() => {
        btn.textContent = old;
      }, 1200);

    } catch {
      const el = document.createElement('textarea');
      el.value = 'support@glorivest.com';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
  });
}


/* ==================================================
   NOTIFICATIONS
================================================== */

async function openNotificationsSheet() {
  const sheet = document.getElementById('sheet-notifications');
  const backdrop = document.getElementById('sheet-notifications-backdrop');
  const panel = document.getElementById('sheet-notifications-panel');

  if (!sheet || !backdrop || !panel) return;

  sheet.classList.remove('hidden');

  requestAnimationFrame(() => {
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');

    panel.classList.remove('translate-y-full');
    panel.classList.add('translate-y-0');
  });

  await loadNotifications();
}

function closeNotificationsSheet() {
  const sheet = document.getElementById('sheet-notifications');
  const backdrop = document.getElementById('sheet-notifications-backdrop');
  const panel = document.getElementById('sheet-notifications-panel');

  if (!sheet || !backdrop || !panel) return;

  backdrop.classList.remove('opacity-100');
  backdrop.classList.add('opacity-0');

  panel.classList.remove('translate-y-0');
  panel.classList.add('translate-y-full');

  setTimeout(() => sheet.classList.add('hidden'), 300);
}

async function loadNotifications() {
  const wrap = document.getElementById('notifications-list');
  if (!wrap) return;

  wrap.innerHTML = loadingCard();

  try {
    const token = localStorage.getItem('token');

    const res = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const items = await res.json();

    if (!res.ok) throw new Error();

    updateBellBadge(items);

    if (!items.length) {
      wrap.innerHTML = emptyNotifications();
      return;
    }

    wrap.innerHTML = items.map(renderNotificationCard).join('');
    

    markAllNotificationsRead(token);
    bindNotificationActions();

  } catch {
    wrap.innerHTML = errorNotifications();
  }
}

function renderNotificationCard(item) {
  const unread = !item.is_read;

  return `
    <div
      class="notification-card overflow-hidden rounded-2xl border ${unread ? 'border-[#00D2B1]/15' : 'border-white/10'} bg-[#111111]"
      data-id="${item.id}"
    >
      <div class="delete-zone hidden bg-red-600 text-white text-sm font-semibold items-center justify-center w-20">
        Delete
      </div>

      <div class="card-body p-4 transition-transform duration-200">
        <div class="flex gap-3">

          <div class="w-10 h-10 rounded-2xl bg-[#00D2B1]/10 text-[#00D2B1] flex items-center justify-center shrink-0">
            <i class="fa-solid fa-bell text-sm"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <h3 class="text-white font-semibold leading-6">
                ${escapeHtml(item.title)}
              </h3>

              ${unread ? '<span class="w-2 h-2 rounded-full bg-[#00D2B1] mt-2 shrink-0"></span>' : ''}
            </div>

            <p class="text-sm text-white/50 leading-6 mt-1">
              ${escapeHtml(item.message)}
            </p>

            <p class="text-xs text-white/28 mt-3">
              ${timeAgo(item.created_at)}
            </p>
          </div>

        </div>
      </div>
    </div>
  `;
}

async function markAllNotificationsRead(token) {
  try {
    await fetch(`${API}/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {}
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);

  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;

  return new Date(date).toLocaleDateString();
}



function updateBellBadge(items = []) {
  const badge = document.querySelector('[data-bell-badge]');
  if (!badge) return;

  const unread = items.filter(n => !n.is_read).length;

  if (!unread) {
    badge.classList.add('hidden');
    badge.textContent = '';
    return;
  }

  badge.classList.remove('hidden');
  badge.textContent = unread > 9 ? '9+' : unread;
}

function loadingCard() {
  return `
    <div class="rounded-2xl border border-white/10 bg-[#121212] p-5 text-center text-sm text-white/45">
      Loading...
    </div>
  `;
}

function emptyNotifications() {
  return `
    <div class="rounded-2xl border border-white/10 bg-[#121212] p-8 text-center space-y-2">
      <p class="text-white/70 font-medium">You're all caught up</p>
      <p class="text-sm text-white/40">No new notifications</p>
    </div>
  `;
}

function errorNotifications() {
  return `
    <div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center text-sm text-red-300">
      Failed to load notifications
    </div>
  `;
}

function bindNotificationActions() {
  document.querySelectorAll('[data-mark-read]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.markRead;
      const token = localStorage.getItem('token');

      try {
        await fetch(`${API}/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });

        loadNotifications();
      } catch {}
    };
  });
}



function bindDeleteButtons() {
  document.querySelectorAll('[data-delete]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.delete;
      await deleteNotification(id);
    };
  });
}

async function deleteNotification(id) {
  const token = localStorage.getItem('token');

  try {
    await fetch(`${API}/notifications/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.style.height = `${card.offsetHeight}px`;

      requestAnimationFrame(() => {
        card.style.opacity = '0';
        card.style.transform = 'scale(.96)';
        card.style.height = '0px';
        card.style.margin = '0px';
      });

      setTimeout(() => loadNotifications(), 220);
    }

  } catch {}
}


function bindClearAll() {
  const btn = document.getElementById('clear-notifications');
  if (!btn) return;

  btn.onclick = async () => {
    const token = localStorage.getItem('token');

    try {
      await fetch(`${API}/notifications`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      loadNotifications();

    } catch {}
  };
}


function bindSwipeDelete() {
  document.querySelectorAll('.notification-card').forEach(card => {
    const body = card.querySelector('.card-body');
    const zone = card.querySelector('.delete-zone');
    const id = card.dataset.id;

    if (!body || !zone) return;

    let startX = 0;
    let currentX = 0;
    let dragging = false;

    body.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      currentX = startX;
      dragging = true;
    }, { passive: true });

    body.addEventListener('touchmove', (e) => {
      if (!dragging) return;

      currentX = e.touches[0].clientX;
      const diff = currentX - startX;

      if (diff < 0) {
        zone.classList.remove('hidden');
        zone.classList.add('flex');

        body.style.transform =
          `translateX(${Math.max(diff, -80)}px)`;
      }
    }, { passive: true });

    body.addEventListener('touchend', async () => {
      if (!dragging) return;
      dragging = false;

      const moved = currentX - startX;

      if (moved < -70) {
        await deleteNotification(id);
        return;
      }

      body.style.transform = 'translateX(0)';

      zone.classList.add('hidden');
      zone.classList.remove('flex');
    });
  });
}

function bindNotificationActions() {
  bindDeleteButtons();
  bindClearAll();
  bindSwipeDelete();
}

document
  .getElementById('sheet-notifications-backdrop')
  ?.addEventListener('click', closeNotificationsSheet);

 /* ==================================================
     GLOBAL ACTIONS
  ================================================== */

  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) return;

    switch (item.dataset.action) {
      case 'security':
        return openSecurity();

      case 'support':
        return openSupportModal();

      case 'terms':
        return window.open('/terms', '_blank');

      case 'logout':
        return handleLogout();

      case 'notifications':
        return openNotificationsSheet();

      default:
        return;
    }
  });
})();
