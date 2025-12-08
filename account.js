(() => {
  'use strict';

  let deferredPrompt = null;
  const installAppAction = document.querySelector('[data-action="install"]');
  const INSTALL_ICON_CLASS = 'text-[#00D2B1]';
  const DEFAULT_ICON_CLASS = 'text-white/70';

  /***** === PWA Device Detection & Manual Instructions === *****/

  function getInstallInstructions() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;

      // 1. iOS Detection (Safari)
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
          return {
              title: "Install on iOS (iPhone/iPad)",
              steps: [
                  "Tap the **Share** button (box with an upward arrow) at the bottom of the screen.",
                  "Scroll down and select **'Add to Home Screen'**.",
                  "Tap **'Add'** in the top-right corner."
              ],
              icon: "fa-solid fa-share-square" // Or just use fa-solid fa-download
          };
      }

      // 2. Android Detection (Chrome, etc.)
      if (/android/i.test(userAgent)) {
          return {
              title: "Install on Android",
              steps: [
                  "Tap the **three-dot menu** (⋮) in the top-right corner of your browser.",
                  "Select **'Install app'** or **'Add to Home screen'**."
              ],
              icon: "fa-solid fa-ellipsis-v"
          };
      }

      // 3. Desktop/Other Browsers (General Fallback)
      return {
          title: "Install Web App",
          steps: [
              "Look for a small **'Install'** icon (often a plus sign or download arrow) in your browser's address bar.",
              "Click that icon and follow the prompts to install the app to your device."
          ],
          icon: "fa-solid fa-desktop"
      };
  }
  
  // Custom alert/modal function to show clear, formatted instructions
  function showInstallModal() {
      const instructions = getInstallInstructions();
      let stepList = instructions.steps.map(step => `<li>${step}</li>`).join('');

      alert(`
        ${instructions.title}

        To install Glorivest to your home screen, please follow these steps:
        
        1. ${instructions.steps[0]}
        2. ${instructions.steps[1]}
        ${instructions.steps.length > 2 ? `3. ${instructions.steps[2]}` : ''}
        
        Note: This process may vary slightly depending on your browser.
      `);
      // NOTE: You should replace 'alert' with a proper, formatted HTML/CSS modal for better UI.
  }

  /***** === PWA Event Handlers === *****/

  // 1. Stash the prompt when available
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (installAppAction) {
        // Highlight button when the automatic prompt is ready
        installAppAction.style.display = 'flex';
        installAppAction.classList.add('cursor-pointer');
        const icon = installAppAction.querySelector('i');
        if (icon) {
            icon.classList.add(INSTALL_ICON_CLASS);
            icon.classList.remove(DEFAULT_ICON_CLASS);
        }
    }
  });

  // 2. Handle the click event on the "Install Web App" element
  if (installAppAction) {
    installAppAction.addEventListener('click', (e) => {
      e.preventDefault();

      if (deferredPrompt) {
        // Case A: Automatic prompt is available (first try)
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
          // After attempting, revert the button's visual state
          const icon = installAppAction.querySelector('i');
          if (icon) {
              icon.classList.remove(INSTALL_ICON_CLASS);
              icon.classList.add(DEFAULT_ICON_CLASS);
          }
        });

      } else {
        // Case B: Automatic prompt failed or was dismissed, provide manual guidance
        showInstallModal();
      }
    });
  }

  // 3. Service Worker Registration (Kept for completeness)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, err => {
          console.log('ServiceWorker registration failed: ', err);
        });
    });
  }
})();