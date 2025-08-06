document.addEventListener("DOMContentLoaded", () => {
    loadAccountInfo();
  
    // Join Telegram
    document.querySelector('[data-action="telegram"]')?.addEventListener("click", () => {
      window.open("https://t.me/glorivest", "_blank");
    });
  
    // Install Web App
    document.querySelector('[data-action="install"]')?.addEventListener("click", () => {
      alert("To install this app, tap your browser menu and select 'Add to Home Screen'.");
    });
  
    // Edit Profile
    document.querySelector('[data-action="profile"]')?.addEventListener("click", () => {
      alert("Edit Profile coming soon.");
    });
  
    // KYC Verification
    document.querySelector('[data-action="kyc"]')?.addEventListener("click", () => {
      alert("KYC Verification is currently pending. You'll be notified once available.");
    });
  
    // Security Settings
    document.querySelector('[data-action="security"]')?.addEventListener("click", () => {
      alert("Security Settings coming soon.");
    });
  
    // Notification Preferences
    document.querySelector('[data-action="notifications"]')?.addEventListener("click", () => {
      alert("Notification preferences coming soon.");
    });
  
    // Contact Support
    document.querySelector('[data-action="support"]')?.addEventListener("click", () => {
      window.open("mailto:support@glorivest.com", "_blank");
    });
  
    // Terms & Policies
    document.querySelector('[data-action="terms"]')?.addEventListener("click", () => {
      window.open("https://glorivest.com/terms", "_blank");
    });
  
    // Log Out
    document.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  });
  
  // Fetch and display user info (e.g. future updates)
  async function loadAccountInfo() {
    const token = localStorage.getItem("token");
    if (!token) return;
  
    try {
      const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/account/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      const user = await res.json();
      console.log("Account Loaded:", user);
  
      // You can optionally show their email, name, or RAVE ID
  
    } catch (err) {
      console.error("Failed to load account:", err);
    }
  }
  