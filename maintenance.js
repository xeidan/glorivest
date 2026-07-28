const BASE_URL = 'https://glorivest-api-production.up.railway.app/api';

const title = document.getElementById('maintenance-title');
const message = document.getElementById('maintenance-message');
const countdownContainer = document.getElementById('countdown-container');
const countdown = document.getElementById('countdown');

/* ==================================================
   LOAD MAINTENANCE DATA
================================================== */

const stored = sessionStorage.getItem('glorivest-maintenance');

let maintenance = {};

if (stored) {
  try {
    maintenance = JSON.parse(stored);
  } catch {
    maintenance = {};
  }
}

title.textContent =
  maintenance.title ||
  "We'll be back shortly";

message.textContent =
  maintenance.message ||
  'We are currently performing scheduled maintenance.';

/* ==================================================
   COUNTDOWN
================================================== */

if (maintenance.endsAt) {

  countdownContainer.classList.remove('hidden');

  const end = new Date(maintenance.endsAt);

  function updateCountdown() {

    const now = new Date();

    let remaining = end - now;

    if (remaining <= 0) {

      countdown.textContent = '00:00:00';

      return;

    }

    const hours = Math.floor(remaining / 3600000);

    remaining %= 3600000;

    const minutes = Math.floor(remaining / 60000);

    remaining %= 60000;

    const seconds = Math.floor(remaining / 1000);

    countdown.textContent =
      String(hours).padStart(2, '0') +
      ':' +
      String(minutes).padStart(2, '0') +
      ':' +
      String(seconds).padStart(2, '0');

  }

  updateCountdown();

  setInterval(updateCountdown, 1000);

}

/* ==================================================
   AUTO RETRY
================================================== */

async function checkMaintenance() {

  try {

    const response = await fetch(
      `${BASE_URL}/leaderboard`,
      {
        cache: 'no-store'
      }
    );

    // Still under maintenance
    if (response.status === 503) {

      const latest = await response.json();

      sessionStorage.setItem(
        'glorivest-maintenance',
        JSON.stringify(latest)
      );

      return;

    }

    // Maintenance finished
    sessionStorage.removeItem(
      'glorivest-maintenance'
    );

    // Return to application
    window.location.href = 'app.html';

  } catch (err) {

    console.log(
      'Maintenance check failed.',
      err
    );

  }

}

// Check every 30 seconds
setInterval(checkMaintenance, 30000);

// First check after 5 seconds
setTimeout(checkMaintenance, 5000);