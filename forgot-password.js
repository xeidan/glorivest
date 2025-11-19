async function sendOtp() {
  const email = document.getElementById("email").value.trim();
  const status = document.getElementById("status");

  if (!email) {
    status.textContent = "Enter your email.";
    return;
  }

  try {
    const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/reset-password-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (res.ok) {
      status.textContent = "OTP sent to your email.";
      status.classList.add("text-green-600");
      status.classList.remove("text-red-500");
    } else {
      status.textContent = data.message || "Failed to send OTP.";
    }

  } catch (e) {
    status.textContent = "Network error.";
  }
}
