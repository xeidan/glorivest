'use strict';

const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const email = localStorage.getItem('otpEmail');
const statusEl = document.getElementById('status');
const verifyBtn = document.getElementById('verify-btn');
const resendBtn = document.getElementById('resend-btn');
const inputs = document.querySelectorAll('.otp-box');

if (!email) {
  window.location.href = 'index.html';
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

function getOtpCode() {
  return [...inputs].map((input) => input.value).join('');
}

async function verifyOTP() {
  const code = getOtpCode();

  if (code.length !== 6) {
    setStatus('Enter the full 6-digit code.', 'error');
    return;
  }

  verifyBtn.disabled = true;

  try {
    setStatus('Verifying...');

    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        code,
        purpose: 'verify'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || 'Invalid or expired code.', 'error');
      return;
    }

    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    localStorage.removeItem('otpEmail');

    setStatus('Verified. Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'app.html';
    }, 700);

  } catch (error) {
    setStatus('Network error. Try again.', 'error');
  } finally {
    verifyBtn.disabled = false;
  }
}

async function resendOTP() {
  resendBtn.disabled = true;

  try {
    setStatus('Sending new code...');

    const res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        purpose: 'verify'
      })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(data.message || 'Failed to resend code.', 'error');
      return;
    }

    setStatus('New code sent.', 'success');

  } catch (error) {
    setStatus('Network error. Try again.', 'error');
  } finally {
    resendBtn.disabled = false;
  }
}

inputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = value;

    if (!value) return;

    if (index < inputs.length - 1) {
      inputs[index + 1].focus();
    }

    if (index === inputs.length - 1 && getOtpCode().length === 6) {
      verifyOTP();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      inputs[index - 1].focus();
    }

    if (e.key === 'Enter') {
      verifyOTP();
    }
  });
});

document.getElementById('otp-container')?.addEventListener('paste', (e) => {
  const pasted = (e.clipboardData || window.clipboardData)
    .getData('text')
    .replace(/\D/g, '')
    .slice(0, 6);

  if (pasted.length !== 6) return;

  e.preventDefault();

  pasted.split('').forEach((digit, i) => {
    if (inputs[i]) inputs[i].value = digit;
  });

  verifyOTP();
});

inputs[0]?.focus();