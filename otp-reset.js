// otp-reset.js
const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const otpInput = document.getElementById('otp');
const statusEl = document.getElementById('status');

const email = localStorage.getItem('resetEmail');

if (!email) {
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

async function verifyResetOTP() {
  const code = otpInput.value.replace(/\D/g, '').trim();

  if (code.length !== 6) {
    setStatus('Enter a valid 6-digit code.', 'error');
    otpInput.focus();
    return;
  }

  try {
    setStatus('Verifying...');

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
      setStatus(data.message || 'Invalid or expired code.', 'error');
      return;
    }

    localStorage.setItem('resetCode', code);

    setStatus('Verified. Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'reset-password.html';
    }, 700);

  } catch (error) {
    setStatus('Network error. Try again.', 'error');
  }
}

async function resendResetOTP() {
  try {
    setStatus('Sending new code...');

    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        purpose: 'reset'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || 'Failed to resend code.', 'error');
      return;
    }

    setStatus('A new code has been sent.', 'success');

  } catch (error) {
    setStatus('Network error. Try again.', 'error');
  }
}

otpInput?.addEventListener('input', () => {
  otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
});

otpInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifyResetOTP();
});