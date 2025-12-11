document.addEventListener("DOMContentLoaded", async () => {
 try {
    const res = await fetch('/api/user/adminOnly', { credentials: 'include' });

    if (!res.ok) {
      console.warn("Session not found or expired, status: " + res.status);
      return;
    }

    const user = await res.json();

    const navUserName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navAvatar');
    const welcomeTitle = document.getElementById('welcomeTitle');

    // Determine avatar URL safely
    const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : '/uploads/default-avatar.png';

    if (user.pendingAdmin) {
      // Admin OTP pending
      if (navUserName) navUserName.textContent = `${user.full_name} (OTP pending)`;
      if (navAvatar) navAvatar.src = avatarUrl;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.full_name} (OTP pending)`;
    } else {
      // Full login (user or admin)
      if (navUserName) navUserName.textContent = user.full_name || 'User/Admin';
      if (navAvatar) navAvatar.src = avatarUrl;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.full_name || 'User/Admin'}`;
    }

  } catch (err) {
    console.error("Failed to load session info", err);
  }


  /* -----------------------------------------------
     2) SIDEBAR TOGGLE
  ------------------------------------------------ */
  const toggleBtn = document.getElementById('applicantToggle');
  const submenu = document.getElementById('applicantSubmenu');
  const arrow = document.getElementById('arrow');

  toggleBtn?.addEventListener('click', () => {
    submenu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
  });
});