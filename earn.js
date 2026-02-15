/* =========================================================
   EARN TAB — FINAL, BACKEND-ALIGNED
========================================================= */

async function loadEarnTab() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(
      "https://glorivest-api-a16f75b6b330.herokuapp.com/api/auth/me",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) throw new Error("Failed to load earn data");

    const user = await res.json();

    // --- Referral core data ---
    const code = user.referral_code || "N/A";
    const link = `https://glorivest.com/index.html?ref=${code}`;
    const count = user.total_referrals || 0;
    const earnings =
      (Number(user.referral_earnings_cents || 0) / 100).toFixed(2);

    // --- DOM ---
    const codeEl = document.getElementById("referral-code");
    const linkEl = document.getElementById("referral-link");
    const countEl = document.getElementById("referral-count");
    const earningsEl = document.getElementById("referral-balance");

    if (codeEl) codeEl.textContent = code;
    if (linkEl) {
      linkEl.textContent = link;
      linkEl.dataset.link = link;
    }
    if (countEl) countEl.textContent = count;
    if (earningsEl) earningsEl.textContent = `$${earnings}`;

  } catch (err) {
    console.error("Earn tab error:", err);
  }
}

/* =========================================================
   COPY REFERRAL LINK
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copy-btn");
  const linkEl = document.getElementById("referral-link");
  const statusEl = document.getElementById("copy-status");

  if (!copyBtn || !linkEl || !statusEl) return;

  copyBtn.addEventListener("click", async () => {
    const codeEl = document.getElementById("referral-code");
const code = codeEl ? codeEl.textContent.trim() : null;
if (!code) return;

await navigator.clipboard.writeText(code);

    if (!link) return;

    await navigator.clipboard.writeText(link);
    statusEl.classList.remove("hidden");
    setTimeout(() => statusEl.classList.add("hidden"), 1500);
  });
});

/* =========================================================
   LEADERBOARD
========================================================= */
function maskEmail(email) {
  if (!email || !email.includes("@")) return "anonymous";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}****@${domain}`;
}

function renderLeaderboard(users) {
  const list = document.getElementById("leaderboard");
  if (!list) return;

  list.innerHTML = "";

  if (!Array.isArray(users) || users.length === 0) {
    list.innerHTML = `
      <li class="py-4 text-center text-white/50 text-sm">
        No leaderboard data
      </li>
    `;
    return;
  }

  // Sort highest earners first (authoritative)
  const sorted = [...users].sort((a, b) => {
    const aEarn = Number(a.referral_earnings_cents || 0);
    const bEarn = Number(b.referral_earnings_cents || 0);
    return bEarn - aEarn;
  });

  sorted.forEach((user, index) => {
    const earned =
      Number(user.referral_earnings_cents || 0) / 100;

    const li = document.createElement("li");
    li.className = "flex justify-between items-center py-3";

    li.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="font-bold text-[#00D2B1]">#${index + 1}</span>
        <span>${maskEmail(user.email)}</span>
      </div>
      <span class="font-semibold text-white/90">
        $${earned.toFixed(2)}
      </span>
    `;

    list.appendChild(li);
  });
}


async function loadLeaderboard() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(
      "https://glorivest-api-a16f75b6b330.herokuapp.com/api/leaderboard",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!res.ok) throw new Error("Leaderboard failed");

    const json = await res.json();

    // Handle flexible response shapes
    const users =
      Array.isArray(json) ? json :
      Array.isArray(json.data) ? json.data :
      Array.isArray(json.users) ? json.users :
      [];

    renderLeaderboard(users);

  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}


/* =========================================================
   TRANSFER REFERRAL → MAIN WALLET
========================================================= */
async function transferReferralToMain() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const amountStr = prompt("Enter amount to transfer (USD):", "0.00");
  if (!amountStr) return;

  const amount = Math.round(Number(amountStr) * 100);

  if (!Number.isInteger(amount) || amount <= 0) {
    alert("Invalid amount");
    return;
  }

  try {
    const res = await fetch(
      "https://glorivest-api-a16f75b6b330.herokuapp.com/api/transfer/profits",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount_cents: amount,
          source: "REFERRAL"
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Transfer failed");
      return;
    }

    await loadEarnTab();
    document.dispatchEvent(new Event("wallets:refresh"));

    alert("Transfer successful");

  } catch (err) {
    console.error(err);
    alert("Transfer failed");
  }
}


/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  loadEarnTab();
  loadLeaderboard();

  const transferBtn = document.getElementById("transfer-referral-btn");
  if (transferBtn) {
    transferBtn.addEventListener("click", transferReferralToMain);
  }
});
