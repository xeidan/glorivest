const BASE_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

/* ==================================================
   HELPERS
================================================== */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const storage = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
  remove: (key) => localStorage.removeItem(key)
};

const debounce = (fn, wait = 120) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const lockBody = (locked) => {
  document.body.classList.toggle('overflow-hidden', locked);
};



/* ==================================================
   API
================================================== */
function getToken() {
  return storage.get('token');
}

async function apiFetch(path, options = {}) {
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    }
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${path}`, config);

  let data = {};
  try {
    data = await response.json();
  } catch {
    throw new Error('Invalid server response');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

/* ==================================================
   AUTH FORMS
================================================== */
function initAuthForms() {
  const registerForm = $('#register-form');
  const loginForm = $('#login-form');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = $('#registerEmail')?.value.trim();
      const password = $('#registerPassword')?.value.trim();
      const referral = $('#registerReferral')?.value.trim() || null;

      const strongPassword =
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

      if (!email || !password) {
        showAuthBanner('Email and password are required.', 'error');
        return;
      }

      if (!strongPassword.test(password)) {
        showAuthBanner('Use 8+ characters with letter, number and symbol.', 'error');
        return;
      }

      try {
        await apiFetch('/auth/register', {
          method: 'POST',
          body: {
            email,
            password,
            referral_code: referral
          }
        });

        storage.set('otpEmail', email);
        window.location.href = 'otp.html';
      } catch (error) {
        showAuthBanner(error.message || 'Registration failed.', 'error');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = $('#loginEmail')?.value.trim();
      const password = $('#loginPassword')?.value.trim();

      if (!email || !password) {
        showAuthBanner('Email and password are required.', 'error');
        return;
      }

      try {
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: { email, password }
        });

        if (!data?.token || !data?.user) {
          throw new Error('Invalid login response');
        }

        storage.set('token', data.token);
        storage.set('user', JSON.stringify(data.user));

        const role = data.user.role || 'user';
        window.location.href = role === 'admin' ? 'admin.html' : 'app.html';
      } catch (error) {
        showAuthBanner(error.message || 'Login failed.', 'error');
      }
    });
  }
}

/* ==================================================
   AUTH MODAL
================================================== */
function initAuthModal() {
  const backdrop = $('#authBackdrop');
  const modal = $('#authModal');

  if (!backdrop || !modal) return;

  const registerForm = $('#register-form');
  const loginForm = $('#login-form');
  const registerTab = $('#tabRegister');
  const loginTab = $('#tabLogin');
  const slider = $('#tabSlider');

  let isOpen = false;

  function openModal() {
    backdrop.classList.remove('hidden');
    lockBody(true);

    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0', 'translate-y-6', 'scale-[0.98]');
      modal.classList.add('opacity-100', 'translate-y-0', 'scale-100');
    });

    const firstInput = $('input', modal);
    firstInput?.focus();
    isOpen = true;
    clearAuthBanner();
  }

  function closeModal() {
    modal.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
    modal.classList.add('opacity-0', 'translate-y-6', 'scale-[0.98]');

    setTimeout(() => {
      backdrop.classList.add('hidden');
      lockBody(false);
    }, 250);

    isOpen = false;
    clearAuthBanner();
  }


  // Tab switching
function showRegister() {
  registerForm?.classList.remove('hidden');
  loginForm?.classList.add('hidden');

  if (registerTab) {
    registerTab.className =
      'py-3 text-sm font-semibold text-black relative z-10';
  }

  if (loginTab) {
    loginTab.className =
      'py-3 text-sm font-semibold text-white/55 relative z-10';
  }

  if (slider) {
    slider.style.left = '4px';
  }
  clearAuthBanner();
}

//
function showLogin() {
  loginForm?.classList.remove('hidden');
  registerForm?.classList.add('hidden');

  if (loginTab) {
    loginTab.className =
      'py-3 text-sm font-semibold text-black relative z-10';
  }

  if (registerTab) {
    registerTab.className =
      'py-3 text-sm font-semibold text-white/55 relative z-10';
  }

  if (slider) {
    slider.style.left = 'calc(50% + 2px)';
  }
  clearAuthBanner();
}

  window.toggleAuthPanel = () => (isOpen ? closeModal() : openModal());
  window.closeOnBackdrop = (e) => {
    if (e.target === backdrop) closeModal();
  };
  window.showRegister = showRegister;
  window.showLogin = showLogin;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeModal();
  });
  showRegister();
}


/* ==================================================
   BANNERS
================================================== */

function getActiveAuthForm() {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');

  if (registerForm && !registerForm.classList.contains('hidden')) {
    return registerForm;
  }

  return loginForm;
}

function getAuthBannerHost() {
  const form = getActiveAuthForm();
  if (!form) return null;

  return (
    form.querySelector('.auth-banner-host') ||
    form.querySelector('.space-y-4') ||
    form.querySelector('.space-y-3') ||
    form
  );
}

function clearAuthBanner() {
  document.querySelectorAll('.auth-inline-banner').forEach(el => el.remove());
}

function showAuthBanner(message, type = 'error') {
  const host = getAuthBannerHost();
  if (!host) return;

  clearAuthBanner();

  const isSuccess = type === 'success';

  const banner = document.createElement('div');
  banner.className =
    'auth-inline-banner rounded-2xl border px-4 py-3 text-sm leading-6 mb-4';

  banner.classList.add(
    ...(isSuccess
      ? [
          'border-[#00D2B1]/30',
          'bg-[#00D2B1]/10',
          'text-[#7ef7e2]'
        ]
      : [
          'border-red-500/40',
          'bg-red-950/60',
          'text-red-300'
        ])
  );

  banner.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <span>${message}</span>
      <button type="button" class="text-white/40 hover:text-white text-base leading-none">
        ×
      </button>
    </div>
  `;

  banner.querySelector('button').onclick = () => banner.remove();

  host.prepend(banner);
}

