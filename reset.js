
    async function resetPassword() {
      const email = document.getElementById('email').value.trim();
      const newPassword = document.getElementById('new-password').value.trim();
      const status = document.getElementById('status');
      const loginBtn = document.getElementById('login-btn');

      if (!email || !newPassword) {
        status.textContent = 'Both fields are required.';
        return;
      }

      try {
        const res = await fetch('https://glorivest-api-a16f75b6b330.herokuapp.com/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword })
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
