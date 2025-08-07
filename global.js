// ===============================
// 1. Main Tab Navigation (Bottom Nav)
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabSections = document.querySelectorAll(".tab-section");

  function activateTab(tabName) {
    // Hide all sections
    tabSections.forEach(section => {
      section.classList.add("hidden");
    });

    // Show selected section
    const targetSection = document.getElementById(`tab-${tabName}`);
    if (targetSection) targetSection.classList.remove("hidden");

    // Remove active class from all buttons
    tabButtons.forEach(btn => btn.classList.remove("active-tab"));

    // Add active class to selected button
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add("active-tab");
  }

  // Attach click listeners to all buttons
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      activateTab(tab);
    });
  });

  // Activate Dashboard by default
  activateTab("dashboard");
});





// ===============================
// 2. Open Deposit/Withdraw/Tx Modals
// ===============================
function openModalTab(tabId) {
  // Show modal
  const modal = document.getElementById(`tab-${tabId}`);
  if (modal) modal.classList.remove('hidden');
}



// ===============================
// 3. Close Modal Tab and Reset to Dashboard
// ===============================
function closeTab(el) {
  const tabSection = el.closest('.tab-content');
  if (tabSection) tabSection.classList.add('hidden');

  // Always go back to dashboard
  showTab('dashboard');
}



// ===============================
// 4. Modal Toggle (Guide + Notification)
// ===============================
window.addEventListener('DOMContentLoaded', () => {
  const notificationBtn = document.getElementById("notification-btn");
  const guideBtn = document.getElementById("guide-btn");
  const notificationModal = document.getElementById("notification-modal");
  const guideModal = document.getElementById("guide-modal");

  notificationBtn.addEventListener("click", () => {
    guideModal.classList.add("hidden");
    notificationModal.classList.toggle("hidden");
    notificationBtn.classList.toggle("text-[#00D2B1]");
    guideBtn.classList.remove("text-[#00D2B1]");
  });

  guideBtn.addEventListener("click", () => {
    notificationModal.classList.add("hidden");
    guideModal.classList.remove("hidden");
    guideBtn.classList.add("text-[#00D2B1]");
    notificationBtn.classList.remove("text-[#00D2B1]");
  });
});



// ===============================
// 5. Close Modals Programmatically
// ===============================
function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
  document.getElementById("notification-btn")?.classList.remove("text-[#00D2B1]");
  document.getElementById("guide-btn")?.classList.remove("text-[#00D2B1]");
}



// ===============================
// 6. Load User Header Info (Email, ID, Initials)
// ===============================
async function loadUserHeader() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch("https://glorivest-api-a16f75b6b330.herokuapp.com/account/me", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to fetch user data");

    const user = await res.json();

    const email = user.email || "user@example.com";
    const glorivestId = user.glorivest_id || `GV${String(user.id).padStart(6, '0')}`;
    const initials = email.split("@")[0].slice(0, 2).toUpperCase();

    // Populate header elements
    document.getElementById("user-email").textContent = email;
    document.getElementById("glorivest-id").textContent = glorivestId;
    document.getElementById("user-initials").textContent = initials;

  } catch (err) {
    console.error("Error loading user header:", err);
  }
}

window.addEventListener('DOMContentLoaded', loadUserHeader);


