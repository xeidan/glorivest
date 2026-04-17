// forgot-password.js
const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

const emailInput = document.getElementById('email');
const statusEl = document.getElementById('status');

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

async function requestReset() {
  const email = emailInput.value.trim().toLowerCase();

  if (!email) {
    setStatus('Enter your email address.', 'error');
    emailInput.focus();
    return;
  }

  try {
    setStatus('Sending code...');

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
      setStatus(data.message || 'Could not send code.', 'error');
      return;
    }

    localStorage.setItem('resetEmail', email);

    setStatus('Code sent. Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = 'otp-reset.html';
    }, 700);

  } catch (error) {
    setStatus('Network error. Try again.', 'error');
  }
}

emailInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') requestReset();
});