/* ==================================================
   MESSAGES
================================================== */
function showMessage(message, type = 'info') {
  const old = document.getElementById('gv-message');
  if (old) old.remove();

  const color =
    type === 'error'
      ? 'border-red-500/20 bg-red-500/10 text-red-300'
      : type === 'success'
      ? 'border-[#00D2B1]/20 bg-[#00D2B1]/10 text-[#7fffe7]'
      : 'border-white/10 bg-[#121212] text-white';

  const box = document.createElement('div');
  box.id = 'gv-message';
  box.className = `
    fixed inset-x-4 top-5 z-[9999]
    rounded-2xl border ${color}
    px-4 py-4 backdrop-blur-xl
    shadow-[0_20px_60px_rgba(0,0,0,.45)]
    transition-all duration-300
  `;
  box.innerHTML = `
    <div class="flex items-center justify-between gap-4">
      <p class="text-sm font-medium leading-6">${message}</p>
      <button id="gv-close" class="text-white/50 hover:text-white text-lg">×</button>
    </div>
  `;

  document.body.appendChild(box);

  document.getElementById('gv-close')?.addEventListener('click', () => {
    box.remove();
  });

  setTimeout(() => box.remove(), 3200);
}

/* ==================================================
   PASSWORD TOGGLE
================================================== */
window.togglePassword = function (inputId, trigger) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const icon = trigger.querySelector('i') || trigger;
  const hidden = input.type === 'password';

  input.type = hidden ? 'text' : 'password';

  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
};

/* ==================================================
   MOBILE MENU
================================================== */
function initMobileMenu() {
  const overlay = $('#mobileMenu');
  const panel = $('#mobileMenuPanel');

  if (!overlay || !panel) return;

  let open = false;

  function showMenu() {
    overlay.classList.remove('hidden');
    lockBody(true);

    requestAnimationFrame(() => {
      panel.classList.remove('translate-x-full');
      panel.classList.add('translate-x-0');
    });

    open = true;
  }

  function hideMenu() {
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');

    setTimeout(() => {
      overlay.classList.add('hidden');
      lockBody(false);
    }, 250);

    open = false;
  }

  window.toggleMobileMenu = () => (open ? hideMenu() : showMenu());

  window.handleMenuClick = (_, target) => {
    hideMenu();

    if (target && document.querySelector(target)) {
      setTimeout(() => {
        document.querySelector(target).scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 200);
    }
  };
}

/* ==================================================
   FAQ
================================================== */
function initFAQ() {
  const buttons = $$('.faq-trigger');

  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      const content = document.getElementById(
        button.getAttribute('aria-controls')
      );
      const icon = $('.faq-icon', button);

      buttons.forEach((btn) => {
        const target = document.getElementById(
          btn.getAttribute('aria-controls')
        );
        const btnIcon = $('.faq-icon', btn);

        btn.setAttribute('aria-expanded', 'false');
        if (target) target.style.maxHeight = '0px';
        if (btnIcon) btnIcon.textContent = '+';
      });

      if (!expanded && content) {
        button.setAttribute('aria-expanded', 'true');
        content.style.maxHeight = `${content.scrollHeight}px`;
        if (icon) icon.textContent = '−';
      }
    });
  });
}

/* ==================================================
   SCROLL ANIMATIONS
================================================== */
function initAnimations() {
  const elements = $$('[data-animate]');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const delay = Number(entry.target.dataset.delay || 0);

        setTimeout(() => {
          entry.target.classList.add('animate-visible');
        }, delay);

        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ==================================================
   BACK TO TOP + NAVBAR
================================================== */
function initScrollUI() {
  const button = $('#backToTopBtn');
  const navbar = $('nav');

  const onScroll = debounce(() => {
    const y = window.scrollY;

    if (button) {
      button.classList.toggle('hidden', y < 250);
    }

    if (navbar) {
      if (y > 20) {
        navbar.classList.add(
  'bg-[#0B0B0B]/85',
  'backdrop-blur-xl',
  'shadow-[0_10px_30px_rgba(0,0,0,0.28)]'
);
      } else {
        navbar.classList.remove(
  'bg-[#0B0B0B]/85',
  'backdrop-blur-xl',
  'shadow-[0_10px_30px_rgba(0,0,0,0.28)]'
);
      }
    }
  }, 50);

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  window.scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
}

/* ==================================================
   INIT
================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initAuthForms();
  initAuthModal();
  initMobileMenu();
  initFAQ();
  initAnimations();
  initScrollUI();

  if (new URLSearchParams(location.search).get('login')) {
    toggleAuthPanel();   // open modal
    showLogin();         // switch to login tab
    history.replaceState({}, '', '/index.html');
  }
});