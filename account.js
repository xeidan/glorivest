(() => {
  'use strict';

  const API = window.API_BASE || '';
  let deferredPrompt = null;

  const installBtn = document.querySelector('[data-action="install"]');

  /* ==================================================
     UTILITIES
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

  function getProfile() {
    return JSON.parse(localStorage.getItem('gv_profile') || '{}');
  }

  function saveProfile(data) {
    localStorage.setItem('gv_profile', JSON.stringify(data));
  }

  function getPrefs() {
    return JSON.parse(localStorage.getItem('gv_prefs') || '{}');
  }

  function savePrefs(data) {
    localStorage.setItem('gv_prefs', JSON.stringify(data));
  }

  /* ==================================================
     MODAL SYSTEM
  ================================================== */

  function closeModal() {
    const modal = $('#settings-modal');
    if (modal) modal.remove();
  }

  function openModal(title, bodyHtml) {
    closeModal();

    const wrap = document.createElement('div');
    wrap.id = 'settings-modal';
    wrap.className =
      'fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4';

    wrap.innerHTML = `
      <div class="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0b0b] overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 class="text-white text-lg font-semibold">${escapeHtml(title)}</h3>
          <button id="settings-close"
            class="w-10 h-10 rounded-full text-white/60 hover:bg-white/10">
            <span class="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <div class="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
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
     PROFILE
  ================================================== */

  function openProfile() {
    const profile = getProfile();

    openModal(
      'Edit Profile',
      `
      <input id="pf-name" placeholder="Full Name"
        value="${escapeHtml(profile.name || '')}"
        class="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/10 text-white">

      <input id="pf-phone" placeholder="Phone Number"
        value="${escapeHtml(profile.phone || '')}"
        class="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/10 text-white">

      <input id="pf-country" placeholder="Country"
        value="${escapeHtml(profile.country || '')}"
        class="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/10 text-white">

      <button id="save-profile"
        class="w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold">
        Save Changes
      </button>
    `
    );

    $('#save-profile')?.addEventListener('click', () => {
      const data = {
        name: $('#pf-name').value.trim(),
        phone: $('#pf-phone').value.trim(),
        country: $('#pf-country').value.trim()
      };

      saveProfile(data);
      toast('Profile updated');
      closeModal();
    });
  }

  /* ==================================================
     SECURITY
  ================================================== */

  function openSecurity() {
    openModal(
      'Security Settings',
      `
      <input id="pw-current" type="password" placeholder="Current Password"
        class="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/10 text-white">

      <input id="pw-new" type="password" placeholder="New Password"
        class="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/10 text-white">

      <input id="pw-confirm" type="password" placeholder="Confirm New Password"
        class="w-full h-12 px-4 rounded-xl bg-[#121212] border border-white/10 text-white">

      <button id="save-password"
        class="w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold">
        Update Password
      </button>

      <p class="text-xs text-white/40 text-center">
        Backend connection can be added later.
      </p>
    `
    );

    $('#save-password')?.addEventListener('click', () => {
      const next = $('#pw-new').value.trim();
      const confirm = $('#pw-confirm').value.trim();

      if (next.length < 6) return toast('Password too short');
      if (next !== confirm) return toast('Passwords do not match');

      toast('Password UI ready');
      closeModal();
    });
  }

  /* ==================================================
     NOTIFICATIONS
  ================================================== */

  function openNotificationsPrefs() {
    const prefs = getPrefs();

    const row = (key, label) => `
      <label class="flex items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-4 py-3">
        <span class="text-white">${label}</span>
        <input type="checkbox" data-pref="${key}" ${prefs[key] ? 'checked' : ''}>
      </label>
    `;

    openModal(
      'Notifications',
      `
      <div class="space-y-3">
        ${row('deposit', 'Deposit Alerts')}
        ${row('withdrawal', 'Withdrawal Alerts')}
        ${row('cycle', 'Cycle Updates')}
        ${row('promo', 'Promotions')}
      </div>

      <button id="save-prefs"
        class="w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold">
        Save Preferences
      </button>
    `
    );

    $('#save-prefs')?.addEventListener('click', () => {
      const next = {};
      document.querySelectorAll('[data-pref]').forEach((el) => {
        next[el.dataset.pref] = el.checked;
      });

      savePrefs(next);
      toast('Preferences saved');
      closeModal();
    });
  }

  /* ==================================================
     KYC
  ================================================== */

  function openKYC() {
    openModal(
      'KYC Verification',
      `
      <div class="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-center">
        <p class="text-yellow-300 font-semibold">Pending</p>
        <p class="text-sm text-white/60 mt-2">
          Verification upload flow can be connected next.
        </p>
      </div>

      <button class="w-full h-12 rounded-xl border border-white/10 text-white">
        Upload Documents
      </button>
    `
    );
  }

  /* ==================================================
     INSTALL APP
  ================================================== */

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  async function handleInstall() {
    if (!deferredPrompt) {
      return toast('Use your browser menu to install the app');
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }

  /* ==================================================
     ACTIONS
  ================================================== */

  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) return;

    switch (item.dataset.action) {
      case 'profile':
        return openProfile();

      case 'security':
        return openSecurity();

      case 'notifications':
        return openNotificationsPrefs();

      case 'kyc':
        return openKYC();

      case 'install':
        return handleInstall();

      case 'telegram':
        return window.open('https://t.me/glorivest', '_blank');

      case 'support':
        return (window.location.href = 'mailto:support@glorivest.com');

      case 'terms':
        return window.open('/terms', '_blank');

      case 'logout':
        localStorage.clear();
        sessionStorage.clear();
        return (window.location.href = '/');

      default:
        return;
    }
  });
})();