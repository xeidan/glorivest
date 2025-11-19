// account.js — Glorivest
(function(){
  const API_BASE = "https://glorivest-api-a16f75b6b330.herokuapp.com";

  // Event delegation for account actions
  document.addEventListener('DOMContentLoaded', () => {
    const accountSection = document.getElementById('tab-account');
    if (!accountSection) return;

    accountSection.addEventListener('click', async (e) => {
      const row = e.target.closest('[data-action]');
      if (!row) return;
      const action = row.getAttribute('data-action');
      try {
        switch(action){
          case 'telegram':
            window.open('https://t.me/', '_blank');
            break;
          case 'install':
            await triggerPWAInstall();
            break;
          case 'profile':
            alert('Profile editing coming soon.');
            break;
          case 'kyc':
            alert('KYC flow coming soon.');
            break;
          case 'security':
            alert('Security settings coming soon.');
            break;
          case 'notifications':
            alert('Notification preferences coming soon.');
            break;
          case 'support':
            window.location.href = 'mailto:support@glorivest.com?subject=Support%20Request';
            break;
          case 'terms':
            window.open('#', '_blank');
            break;
          case 'logout':
            handleLogout();
            break;
        }
      } catch(err){
        console.error('Account action error:', err);
      }
    });
  });

  function handleLogout(){
    localStorage.removeItem('token');
    // Optionally clear other state
    localStorage.removeItem('botRunning');
    localStorage.removeItem('botStartTime');
    alert('You have been logged out.');
    window.location.href = 'index.html';
  }

  // --- PWA Install support
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  async function triggerPWAInstall(){
    if (deferredInstallPrompt){
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome !== 'accepted') console.log('PWA install dismissed');
      deferredInstallPrompt = null;
    } else {
      alert('Install is not available right now. Try again later.');
    }
  }
})();