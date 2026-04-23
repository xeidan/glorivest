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
   COPY REFERRAL CODE 
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copy-btn");
  const codeEl = document.getElementById("referral-code");
  const statusEl = document.getElementById("copy-status");

  if (!copyBtn || !codeEl) return;

copyBtn.addEventListener("click", async () => {
  const code = codeEl.textContent.trim();
  if (!code || code === "LOADING...") return;

  try {
    await navigator.clipboard.writeText(code);

    copyBtn.classList.remove("text-white/55", "border-white/10", "bg-white/5");
    copyBtn.classList.add(
      "text-[#00D2B1]",
      "border-[#00D2B1]/30",
      "bg-[#00D2B1]/10"
    );

    setTimeout(() => {
      copyBtn.classList.remove(
        "text-[#00D2B1]",
        "border-[#00D2B1]/30",
        "bg-[#00D2B1]/10"
      );

      copyBtn.classList.add(
        "text-white/55",
        "border-white/10",
        "bg-white/5"
      );
    }, 1500);

  } catch (err) {
    console.error("Copy failed:", err);
  }
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
      <li class="py-6 text-center text-white/45 text-sm">
        No leaderboard data
      </li>
    `;
    return;
  }

  const sorted = [...users].sort((a, b) => {
    return Number(b.referral_earnings_cents || 0) -
           Number(a.referral_earnings_cents || 0);
  });

const rankStyle = (rank) => {
  if (rank === 1) {
    return "bg-yellow-400/15 text-yellow-300 border border-yellow-300/25";
  }

  if (rank === 2) {
    return "bg-slate-300/15 text-slate-200 border border-slate-200/20";
  }

  if (rank === 3) {
    return "bg-orange-500/15 text-orange-300 border border-orange-300/25";
  }

  return "bg-white/5 text-white/70 border border-white/5";
};

  sorted.forEach((user, index) => {
    const rank = index + 1;
    const earned = Number(user.referral_earnings_cents || 0) / 100;

    const li = document.createElement("li");
    li.className = "px-4 py-4";

    li.innerHTML = `
      <div class="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 flex items-center justify-between gap-3">

        <div class="flex items-center gap-3 min-w-0">

          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${rankStyle(rank)}">
            #${rank}
          </div>

          <div class="min-w-0">
            <p class="text-white font-medium truncate">
              ${maskEmail(user.email)}
            </p>

            <p class="text-white/40 text-xs mt-0.5">
              ${rank <= 3 ? "Top Referrer" : "Community Member"}
            </p>
          </div>

        </div>

        <div class="text-right shrink-0">
          <p class="text-white font-semibold">
            $${earned.toFixed(2)}
          </p>

          <p class="text-white/35 text-[11px] mt-0.5">
            earned
          </p>
        </div>

      </div>
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
   MODALS
========================================================= */
function earnNotice(title, message) {
  const wrap = document.createElement("div");

  wrap.className =
    "fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";

  wrap.innerHTML = `
    <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0b0b] overflow-hidden">
      <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h3 class="text-white text-lg font-semibold">${title}</h3>
        <button class="text-white/50 hover:text-white text-xl close-btn">&times;</button>
      </div>

      <div class="p-5">
        <p class="text-white/70 text-sm leading-6">${message}</p>

        <button class="mt-5 w-full h-12 rounded-2xl bg-[#00D2B1] text-black font-semibold ok-btn">
          OK
        </button>
      </div>
    </div>
  `;

  const close = () => wrap.remove();

  wrap.querySelector(".close-btn").onclick = close;
  wrap.querySelector(".ok-btn").onclick = close;
  wrap.onclick = (e) => { if (e.target === wrap) close(); };

  document.body.appendChild(wrap);
}

function earnTransferModal() {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");

    wrap.className =
      "fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";

    wrap.innerHTML = `
      <div class="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0b0b0b] overflow-hidden">
        <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 class="text-white text-lg font-semibold">Transfer Funds</h3>
          <button class="text-white/50 hover:text-white text-xl close-btn">&times;</button>
        </div>

        <div class="p-5">
          <label class="block text-white/60 text-sm mb-2">Amount (USD)</label>

          <input
            id="earn-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full h-12 rounded-2xl bg-white/5 border border-white/10 px-4 text-white outline-none"
          />

          <button class="mt-5 w-full h-12 rounded-2xl bg-[#00D2B1] text-black font-semibold submit-btn">
            Continue
          </button>
        </div>
      </div>
    `;

    const close = (value = null) => {
      wrap.remove();
      resolve(value);
    };

    wrap.querySelector(".close-btn").onclick = () => close(null);

    wrap.querySelector(".submit-btn").onclick = () => {
      const val = wrap.querySelector("#earn-amount").value.trim();
      close(val);
    };

    wrap.onclick = (e) => { if (e.target === wrap) close(null); };

    document.body.appendChild(wrap);
    setTimeout(() => wrap.querySelector("#earn-amount").focus(), 50);
  });
}


/* =========================================================
   TRANSFER REFERRAL → MAIN WALLET
========================================================= */
async function transferReferralToMain() {
  const token = localStorage.getItem("token");
  if (!token) return;

  const amountStr = await earnTransferModal();
  if (!amountStr) return;

  const amount = Math.round(Number(amountStr) * 100);

  if (!Number.isInteger(amount) || amount <= 0) {
    earnNotice("Invalid Amount", "Enter a valid transfer amount.");
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
      earnNotice("Transfer Failed", data.error || "Transfer failed.");
      return;
    }

    await loadEarnTab();
    document.dispatchEvent(new Event("wallets:refresh"));

    earnNotice("Success", "Transfer completed successfully.");

  } catch (err) {
    console.error(err);
    earnNotice("Error", "Transfer failed.");
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
