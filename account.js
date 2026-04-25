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

  async function handleInstall() {
    if (!deferredPrompt) {
      return toast('Use browser menu to install app');
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }

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
     GLOBAL ACTIONS
  ================================================== */

  document.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) return;

    switch (item.dataset.action) {
      case 'security':
        return openSecurity();

      case 'install':
        return handleInstall();

      case 'support':
        return (window.location.href = 'mailto:support@glorivest.com');

      case 'terms':
        return window.open('/terms', '_blank');

      case 'logout':
        return handleLogout();

      default:
        return;
    }
  });
})();