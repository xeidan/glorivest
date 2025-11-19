
  const email = localStorage.getItem('otpEmail');

async function verifyOTP() {
  if (!email) {
    document.getElementById('status').textContent = 'No email found. Please sign up again.';
    return;
  }

  const otp = document.getElementById('otp').value.trim();
  const res = await fetch('https://glorivest-api-a16f75b6b330.herokuapp.com/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('verified', 'true');
    window.location.href = 'app.html';
  } else {
    document.getElementById('status').textContent = data.message || 'Invalid OTP';
  }
}

async function resendOTP() {
  if (!email) {
    document.getElementById('status').textContent = 'No email found. Please sign up again.';
    return;
  }

  const res = await fetch('https://glorivest-api-a16f75b6b330.herokuapp.com/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  document.getElementById('status').textContent = data.message;
}
