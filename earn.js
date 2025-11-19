
async function loadEarnTab() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/account/me", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const user = await res.json();

      const code = user.referral_code || "N/A";
      const link = `https://glorivest.com/index.html?ref=${code}`;
      const count = user.total_referrals || 0;
      const earnings = parseFloat(user.referral_earnings || 0).toFixed(2);

      document.getElementById("referral-code").textContent = code;
      document.getElementById("referral-link").textContent = link;
      document.getElementById("referral-link").setAttribute("data-link", link);
      document.getElementById("referral-count").textContent = count;
      document.getElementById("account-referral-earnings").textContent = `$${earnings}`;
    } catch (err) {
      console.error("Error loading earn tab:", err);
    }
  }

  // Handle copy to clipboard
  // Attach click event AFTER DOM is loaded and referral link is set
document.addEventListener("DOMContentLoaded", () => {
    const copyBtn = document.getElementById("copy-btn");
    const linkEl = document.getElementById("referral-link");
    const statusEl = document.getElementById("copy-status");
  
    if (copyBtn && linkEl && statusEl) {
      copyBtn.addEventListener("click", () => {
        const link = linkEl.textContent.trim();
        if (!link) return;
  
        navigator.clipboard.writeText(link).then(() => {
          statusEl.classList.remove("hidden");
          setTimeout(() => statusEl.classList.add("hidden"), 1500);
        });
      });
    }
  });
  

  // Mask email for leaderboard
  function maskEmail(email) {
    const [name, domain] = email.split("@");
    const masked = name.length > 2 ? name.slice(0, 2) + "****" : name + "****";
    return `${masked}@${domain}`;
  }

  // Render leaderboard
  function renderLeaderboard(users) {
    const list = document.getElementById("leaderboard");
    list.innerHTML = "";

    users.forEach((user, index) => {
      const li = document.createElement("li");
      li.className = "bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between";

      li.innerHTML = `
        <div class="flex items-center space-x-4">
          <div class="text-xl font-bold text-[#00D2B1]">#${index + 1}</div>
          <div>
            <p class="text-white font-semibold text-sm">${maskEmail(user.email || "anonymous")}</p>
            <p class="text-white/60 text-xs">${user.total_referrals || 0} referral${user.total_referrals === 1 ? "" : "s"}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-[#00D2B1] font-bold text-sm">$${parseFloat(user.reward_balance || 0).toFixed(2)}</p>
          <p class="text-white/40 text-xs">Earned</p>
        </div>
      `;
      list.appendChild(li);
    });
  }

  // Load leaderboard
  async function loadLeaderboard() {
    try {
      const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/leaderboard");
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.warn("Expected an array, got:", data);
        return;
      }

      renderLeaderboard(data.slice(0, 10));
    } catch (err) {
      console.error("Leaderboard error:", err);
    }
  }

  // Initialize on DOM load
  document.addEventListener("DOMContentLoaded", () => {
    loadEarnTab();
    loadLeaderboard();
  });

