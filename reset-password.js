
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get("email"); // email passed from previous screen

    async function resetPassword() {
      const otp = document.getElementById('otp').value.trim();
      const newPassword = document.getElementById('new-password').value.trim();
      const status = document.getElementById('status');
      const loginBtn = document.getElementById('login-btn');

      if (!otp || !newPassword) {
        status.textContent = 'OTP and new password are required.';
        return;
      }

      try {
        const res = await fetch('https://glorivest-api-a16f75b6b330.herokuapp.com/verify-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, newPassword })
        });

        const data = await res.json();

        if (res.ok) {
          status.textContent = 'Password reset successful. You can now log in.';
          status.classList.remove('text-red-500');
          status.classList.add('text-green-600');
          loginBtn.classList.remove('hidden');
        } else {
          status.textContent = data.message || 'Reset failed.';
        }
      } catch (err) {
        status.textContent = 'Something went wrong.';
      }
    }
