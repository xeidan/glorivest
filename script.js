const BASE_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

// === Back to Top Button Logic ===
    const backToTopBtn = document.getElementById('backToTopBtn');
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
  
    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

  
    // === FAQ Accordion Logic ===
    document.addEventListener('DOMContentLoaded', () => {
      const faqButtons = document.querySelectorAll('.backdrop-blur-md button');
      faqButtons.forEach(button => {
  button.addEventListener('click', () => {
    const answer = button.nextElementSibling;
    if (!answer) return; // 🛡️ Prevent error if null

    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const icon = button.querySelector('svg');

    if (isExpanded) {
      answer.style.maxHeight = '0';
      button.setAttribute('aria-expanded', 'false');
      icon?.classList.remove('rotate-180');
    } else {
      faqButtons.forEach(otherButton => {
        const otherAnswer = otherButton.nextElementSibling;
        if (otherButton !== button && otherButton.getAttribute('aria-expanded') === 'true' && otherAnswer) {
          otherAnswer.style.maxHeight = '0';
          otherButton.setAttribute('aria-expanded', 'false');
          otherButton.querySelector('svg')?.classList.remove('rotate-180');
        }
      });
      answer.style.maxHeight = answer.scrollHeight + 'px';
      button.setAttribute('aria-expanded', 'true');
      icon?.classList.add('rotate-180');
    }
  });
});

    });
  
    // === Star Rating Logic ===
    document.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll(".star-row").forEach(container => {
        for (let i = 0; i < 5; i++) {
          container.innerHTML += `
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .587l3.668 7.431 8.2 1.193-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.87 1.4-8.168L.132 9.211l8.2-1.193z"/>
            </svg>`;
        }
      });
    });
  
    // === Scroll Animation ===
    document.addEventListener("DOMContentLoaded", () => {
      const animatedElements = document.querySelectorAll('[data-animate]');
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.delay) || 0;
            setTimeout(() => {
              entry.target.classList.add('animate-visible');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
  
      animatedElements.forEach(el => observer.observe(el));
    });
  
   // === Auth Modal Logic ===
document.addEventListener('DOMContentLoaded', () => {
    const authBackdrop = document.getElementById('authBackdrop');
    const authModal = document.getElementById('authModal');
    const tabSlider = document.getElementById('tabSlider');
    const loginTab = document.getElementById('tabLogin');
    const registerTab = document.getElementById('tabRegister');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
  
    // Toggle modal visibility
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
  
    // Close modal when clicking outside the box
    window.closeOnBackdrop = function (e) {
      if (e.target.id === 'authBackdrop') toggleAuthPanel();
    };
  
    // Show Register Form
    window.showRegister = function () {
      if (!loginTab || !registerTab || !loginForm || !registerForm || !tabSlider) return;
  
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
  
      registerTab.classList.add('text-white');
      loginTab.classList.remove('text-white');
      loginTab.classList.add('text-gray-400');
  
      tabSlider.style.left = '0%';
    };
  
    // Show Login Form
    window.showLogin = function () {
      if (!loginTab || !registerTab || !loginForm || !registerForm || !tabSlider) return;
  
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
  
      loginTab.classList.add('text-white');
      registerTab.classList.remove('text-white');
      registerTab.classList.add('text-gray-400');
  
      tabSlider.style.left = '50%';
    };
  
    // Toggle password visibility
    window.togglePassword = function (inputId, icon) {
      const input = document.getElementById(inputId);
      if (!input) return;
  
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
  
      icon.classList.toggle('fa-eye-slash');
      icon.classList.toggle('fa-eye');
    };
  });
  


//smooth-scroll
  function handleMenuClick(el, target) {
    el.classList.add('text-[#00D2B1]');
    
    setTimeout(() => {
      el.classList.remove('text-[#00D2B1]');
      toggleMobileMenu();
      
      // Scroll to section if target is valid
      if (target && document.querySelector(target)) {
        document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
      }
    }, 1000);
  }



//mobile menu
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


// ========== REGISTER ==========
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    try {
      const res = await fetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('otpEmail', email);
        window.location.href = 'otp.html';
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      alert('Something went wrong. Try again.');
    }
  });
}

// ========== LOGIN ==========
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        alert('Login successful');
        localStorage.setItem('glorivestToken', data.token);
        window.location.href = 'app.html'; // or dashboard
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Something went wrong. Try again.');
    }
  });
}

// ======== FORGOT PASSWORD ========
function forgotPassword(link) {
    link.classList.add('text-[#00D2B1]'); // or use 'text-green-500'
    return true; // allow default navigation to reset.html
  }
  

// ========== RESET PASSWORD =======
async function resetPassword() {
    const email = document.getElementById('email').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();

    if (!email || !newPassword) {
      document.getElementById('status').textContent = 'Both fields are required.';
      return;
    }

    try {
      const res = await fetch('https://glorivest-api-a16f75b6b330.herokuapp.com/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword })
      });

      const data = await res.json();

      if (res.ok) {
        document.getElementById('status').textContent = 'Password reset successful. You can now log in.';
        document.getElementById('status').classList.remove('text-red-500');
        document.getElementById('status').classList.add('text-green-600');

        // Show "Go back to login" button
        document.getElementById('login-btn').classList.remove('hidden');
      } else {
        document.getElementById('status').textContent = data.message || 'Reset failed.';
      }
    } catch (err) {
      document.getElementById('status').textContent = 'Something went wrong.';
    }
  }
  const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
  resetBtn.addEventListener('click', resetPassword);
}


// ========== VERIFY OTP ==========
const otpForm = document.getElementById('otp-form');
if (otpForm) {
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('otp-input').value.trim();
    const email = localStorage.getItem('otpEmail');

    if (!email) return alert('No email found. Please register again.');

    try {
      const res = await fetch(`${BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await res.json();

      if (res.ok) {
        alert('OTP verified. You can now log in.');
        localStorage.removeItem('otpEmail');
        window.location.href = 'index.html';
      } else {
        alert(data.message || 'OTP verification failed');
      }
    } catch (err) {
      alert('Something went wrong. Try again.');
    }
  });
}

// ========== RESEND OTP ==========
const resendLink = document.getElementById('resend-link');
if (resendLink) {
  resendLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = localStorage.getItem('otpEmail');
    if (!email) return alert('No email found. Please register again.');

    try {
      const res = await fetch(`${BASE_URL}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (res.ok) {
        alert('OTP resent successfully');
      } else {
        alert(data.message || 'Failed to resend OTP');
      }
    } catch (err) {
      alert('Something went wrong. Try again.');
    }
  });
}






