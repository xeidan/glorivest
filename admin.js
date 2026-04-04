const BASE_URL = 'https://glorivest-api-a16f75b6b330.herokuapp.com/api';

let deposits = [];
let page = 1;
const LIMIT = 10;

/* =========================
   AUTH CHECK
========================= */
(function initAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || user.role?.toLowerCase() !== 'admin') {
    alert('Admin access required');
    window.location.href = 'index.html';
  }
})();

/* =========================
   API
========================= */
async function api(path, options = {}) {
  const token = localStorage.getItem('token');

  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = 'index.html';
    throw new Error('Unauthorized');
  }

  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'Request failed');

  return data;
}

/* =========================
   LOAD DATA
========================= */
async function loadData() {
  deposits = await api('/admin/deposits');
  renderDeposits();
  renderStats();
}

/* =========================
   TABLE
========================= */
function renderDeposits() {
  const table = document.getElementById('depositsTable');
  if (!table) return;

  const start = (page - 1) * LIMIT;
  const paginated = deposits.slice(start, start + LIMIT);

  table.innerHTML = paginated.map(d => `
    <tr>
      <td>${d.user_id}</td>
      <td>$${(d.amount_exact_cents / 100).toFixed(2)}</td>
      <td>${d.status}</td>
      <td>
        ${d.status === 'USER_MARKED_PAID'
          ? `<button onclick="approve('${d.id}')">Approve</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

/* =========================
   APPROVE
========================= */
async function approve(id) {
  await api(`/admin/deposits/${id}/approve`, {
    method: 'POST'
  });

  loadData();
}

/* =========================
   RATE UPDATE
========================= */
async function updateRate() {
  const rate = prompt('Enter NGN rate per USDT');

  if (!rate || Number(rate) <= 0) {
    alert('Invalid rate');
    return;
  }

  await api('/rates', {
    method: 'PUT',
    body: JSON.stringify({ rate: Number(rate) })
  });

  alert('Rate updated');
}

/* =========================
   STATS
========================= */
function renderStats() {
  const total = deposits.reduce((s, d) => s + d.amount_exact_cents, 0);

  const el = document.getElementById('statDeposits');
  if (el) el.innerText = '$' + (total / 100).toFixed(2);
}

/* =========================
   INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadData();
    }
  }, 10000);
});