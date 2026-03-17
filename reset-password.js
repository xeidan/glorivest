'use strict';

const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const email = localStorage.getItem('resetEmail');
const resetCode = localStorage.getItem('resetCode');

if (!email || !resetCode) {
  alert('Invalid reset session. Start again.');
  window.location.href = 'forgot-password.html';
}


// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function setStatus(message, type = 'error') {
  const el = document.getElementById('status');

  el.textContent = message;
  el.classList.remove('text-red-500', 'text-green-600');

  if (type === 'success') {
    el.classList.add('text-green-600');
  } else {
    el.classList.add('text-red-500');
  }
}


// --------------------------------------------------
// PASSWORD TOGGLE
// --------------------------------------------------
document.getElementById('toggle-password')?.addEventListener('click', () => {
  const input = document.getElementById('password');
  const icon = document.getElementById('eye-icon');

  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';

  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
});


// --------------------------------------------------
// VALIDATION (MATCH BACKEND RULE)
// --------------------------------------------------
function isStrongPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}


// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------
async function resetPassword() {
  const passwordInput = document.getElementById('password');
  const btn = document.getElementById('reset-btn');
  const loginLink = document.getElementById('login-link');

  const newPassword = passwordInput.value.trim();

  if (!newPassword) {
    setStatus('Password cannot be empty');
    return;
  }

  if (!isStrongPassword(newPassword)) {
    setStatus('Password must be 8+ chars with letter, number, and symbol');
    return;
  }

  btn.disabled = true;

  try {
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
      setStatus(data.message || 'Reset failed');
      return;
    }

    // SUCCESS
    setStatus('Password updated successfully', 'success');

    loginLink.classList.remove('hidden');

    // cleanup
    localStorage.removeItem('resetEmail');
    localStorage.removeItem('resetCode');

  } catch (err) {
    console.error(err);

    if (err.name === 'AbortError') {
      setStatus('Request timeout. Try again.');
    } else {
      setStatus('Network error. Try again.');
    }
  } finally {
    btn.disabled = false;
  }
}