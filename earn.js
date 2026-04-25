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
   EARN MODAL SYSTEM
========================================================= */
function closeEarnModal() {
  const wrap = document.getElementById("earn-modal-wrap");
  if (!wrap) return;

  const bg = wrap.querySelector(".earn-backdrop");
  const panel = wrap.querySelector(".earn-panel");

  bg.classList.remove("opacity-100");

  panel.classList.remove("scale-100", "opacity-100");
  panel.classList.add("scale-95", "opacity-0");

  setTimeout(() => wrap.remove(), 220);
}

function renderEarnBanner(message, type = "error") {
  const host = document.getElementById("earn-inline-banner");
  if (!host) return;

  host.innerHTML = "";

  const box = document.createElement("div");
  box.className =
    "rounded-2xl border px-4 py-3 text-sm leading-6";

  if (type === "success") {
    box.classList.add(
      "border-[#00D2B1]/30",
      "bg-[#00D2B1]/10",
      "text-[#7ef7e2]"
    );
  } else {
    box.classList.add(
      "border-red-500/35",
      "bg-red-950/60",
      "text-red-300"
    );
  }

  box.textContent = message;
  host.appendChild(box);
}

function openEarnTransferModal() {
  const old = document.getElementById("earn-modal-wrap");
  if (old) old.remove();

  const wrap = document.createElement("div");
  wrap.id = "earn-modal-wrap";
  wrap.className = "fixed inset-0 z-[9999]";

  wrap.innerHTML = `
    <div class="earn-backdrop absolute inset-0 bg-black/75 backdrop-blur-sm opacity-0 transition duration-200"></div>

<div class="earn-panel absolute left-1/2 top-1/2 w-[calc(100%-24px)] max-w-md
  -translate-x-1/2 -translate-y-1/2 scale-95 opacity-0
  transition-all duration-300 ease-out
  rounded-3xl border border-white/10 bg-[#090909]
  px-5 py-5 shadow-[0_20px_80px_rgba(0,0,0,.65)]">



      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-2xl font-semibold text-white tracking-tight">
            Transfer Funds
          </h3>
          <p class="text-sm text-white/40 mt-1">
            Move referral earnings to your main balance
          </p>
        </div>

        <button id="earn-close-btn"
          class="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white">
          ✕
        </button>
      </div>

      <div id="earn-inline-banner" class="mb-4"></div>

      <label class="block text-sm text-white/55 mb-2">
        Amount (USD)
      </label>

      <input
        id="earn-amount"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        class="w-full h-12 rounded-xl bg-black/30 border border-white/10
               px-4 text-white placeholder-white/30 outline-none
               focus:border-[#00D2B1]"
      >

      <button
        id="earn-submit-btn"
        class="mt-5 w-full h-12 rounded-xl bg-[#00D2B1] text-black font-semibold">
        Continue
      </button>
    </div>
  `;

  document.body.appendChild(wrap);

requestAnimationFrame(() => {
  wrap.querySelector(".earn-backdrop").classList.add("opacity-100");

  const panel = wrap.querySelector(".earn-panel");
  panel.classList.remove("scale-95", "opacity-0");
  panel.classList.add("scale-100", "opacity-100");
});

  const close = () => closeEarnModal();

  wrap.querySelector("#earn-close-btn").onclick = close;
  wrap.querySelector(".earn-backdrop").onclick = close;

  document.addEventListener(
    "keydown",
    function esc(e) {
      if (e.key === "Escape") close();
      document.removeEventListener("keydown", esc);
    },
    { once: true }
  );

  setTimeout(() => {
    wrap.querySelector("#earn-amount")?.focus();
  }, 120);
}


/* =========================================================
   TRANSFER REFERRAL → MAIN WALLET
========================================================= */

async function transferReferralToMain() {
  const token = localStorage.getItem("token");
  if (!token) return;

  openEarnTransferModal();

  const btn = document.getElementById("earn-submit-btn");
  const input = document.getElementById("earn-amount");

  if (!btn || !input) return;

  btn.onclick = async () => {
    const amount = Math.round(Number(input.value.trim()) * 100);

    if (!Number.isInteger(amount) || amount <= 0) {
      renderEarnBanner("Enter a valid transfer amount.", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Processing...";

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
        renderEarnBanner(
          data.error || "Transfer failed.",
          "error"
        );
        btn.disabled = false;
        btn.textContent = "Continue";
        return;
      }

      await loadEarnTab();
      document.dispatchEvent(new Event("wallets:refresh"));

      renderEarnBanner(
        "Transfer completed successfully.",
        "success"
      );

      btn.textContent = "Completed";

      setTimeout(() => {
        closeEarnModal();
      }, 900);

    } catch (err) {
      console.error(err);

      renderEarnBanner("Transfer failed.", "error");

      btn.disabled = false;
      btn.textContent = "Continue";
    }
  };
}


/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  let earnRefreshing = false;

  async function refreshEarnData() {
    if (earnRefreshing) return;
    earnRefreshing = true;

    try {
      await Promise.all([
        loadEarnTab(),
        loadLeaderboard()
      ]);
    } catch (err) {
      console.error("earn refresh failed", err);
    } finally {
      earnRefreshing = false;
    }
  }

  refreshEarnData();

  setInterval(refreshEarnData, 30000);

  window.addEventListener("focus", refreshEarnData);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshEarnData();
  });

  const transferBtn = document.getElementById("transfer-referral-btn");

  if (transferBtn) {
    transferBtn.addEventListener("click", transferReferralToMain);
  }
});
