/** ================================
 *   BASE + TOKEN + API WRAPPER
 *  ================================ */
const BASE_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com';

const getToken = () => localStorage.getItem('token');
const setToken = (t) => localStorage.setItem('token', t);

async function apiFetch(path, options = {}) {
  const full = BASE_URL + path;

  const res = await fetch(full, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/** ================================
 *   ENSURE DEFAULT ACCOUNT EXISTS
 *  ================================ */
async function ensureDefaultAccount() {
  if (!getToken()) return;

  try {
    const accounts = await apiFetch("/accounts");

    if (!accounts || accounts.length === 0) {
      await apiFetch("/accounts", {
        method: "POST",
        body: { tier: "standard" }
      });
    }
  } catch (_) {}
}

/** ================================
 *   LOAD USER /auth/me
 *  ================================ */
async function loadMe() {
  try {
    const me = await apiFetch("/auth/me");
    localStorage.setItem("me", JSON.stringify(me));

    document.querySelectorAll("[data-me='email']").forEach(el => el.textContent = me.email || "");
    document.querySelectorAll("[data-me='account-id']").forEach(el => el.textContent = me.default_account_id || "");

  } catch (_) {}
}

/** ================================
 * REGISTER
 * ================================ */
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const referral = document.getElementById("registerReferral")?.value.trim() || null;

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: { email, password, referral_code: referral }
      });

      // Save email so OTP page knows what to verify
      localStorage.setItem("otpEmail", email);

      // Request OTP immediately after register
      await apiFetch("/auth/send-otp", {
        method: "POST",
        body: { email, purpose: "verify" }
      });

      window.location.href = "otp.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * LOGIN
 * ================================ */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password }
      });

      setToken(res.token);

      await ensureDefaultAccount();
      await loadMe();

      window.location.href = "app.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * OTP VERIFY (REGISTER)
 * ================================ */
const otpForm = document.getElementById("otp-form");
if (otpForm) {
  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = localStorage.getItem("otpEmail");
    const code = document.getElementById("otp-input").value.trim();

    if (!email) {
      alert("Session expired. Register again.");
      return;
    }

    try {
      const res = await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: { email, code, purpose: "verify" }
      });

      // backend returns token
      if (res.token) setToken(res.token);

      localStorage.removeItem("otpEmail");

      await ensureDefaultAccount();
      await loadMe();

      window.location.href = "app.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * RESEND OTP (REGISTER)
 * ================================ */
const resendLink = document.getElementById("resend-link");
if (resendLink) {
  resendLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = localStorage.getItem("otpEmail");
    if (!email) return alert("Session expired.");

    try {
      await apiFetch("/auth/resend-otp", {
        method: "POST",
        body: { email, purpose: "verify" }
      });

      alert("OTP resent.");
    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * FORGOT PASSWORD (send reset otp)
 * ================================ */
const forgotForm = document.getElementById("forgot-form");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("reset-email").value.trim();
    localStorage.setItem("resetEmail", email);

    try {
      await apiFetch("/auth/send-otp", {
        method: "POST",
        body: { email, purpose: "reset" }
      });

      window.location.href = "otp-reset.html";
    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * OTP VERIFY (RESET PASSWORD)
 * ================================ */
const otpResetForm = document.getElementById("otp-reset-form");
if (otpResetForm) {
  otpResetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = localStorage.getItem("resetEmail");
    const code = document.getElementById("otp-input").value.trim();

    try {
      await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: { email, code, purpose: "reset" }
      });

      localStorage.setItem("resetCode", code);

      window.location.href = "reset-password.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * RESET PASSWORD
 * ================================ */
const resetBtn = document.getElementById("reset-btn");
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const email = localStorage.getItem("resetEmail");
    const code = localStorage.getItem("resetCode");
    const newPassword = document.getElementById("new-password").value.trim();

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { email, code, newPassword }
      });

      localStorage.removeItem("resetEmail");
      localStorage.removeItem("resetCode");

      alert("Password reset successful.");
      window.location.href = "index.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/** ================================
 * UI SCRIPTS BELOW THIS LINE
 * (unchanged)
 * ================================ */

// back-to-top, accordions, animations, mobile menus etc.
// Keep your original UI code here.
