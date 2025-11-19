// positions.js — 
(function () {
  const API_BASE = "https://glorivest-api-a16f75b6b330.herokuapp.com";
  const ENDPOINTS = { list: `${API_BASE}/positions/me` };

  const els = {
    section: document.getElementById("tab-positions"),
    tbody: document.getElementById("pos-tbody"),
    pageInfo: document.getElementById("pos-pagination-info"),
    prev: document.getElementById("pos-prev"),
    next: document.getElementById("pos-next"),
  };

  const state = { page: 1, pages: 1, loading: false, initialized: false };

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;
  const fmtQty   = (n) => Number(n || 0).toFixed(2);
  const fmtTime  = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

  const sidePill = (side) => {
    if (side === "BUY") {
      return `<span class="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold">BUY</span>`;
    }
    if (side === "SELL") {
      return `<span class="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-semibold">SELL</span>`;
    }
    return `<span class="px-2 py-0.5 rounded-md bg-white/10 text-white/70">—</span>`;
  };

  const statusBadge = (status) => {
    const map = {
      RUNNING: "bg-amber-500/15 text-amber-300",
      CLOSED: "bg-emerald-500/15 text-emerald-300",
      CANCELLED: "bg-rose-500/15 text-rose-300",
    };
    return `<span class="px-2 py-1 rounded ${map[status] || "bg-white/10 text-white/80"}">${status || "—"}</span>`;
  };

  const setEmpty = (msg = "No positions yet.") => {
    els.tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-white/60">${msg}</td></tr>`;
    if (els.pageInfo) els.pageInfo.textContent = "Page 1 of 1";
    els.prev?.setAttribute("disabled", "true");
    els.next?.setAttribute("disabled", "true");
  };

  const todayStartISO = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  };

  async function fetchJSON(url) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    if (res.status === 401 || res.status === 403) throw new Error("AUTH");
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function queryString() {
    const p = new URLSearchParams();
    p.set("page", state.page);
    p.set("page_size", 10); // fixed at 10 per page
    p.set("sort_by", "opened_at");
    p.set("sort_dir", "desc");
    p.set("date_from", todayStartISO()); // daily reset
    return p.toString();
  }

  async function loadTable() {
    const token = localStorage.getItem("token");
    if (!token) {
      setEmpty("Sign in to see your positions.");
      return;
    }

    const url = `${ENDPOINTS.list}?${queryString()}`;
    try {
      const { data = [], page, pages, total } = await fetchJSON(url);
      state.page = page;
      state.pages = pages;

      if (!data.length) {
        setEmpty("No positions yet for today.");
        return;
      }

      els.tbody.innerHTML = data
        .map((r) => `
          <tr class="border-t border-white/10 hover:bg-white/5">
            <td class="p-3">
              ${fmtTime(r.opened_at)}
              ${r.closed_at ? `<div class="text-xs text-white/50">→ ${fmtTime(r.closed_at)}</div>` : ""}
            </td>
            <td class="p-3">${r.symbol || "—"}</td>
            <td class="p-3">${sidePill(r.side)}</td>
            <td class="p-3 text-right">${fmtQty(r.qty)}</td>
            <td class="p-3 text-right">${fmtMoney(r.entry_price)}</td>
            <td class="p-3 text-right">${r.exit_price != null ? fmtMoney(r.exit_price) : "—"}</td>
            <td class="p-3">${statusBadge(r.status)}</td>
          </tr>
        `)
        .join("");

      if (els.pageInfo) els.pageInfo.textContent = `Page ${page} of ${pages} • ${total} total`;
      els.prev.disabled = page <= 1;
      els.next.disabled = page >= pages;
    } catch (e) {
      if (e.message === "AUTH") {
        setEmpty("Please log in again.");
        return;
      }
      console.error("Positions load error:", e);
      setEmpty("Failed to load positions.");
    }
  }

  function bindPagination() {
    els.prev?.addEventListener("click", () => {
      if (state.page > 1) {
        state.page--;
        loadTable();
      }
    });
    els.next?.addEventListener("click", () => {
      if (state.page < state.pages) {
        state.page++;
        loadTable();
      }
    });
  }

  function initOnce() {
    if (state.initialized) return;
    state.initialized = true;
    bindPagination();
    loadTable();
  }

  if (els.section) {
    const obs = new MutationObserver(() => {
      if (!els.section.classList.contains("hidden")) initOnce();
    });
    obs.observe(els.section, { attributes: true, attributeFilter: ["class"] });
  }
  document.querySelector('.tab-btn[data-tab="positions"]')?.addEventListener("click", initOnce, { once: true });

  document.addEventListener("positions:refresh", loadTable);
})();
