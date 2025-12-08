// otp-reset.js
const API_BASE = 'https://glorivest-api.herokuapp.com';

// email stored earlier
const email = localStorage.getItem('resetEmail');
if (!email) {
  alert('No email found. Start the reset process again.');
  window.location.href = 'forgot-password.html';
}

// ---- Verify OTP for password reset ----
async function verifyResetOTP() {
  const code = document.getElementById('otp').value.trim();
  const statusEl = document.getElementById('status');

  if (!code || code.length !== 6) {
    statusEl.textContent = 'Enter a valid 6-digit OTP.';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        purpose: 'reset'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.message || 'Invalid or expired OTP';
      return;
    }

    // 🔥 THE MISSING LINE
    localStorage.setItem('resetCode', code);

    statusEl.classList.remove('text-red-500');
    statusEl.classList.add('text-green-600');
    statusEl.textContent = 'OTP verified. Redirecting…';

    setTimeout(() => {
      window.location.href = 'reset-password.html';
    }, 600);

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Network error. Try again.';
  }
}

// ---- Resend OTP for password reset ----
async function resendResetOTP() {
  const statusEl = document.getElementById('status');

  try {
    const res = await fetch(`${API_BASE}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        purpose: 'reset'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      statusEl.textContent = data.message || 'Failed to resend OTP';
      return;
    }

    statusEl.classList.remove('text-red-500');
    statusEl.classList.add('text-green-600');
    statusEl.textContent = 'A new OTP has been sent to your email.';

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Network error. Try again.';
  }
}
