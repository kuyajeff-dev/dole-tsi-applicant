// ----------------------
// ELEMENTS
// ----------------------
const fields = ["full_name", "avatar", "establishment"];
const editBtn = document.getElementById("editBtn");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");

const currentPasswordInput = document.getElementById("currentPassword");
const verifyCurrentBtn = document.getElementById("verifyCurrentBtn");
const newPasswordFields = document.getElementById("newPasswordFields");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const statusEl = document.getElementById("passwordStatus");

let originalData = {};
let currentUser = {};
let currentPasswordValid = false;

// ----------------------
// HELPERS
// ----------------------
function getAvatarUrl(filename) {
  if (!filename) return "/uploads/default-avatar.png";
  return `/uploads/${filename.replace(/^uploads\//, "")}`;
}

function setStatus(message, isSuccess) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("text-green-600", isSuccess);
  statusEl.classList.toggle("text-red-600", !isSuccess);
}

// ----------------------
// PROFILE MANAGEMENT
// ----------------------
async function loadProfile() {
  try {
    const res = await fetch("/tsi-applicant/api/profile", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch profile");

    const user = await res.json();
    originalData = { ...user };
    currentUser = user;

    // Populate form fields
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) el.value = user[f] || "";
      if (el) el.disabled = true;
    });

    const emailEl = document.getElementById("email");
    if (emailEl) emailEl.value = user.email || "";

    // Display info
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileAvatar = document.getElementById("profileAvatar");

    if (profileName) profileName.textContent = user.full_name || "User";
    if (profileEmail) profileEmail.textContent = user.email || "";
    if (profileAvatar) profileAvatar.src = getAvatarUrl(user.avatar);

    // Navbar
    const navUserName = document.getElementById("navUserName");
    const navAvatar = document.getElementById("navAvatar");
    if (navUserName) navUserName.textContent = user.full_name || "User";
    if (navAvatar) navAvatar.src = getAvatarUrl(user.avatar);

    // Button visibility
    saveBtn.classList.add("hidden");
    cancelBtn.classList.add("hidden");
    editBtn.classList.remove("hidden");

    // Reset password section
    currentPasswordInput.value = "";
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    newPasswordFields.classList.add("hidden");
    verifyCurrentBtn.classList.remove("hidden");
    setStatus("", true);
    currentPasswordValid = false;

  } catch (err) {
    console.error("Error loading profile:", err);
    alert("Failed to load profile");
  }
}

// ----------------------
// EDIT PROFILE
// ----------------------
editBtn.addEventListener("click", () => {
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.disabled = false;
  });
  editBtn.classList.add("hidden");
  saveBtn.classList.remove("hidden");
  cancelBtn.classList.remove("hidden");
});

cancelBtn.addEventListener("click", () => {
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = originalData[f] || "";
    if (el) el.disabled = true;
  });
  saveBtn.classList.add("hidden");
  cancelBtn.classList.add("hidden");
  editBtn.classList.remove("hidden");
});

saveBtn.addEventListener("click", async () => {
  const payload = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) payload[f] = el.value;
  });

  try {
    const res = await fetch("/tsi-applicant/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    if (!res.ok) throw new Error("Failed to update profile");

    alert("Profile updated successfully");
    loadProfile();
  } catch (err) {
    console.error(err);
    alert("Failed to update profile");
  }
});

// ----------------------
// PASSWORD MANAGEMENT
// ----------------------
verifyCurrentBtn?.addEventListener("click", async () => {
  const current = currentPasswordInput.value.trim();
  setStatus("", true);

  if (!current) {
    setStatus("Please enter your current password", false);
    return;
  }

  try {
    const res = await fetch("/tsi-applicant/api/verify-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current }),
      credentials: "include"
    });
    const data = await res.json();

    if (data.valid) {
      setStatus("Current password verified!", true);
      currentPasswordValid = true;

      currentPasswordInput.classList.add("hidden");
      verifyCurrentBtn.classList.add("hidden");
      newPasswordFields.classList.remove("hidden");
    } else {
      setStatus("Current password incorrect", false);
      currentPasswordValid = false;
    }
  } catch (err) {
    console.error(err);
    setStatus("Error verifying password", false);
    currentPasswordValid = false;
  }
});

changePasswordBtn?.addEventListener("click", async () => {
  const newPass = newPasswordInput.value.trim();
  const confirm = confirmPasswordInput.value.trim();
  setStatus("", true);

  if (!currentPasswordValid) return setStatus("Please verify your current password first", false);
  if (!newPass || !confirm) return setStatus("Please fill in all password fields", false);
  if (newPass !== confirm) return setStatus("New passwords do not match", false);

  try {
    const res = await fetch("/tsi-applicant/api/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPasswordInput.value.trim(), newPassword: newPass }),
      credentials: "include"
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data?.message || "Password update failed");
    }

    setStatus("Password updated successfully!", true);

    // Reset password fields
    currentPasswordInput.value = "";
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    newPasswordFields.classList.add("hidden");
    currentPasswordInput.classList.remove("hidden");
    verifyCurrentBtn.classList.remove("hidden");
    currentPasswordValid = false;

  } catch (err) {
    console.error(err);
    setStatus("Failed: " + err.message, false);
  }
});

// ----------------------
// NAVBAR / WELCOME
// ----------------------
async function loadUser() {
  try {
    const res = await fetch("/api/user/userOnly", { credentials: "include" });
    if (!res.ok) throw new Error("User not logged in");

    const data = await res.json();
    const avatarUrl = getAvatarUrl(data.avatar);

    const navAvatar = document.getElementById("navAvatar");
    const navUserName = document.getElementById("navUserName");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (navAvatar) navAvatar.src = avatarUrl;
    if (navUserName) navUserName.textContent = data.full_name || "User";
    if (welcomeTitle) welcomeTitle.textContent = "Welcome, " + (data.full_name || "User") + "!";
  } catch (err) {
    console.error("Failed to load user info", err);
  }
}

// ----------------------
// MOBILE NAVBAR TOGGLE
// ----------------------
function initMobileNavbar() {
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!mobileMenuButton || !mobileMenu) return;

  mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

  // Close mobile menu when a link is clicked
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
  });
}

// ----------------------
// INITIAL LOAD
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  loadUser();
  initMobileNavbar();
});
