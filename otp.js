'use strict';

const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const email = localStorage.getItem('otpEmail');

if (!email) {
  alert('No email found. Please register again.');
  window.location.href = 'index.html';
}


// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function getOtpCode() {
  const inputs = document.querySelectorAll('.otp-box');
  return Array.from(inputs).map(i => i.value).join('');
}

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
// VERIFY OTP
// --------------------------------------------------
async function verifyOTP() {
  const code = getOtpCode();
  const btn = document.getElementById('verify-btn');

  if (code.length !== 6) {
    setStatus('Enter full 6-digit code');
    return;
  }

  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, purpose: 'verify' })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || 'Invalid or expired code');
      return;
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.removeItem('otpEmail');
    }

    setStatus('Verified! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'app.html';
    }, 800);

  } catch (err) {
    console.error(err);
    setStatus('Network error. Try again.');
  } finally {
    btn.disabled = false;
  }
}


// --------------------------------------------------
// RESEND OTP
// --------------------------------------------------
async function resendOTP() {
  const btn = document.getElementById('resend-btn');

  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'verify' })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || 'Failed to resend');
      return;
    }

    setStatus('New code sent', 'success');

  } catch (err) {
    console.error(err);
    setStatus('Error resending code');
  } finally {
    btn.disabled = false;
  }
}


// --------------------------------------------------
// INPUT BEHAVIOR (CRITICAL)
// --------------------------------------------------
const inputs = document.querySelectorAll('.otp-box');

inputs.forEach((input, index) => {

  input.addEventListener('input', (e) => {
    let value = e.target.value;

    // Allow only numbers
    if (!/^\d$/.test(value)) {
      e.target.value = '';
      return;
    }

    // Move forward
    if (index < inputs.length - 1) {
      inputs[index + 1].focus();
    }

    // Auto verify on last
    if (index === inputs.length - 1) {
      verifyOTP();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      inputs[index - 1].focus();
    }
  });

});


// --------------------------------------------------
// AUTO FOCUS FIRST BOX
// --------------------------------------------------
inputs[0]?.focus();


// --------------------------------------------------
// PASTE SUPPORT (VERY IMPORTANT UX)
// --------------------------------------------------
document.getElementById('otp-container')?.addEventListener('paste', (e) => {
  const paste = (e.clipboardData || window.clipboardData).getData('text');

  if (!/^\d{6}$/.test(paste)) return;

  e.preventDefault();

  paste.split('').forEach((digit, i) => {
    if (inputs[i]) inputs[i].value = digit;
  });

  verifyOTP();
});