// reset-password.js
const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

const email = localStorage.getItem('resetEmail');
const resetCode = localStorage.getItem('resetCode'); // saved after OTP verify

if (!email || !resetCode) {
  alert('Invalid reset session. Start again.');
  window.location.href = 'forgot-password.html';
}

// ---- Toggle Password Visibility ----
document.getElementById('toggle-password').addEventListener('click', () => {
  const input = document.getElementById('password');
  const icon = document.getElementById('eye-icon');
  const isHidden = input.type === 'password';

  input.type = isHidden ? 'text' : 'password';
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
});

// ---- Submit New Password ----
async function resetPassword() {
  const newPassword = document.getElementById('password').value.trim();
  const statusEl = document.getElementById('status');
  const loginLink = document.getElementById('login-link');

  if (!newPassword) {
    statusEl.textContent = 'Password cannot be empty.';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code: resetCode,
        newPassword
      })
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.message || 'Reset failed.';
      return;
    }

    // Success
    statusEl.classList.remove('text-red-500');
    statusEl.classList.add('text-green-600');
    statusEl.textContent = 'Password updated successfully.';

    loginLink.classList.remove('hidden');

    // clean session
    localStorage.removeItem('resetEmail');
    localStorage.removeItem('resetCode');

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Network error. Try again.';
  }
}
