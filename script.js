
    const backendUrl = 'https://Glorivest-backend-0c5eddaec35e.herokuapp.com';
  
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
    const authBackdrop = document.getElementById('authBackdrop');
    const authModal = document.getElementById('authModal');
    const tabSlider = document.getElementById('tabSlider');
  
    function toggleAuthPanel() {
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
        authBackdrop.classList.add('hidden');
      }
    }
  
    function closeOnBackdrop(e) {
      if (e.target.id === 'authBackdrop') toggleAuthPanel();
    }
  
    function showRegister() {
      document.getElementById('registerForm').classList.remove('hidden');
      document.getElementById('loginForm').classList.add('hidden');
      document.getElementById('tabRegister').classList.add('text-white');
      document.getElementById('tabLogin').classList.remove('text-white');
      document.getElementById('tabLogin').classList.add('text-gray-400');
      tabSlider.style.left = '0%';
    }
  
    function showLogin() {
      document.getElementById('registerForm').classList.add('hidden');
      document.getElementById('loginForm').classList.remove('hidden');
      document.getElementById('tabLogin').classList.add('text-white');
      document.getElementById('tabRegister').classList.remove('text-white');
      document.getElementById('tabRegister').classList.add('text-gray-400');
      tabSlider.style.left = '50%';
    }
  
// === Register Logic ===
document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const emailInput = document.querySelector('#registerForm input[type="email"]');
  const passwordInput = document.querySelector('#registerForm input[type="password"]');

  if (!emailInput || !passwordInput) {
    alert("Form inputs not found. Please reload the page.");
    return;
  }

  const email = emailInput.value;
  const password = passwordInput.value;
  const referralCode = generateReferralCode();
  const referredBy = getReferralFromURL();

  try {
    const res = await fetch('https://Glorivest-backend-0c5eddaec35e.herokuapp.com/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, referral_code: referralCode, referred_by: referredBy }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('email', email);
      alert("Signup successful! Check your email.");
      window.location.href = 'otp.html';
    } else {
      alert(data.message || data.error || "Signup failed");
    }
  } catch (err) {
    alert("Signup error: " + err.message);
  }
});


// === Login Logic ===
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  if (!emailInput || !passwordInput) {
    alert("Login form not found. Please try again.");
    return;
  }

  const email = emailInput.value;
  const password = passwordInput.value;

  try {
    const res = await fetch('https://Glorivest-backend-0c5eddaec35e.herokuapp.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('token', data.token); // ✅ save token
      localStorage.setItem('user', JSON.stringify(data.user)); // ✅ save user (was missing)

      alert("Login successful!");
      window.location.href = 'app.html';
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    alert("Login error: " + err.message);
  }
});


  
    // === Helpers ===
    function generateReferralCode() {
      return 'Glorivest' + Math.floor(Math.random() * 1000000);
    }
  
    function getReferralFromURL() {
      const params = new URLSearchParams(window.location.search);
      return params.get('ref') || '';
    }


    async function resendVerification() {
  const email = document.querySelector('#loginForm input[type="email"]').value;
  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  try {
    const res = await fetch('https://Glorivest-backend-0c5eddaec35e.herokuapp.com/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      alert("OTP sent to your email.");
    } else {
      alert(data.message || "Could not resend verification email.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function forgotPassword() {
  const email = document.querySelector('#loginForm input[type="email"]').value;
  if (!email) {
    alert("Please enter your email first.");
    return;
  }

  try {
    const res = await fetch('https://Glorivest-backend-0c5eddaec35e.herokuapp.com/request-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('email', email);
      alert("OTP sent to your email. Redirecting to reset...");
      window.location.href = 'reset.html';
    } else {
      alert(data.message || "Could not send reset OTP.");
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
}


function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  icon.classList.toggle('fa-eye-slash');
  icon.classList.toggle('fa-eye');
}


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
