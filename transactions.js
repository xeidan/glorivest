// transactions.js
// Loads and renders transactions table (Type, Amount, Status, Date).
// Depends on apiFetch and getCurrentAccountId.

(() => {
  const $ = id => document.getElementById(id);

  async function loadTransactions() {
    const tbody = $('transaction-history');
    if (!tbody) return;

    tbody.innerHTML =
      `<tr>
        <td colspan="4" class="px-2 py-3 text-center text-white/60">
          Loading…
        </td>
      </tr>`;

    try {
      const accountId =
        typeof getCurrentAccountId === 'function'
          ? await getCurrentAccountId()
          : localStorage.getItem('currentAccountId');

      if (!accountId) throw new Error('No account selected');

      let rows = [];

      try {
        rows = await apiFetch(`/accounts/${accountId}/transactions`, {
          method: 'GET'
        });
      } catch (err) {
        if (String(err?.status) === '404') {
          const deps = await apiFetch(`/accounts/${accountId}/deposits`, {
            method: 'GET'
          });

          rows = Array.isArray(deps)
            ? deps.map(d => ({
                type: 'deposit',
                created_at: d.created_at,
                amount_cents: Number(d.amount_cents ?? 0),
                net_cents: Number(d.amount_cents ?? 0),
                status: d.status || 'confirmed'
              }))
            : [];
        } else {
          throw err;
        }
      }

      if (!rows.length) {
        tbody.innerHTML =
          `<tr>
            <td colspan="4" class="px-2 py-3 text-center text-white/60">
              No transactions yet.
            </td>
          </tr>`;
        return;
      }

      rows.sort(
        (a, b) =>
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

      tbody.innerHTML = rows
        .map(tx => {
          const type =
            (tx.type || '').replace(/^\w/, c => c.toUpperCase()) ||
            'Unknown';

          const cents =
            tx.net_cents ?? tx.amount_cents ?? 0;

          const amount = (Number(cents) / 100).toFixed(2);

          const status = tx.status || 'pending';

          const when = tx.created_at
            ? new Date(tx.created_at).toLocaleString()
            : '-';

          return `
            <tr class="border-t border-white/10">
              <td class="px-2 py-2">${type}</td>
              <td class="px-2 py-2">$${amount}</td>
              <td class="px-2 py-2">${status}</td>
              <td class="px-2 py-2">${when}</td>
            </tr>
          `;
        })
        .join('');

    } catch (e) {
      tbody.innerHTML =
        `<tr>
          <td colspan="4" class="px-2 py-3 text-center text-rose-300">
            Error: ${e.message}
          </td>
        </tr>`;
    }
  }

  // expose loader globally
  window.loadTransactions = loadTransactions;

  // auto-load when tab becomes visible
  const txTab = $('tab-transactions');
  if (txTab) {
    const mo = new MutationObserver(() => {
      if (!txTab.classList.contains('hidden')) {
        loadTransactions();
      }
    });

    mo.observe(txTab, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
})();
