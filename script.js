/** ============================================
 *        BASE + TOKEN + API WRAPPER
 * ============================================ */
const BASE_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

const getToken = () => localStorage.getItem('token');
const setToken = (t) => localStorage.setItem('token', t);

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });

  let data = {};
  try { data = await res.json(); } catch {}

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

/** ============================================
 *        ACCOUNT + PROFILE LOADING
 * ============================================ */
async function ensureDefaultAccount() {
  if (!getToken()) return;

  try {
    const accounts = await apiFetch('/accounts');
    if (!accounts || accounts.length === 0) {
      await apiFetch('/accounts', {
        method: 'POST',
        body: { tier: 'standard' }
      });
    }
  } catch {}
}

async function loadMe() {
  try {
    const me = await apiFetch('/auth/me');
    localStorage.setItem('me', JSON.stringify(me));

    document.querySelectorAll('[data-me="email"]').forEach(el => el.textContent = me.email || '');
    document.querySelectorAll('[data-me="account-id"]').forEach(el => el.textContent = me.default_account_id || '');
  } catch {}
}

/** ============================================
 *                REGISTER
 * ============================================ */
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const referral = document.getElementById('registerReferral')?.value.trim() || null;

    const strongPassword = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!strongPassword.test(password)) {
      alert("Password must be at least 8 characters long and include a letter, a number, and a symbol.");
      return;
    }

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: { email, password, referral_code: referral }
      });

      localStorage.setItem('otpEmail', email);

      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: { email, purpose: 'verify' }
      });

      window.location.href = 'otp.html';

    } catch (err) {
      alert(err.message);
    }
  });
}

/** ============================================
 *                LOGIN
 * ============================================ */
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      setToken(data.token);

      await ensureDefaultAccount();
      await loadMe();

      window.location.href = 'app.html';
    } catch (err) {
      alert(err.message);
    }
  });
}

/** ============================================
 *        BACK TO TOP BUTTON
 * ============================================ */
const backToTopBtn = document.getElementById('backToTopBtn');
if (backToTopBtn) {
  let hideTimeout;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      backToTopBtn.classList.remove('hidden');
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        backToTopBtn.classList.add('hidden');
      }, 3000);
    } else {
      backToTopBtn.classList.add('hidden');
    }
  });

  window.scrollToTop = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

/** ============================================
 *        FAQ ACCORDION
 * ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  const faqButtons = document.querySelectorAll('.backdrop-blur-md button');
  faqButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const answer = button.nextElementSibling;
      if (!answer) return;

      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const icon = button.querySelector('svg');

      if (isExpanded) {
        answer.style.maxHeight = '0';
        button.setAttribute('aria-expanded', 'false');
        icon?.classList.remove('rotate-180');
      } else {
        faqButtons.forEach((other) => {
          const otherAnswer = other.nextElementSibling;
          if (other !== button && other.getAttribute('aria-expanded') === 'true') {
            otherAnswer.style.maxHeight = '0';
            other.setAttribute('aria-expanded', 'false');
            other.querySelector('svg')?.classList.remove('rotate-180');
          }
        });

        answer.style.maxHeight = answer.scrollHeight + 'px';
        button.setAttribute('aria-expanded', 'true');
        icon?.classList.add('rotate-180');
      }
    });
  });
});

/** ============================================
 *        STAR RATING
 * ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.star-row').forEach((container) => {
    for (let i = 0; i < 5; i++) {
      container.innerHTML += `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.87 1.4-8.168L.132 9.211l8.2-1.193z"/>
        </svg>`;
    }
  });
});

/** ============================================
 *        SCROLL ANIMATIONS (RESTORES HERO TEXT)
 * ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll('[data-animate]');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay) || 0;
          setTimeout(() => {
            entry.target.classList.add('animate-visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  animatedElements.forEach((el) => observer.observe(el));
});

/** ============================================
 *        AUTH MODAL LOGIC (RESTORED)
 * ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  const authBackdrop = document.getElementById('authBackdrop');
  const authModal = document.getElementById('authModal');
  const tabSlider = document.getElementById('tabSlider');
  const loginTab = document.getElementById('tabLogin');
  const registerTab = document.getElementById('tabRegister');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  window.toggleAuthPanel = function () {
    const isHidden = authBackdrop.classList.contains('hidden');
    if (isHidden) {
      authBackdrop.classList.remove('hidden');
      setTimeout(() => {
        authModal.classList.remove('translate-y-10', 'opacity-0', 'scale-95');
        authModal.classList.add('translate-y-0', 'opacity-100', 'scale-100');
      }, 50);
    } else {
      authModal.classList.remove('translate-y-0', 'opacity-100', 'scale-100');
      authModal.classList.add('translate-y-10', 'opacity-0', 'scale-95');
      setTimeout(() => authBackdrop.classList.add('hidden'), 300);
    }
  };

  window.closeOnBackdrop = function (e) {
    if (e.target.id === 'authBackdrop') toggleAuthPanel();
  };

  window.showRegister = function () {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');

    registerTab.classList.add('text-white');
    loginTab.classList.remove('text-white');
    loginTab.classList.add('text-gray-400');

    tabSlider.style.left = '0%';
  };

  window.showLogin = function () {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');

    loginTab.classList.add('text-white');
    registerTab.classList.remove('text-white');
    registerTab.classList.add('text-gray-400');

    tabSlider.style.left = '50%';
  };

  window.togglePassword = function (inputId, icon) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    icon.classList.toggle('fa-eye-slash');
    icon.classList.toggle('fa-eye');
  };
});

/** ============================================
 *       MOBILE MENU
 * ============================================ */
function toggleMobileMenu() {
  const overlay = document.getElementById('mobileMenu');
  const panel = document.getElementById('mobileMenuPanel');
  const isOpen = !overlay.classList.contains('hidden');

  if (isOpen) {
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  } else {
    overlay.classList.remove('hidden');
    setTimeout(() => {
      panel.classList.remove('translate-x-full');
      panel.classList.add('translate-x-0');
    }, 10);
  }
}

/** ============================================
 *        SMOOTH MENU SCROLL
 * ============================================ */
function handleMenuClick(el, target) {
  el.classList.add('text-[#00D2B1]');

  setTimeout(() => {
    el.classList.remove('text-[#00D2B1]');
    toggleMobileMenu();

    if (target && document.querySelector(target)) {
      document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
    }
  }, 1000);
}
