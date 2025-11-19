
    async function sendOTP() {
      const email = document.getElementById('email').value.trim();
      const status = document.getElementById('status');

      if (!email) {
        status.textContent = "Email is required.";
        return;
      }

      try {
        const res = await fetch('https://glorivest-api-a16f75b6b330.herokuapp.com/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (res.ok) {
          status.classList.remove('text-red-500');
          status.classList.add('text-green-600');
          status.textContent = "OTP sent. Check your email.";

          setTimeout(() => {
            window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
          }, 800);
        } else {
          status.textContent = data.message || "Failed to send OTP.";
        }
      } catch (err) {
        status.textContent = "Something went wrong.";
      }
    }
