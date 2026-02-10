(function () {
  'use strict';

  const tbody = document.getElementById('transaction-history');
  if (!tbody) return;

  function fmtUSD(cents) {
    return `$${(Number(cents) / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function typeLabel(type) {
    const map = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      cycle_lock: 'Cycle Lock',
      cycle_unlock: 'Capital Returned',
      cycle_profit: 'Cycle Profit',
      referral_bonus: 'Referral Bonus'
    };
    return map[type] || type;
  }

  function statusFor(type) {
    if (type === 'withdrawal') return 'Processing';
    return 'Completed';
  }

  function renderRow(tx) {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td class="px-4 py-3">${typeLabel(tx.type)}</td>
      <td class="px-4 py-3 text-right font-semibold">
        ${tx.amount_cents < 0 ? '-' : ''}${fmtUSD(Math.abs(tx.amount_cents))}
      </td>
      <td class="px-4 py-3">${statusFor(tx.type)}</td>
      <td class="px-4 py-3 text-right text-xs text-white/60">
        ${new Date(tx.created_at).toLocaleString()}
      </td>
    `;

    tbody.appendChild(tr);
  }

  // async function loadTransactions() {
  //   tbody.innerHTML = '';

  //   try {
  //     const txs = await apiFetch('/transactions');

  //     if (!txs.length) {
  //       tbody.innerHTML = `
  //         <tr>
  //           <td colspan="4" class="text-center py-6 text-white/50">
  //             No transactions yet
  //           </td>
  //         </tr>
  //       `;
  //       return;
  //     }

  //     txs.forEach(renderRow);
  //   } catch (err) {
  //     console.error('Failed to load transactions', err);
  //     tbody.innerHTML = `
  //       <tr>
  //         <td colspan="4" class="text-center py-6 text-red-400">
  //           Failed to load transactions
  //         </td>
  //       </tr>
  //     `;
  //   }
  // }

  // document.addEventListener('DOMContentLoaded', loadTransactions);
  // document.addEventListener('wallets:refresh', loadTransactions);
})();
