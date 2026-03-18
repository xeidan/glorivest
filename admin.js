const TOKEN = localStorage.getItem('token');

if (!TOKEN) {
  alert('Unauthorized');
  window.location.href = '/login.html';
}


const user = JSON.parse(localStorage.getItem('user'));

if (!user || user.role !== 'admin') {
  alert('Admins only');
  window.location.href = '/';
}
async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + TOKEN
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    alert(text);
    throw new Error(text);
  }

  return res.json();
}

/* =========================
   DEPOSITS
========================= */

async function loadDeposits() {
  const data = await api('/admin/deposits');

  const table = document.getElementById('depositsTable');

  table.innerHTML = `
    <tr>
      <th>User</th>
      <th>Amount</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  ` + data.map(d => `
    <tr>
      <td>${d.user_id}</td>
      <td>${d.amount_exact_cents / 100}</td>
      <td>${d.status}</td>
      <td>
        ${
          d.status === 'USER_MARKED_PAID'
          ? `<button onclick="approveDeposit('${d.id}')">Approve</button>`
          : ''
        }
      </td>
    </tr>
  `).join('');
}

async function approveDeposit(id) {
  await api(`/admin/deposits/${id}/approve`, {
    method: 'POST'
  });

  loadDeposits();
}

/* =========================
   WITHDRAWALS
========================= */

async function loadWithdrawals() {
  const data = await api('/admin/withdrawals');

  const table = document.getElementById('withdrawalsTable');

  table.innerHTML = `
    <tr>
      <th>User</th>
      <th>Amount</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  ` + data.map(w => `
    <tr>
      <td>${w.user_id}</td>
      <td>${w.amount_cents / 100}</td>
      <td>${w.status}</td>
      <td>
        ${
          w.status === 'PENDING'
          ? `<button onclick="approveWithdrawal('${w.id}')">Approve</button>`
          : ''
        }
      </td>
    </tr>
  `).join('');
}

async function approveWithdrawal(id) {
  await api(`/admin/withdrawals/${id}/approve`, {
    method: 'POST'
  });

  loadWithdrawals();
}

/* =========================
   INIT
========================= */

loadDeposits();
loadWithdrawals();