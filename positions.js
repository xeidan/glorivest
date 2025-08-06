document.addEventListener("DOMContentLoaded", () => {
    loadTradeHistory();
  });
  
  function loadTradeHistory() {
    const history = JSON.parse(localStorage.getItem("tradeHistory") || "[]");
  
    const tbody = document.getElementById("trade-history");
    tbody.innerHTML = "";
  
    if (history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-white/60">No trades yet.</td>
        </tr>
      `;
      return;
    }
  
    history
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .forEach(trade => {
        const tr = document.createElement("tr");
  
        const isWin = trade.status === "won";
        const statusColor = isWin ? "text-green-400" : "text-red-400";
        const plColor = isWin ? "text-green-400" : "text-red-400";
  
        tr.innerHTML = `
          <td class="px-2 py-2 whitespace-nowrap">${formatTime(trade.time)}</td>
          <td class="px-2 py-2 text-red-400">${!isWin ? `$${trade.amount.toFixed(2)}` : "-"}</td>
          <td class="px-2 py-2 text-green-400">${isWin ? `$${trade.amount.toFixed(2)}` : "-"}</td>
          <td class="px-2 py-2">$${trade.amount.toFixed(2)}</td>
          <td class="px-2 py-2">$${trade.entry.toFixed(2)}</td>
          <td class="px-2 py-2 font-semibold ${plColor}">${isWin ? "+$" : "-$"}${trade.amount.toFixed(2)}</td>
          <td class="px-2 py-2 ${statusColor} font-bold uppercase">${trade.status}</td>
        `;
  
        tbody.appendChild(tr);
      });
  }
  
  function formatTime(iso) {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  


  function clearOldTrades() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
  
    let history = JSON.parse(localStorage.getItem("tradeHistory") || "[]");
  
    history = history.filter(t => now - new Date(t.time).getTime() < oneDay);
  
    localStorage.setItem("tradeHistory", JSON.stringify(history));
  }
  