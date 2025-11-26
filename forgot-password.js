// forgot-password.js
const API_BASE = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

async function requestReset() {
  const email = document.getElementById('email').value.trim();
  const statusEl = document.getElementById('status');

  if (!email) {
    statusEl.textContent = 'Enter your email.';
    return;
  }

  try {
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
      statusEl.textContent = data.message || 'Could not send OTP.';
      return;
    }

    // SAVE EMAIL HERE
    localStorage.setItem('resetEmail', email);
    console.log("DEBUG: saved resetEmail =", localStorage.getItem('resetEmail'));

    statusEl.classList.remove('text-red-500');
    statusEl.classList.add('text-green-600');
    statusEl.textContent = 'OTP sent. Redirecting…';

    setTimeout(() => {
      window.location.href = 'otp-reset.html';
    }, 600);

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Network error. Try again.';
  }
}
