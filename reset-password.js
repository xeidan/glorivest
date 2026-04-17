'use strict';

const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const email = localStorage.getItem('resetEmail');
const resetCode = localStorage.getItem('resetCode');

const passwordInput = document.getElementById('password');
const resetBtn = document.getElementById('reset-btn');
const statusEl = document.getElementById('status');
const loginLink = document.getElementById('login-link');

if (!email || !resetCode) {
  window.location.href = 'forgot-password.html';
}

function setStatus(message, type = 'default') {
  statusEl.textContent = message;
  statusEl.className = 'min-h-[20px] text-center text-sm';

  if (type === 'error') {
    statusEl.classList.add('text-red-400');
  } else if (type === 'success') {
    statusEl.classList.add('text-[#00D2B1]');
  } else {
    statusEl.classList.add('text-white/45');
  }
}

function isStrongPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

/* Password Toggle */
document.getElementById('toggle-password')?.addEventListener('click', () => {
  const icon = document.getElementById('eye-icon');
  const hidden = passwordInput.type === 'password';

  passwordInput.type = hidden ? 'text' : 'password';

  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
});

async function resetPassword() {
  const newPassword = passwordInput.value.trim();

  if (!newPassword) {
    setStatus('Password cannot be empty.', 'error');
    passwordInput.focus();
    return;
  }

  if (!isStrongPassword(newPassword)) {
    setStatus('Use 8+ characters with letter, number, and symbol.', 'error');
    return;
  }

  resetBtn.disabled = true;

  try {
    setStatus('Updating password...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code: resetCode,
        newPassword
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || 'Reset failed.', 'error');
      return;
    }

    localStorage.removeItem('resetEmail');
    localStorage.removeItem('resetCode');

    setStatus('Password updated successfully.', 'success');
    loginLink.classList.remove('hidden');

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);

  } catch (error) {
    if (error.name === 'AbortError') {
      setStatus('Request timed out. Try again.', 'error');
    } else {
      setStatus('Network error. Try again.', 'error');
    }
  } finally {
    resetBtn.disabled = false;
  }
}

passwordInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') resetPassword();
});