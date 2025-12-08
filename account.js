(() => {
  'use strict';

  // State variable to store the browser's PWA install prompt event
  let deferredPrompt;

  // DOM element for the "Install Web App" action
  const installAppAction = document.querySelector('[data-action="install"]');

  /***** === PWA Installation Logic === *****/

  // 1. Listen for the browser's install prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing automatically
    e.preventDefault();
    // Stash the event so it can be triggered later by the user's click
    deferredPrompt = e;

    // Visually enable the install button when the prompt is ready
    if (installAppAction) {
        // Ensure the element is visible and highlight it for the user
        installAppAction.style.display = 'flex'; // Ensure visibility if it was hidden
        installAppAction.classList.add('cursor-pointer');
        // Add a visual indicator (using the teal color #00D2B1 for the icon)
        const icon = installAppAction.querySelector('i');
        if (icon) {
            icon.classList.add('text-[#00D2B1]');
            icon.classList.remove('text-white/70');
        }
    }
  });

  // 2. Handle the click event on the "Install Web App" element
  if (installAppAction) {
    installAppAction.addEventListener('click', (e) => {
      e.preventDefault();

      if (deferredPrompt) {
        // Show the stored installation prompt
        deferredPrompt.prompt();

        // Wait for the user to respond
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the Glorivest install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          // Clear the prompt event to prevent re-use
          deferredPrompt = null;

          // Optionally hide the button after one attempt
          if (installAppAction) {
            // Revert icon to default look, or hide the element entirely
            const icon = installAppAction.querySelector('i');
            if (icon) {
                icon.classList.remove('text-[#00D2B1]');
                icon.classList.add('text-white/70');
            }
          }
        });
      } else {
        alert("The app is already installed or your browser is not yet ready to show the prompt. Check your browser settings for an 'Install App' option.");
      }
    });
  }

  // 3. Register the Service Worker (Best practice is to register this in the main script that loads first)
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