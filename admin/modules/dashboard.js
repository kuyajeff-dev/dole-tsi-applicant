document.addEventListener('DOMContentLoaded', async () => {

  /* -----------------------------------------------
     1) LOAD SESSION (user or admin)
  ------------------------------------------------ */
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


  /* -----------------------------------------------
     3) NOTES SAMPLE DATA
  ------------------------------------------------ */
  const notesData = {
    "2025-12-10": ["Meeting with contractor", "Inspect equipment", "Plan review"],
    "2025-12-11": ["Follow-up with applicant A", "Approve plan B"]
  };


  /* -----------------------------------------------
     4) FLATPICKR CALENDAR + NOTES DISPLAY
  ------------------------------------------------ */
  if (document.getElementById('calendar')) {
    flatpickr("#calendar", {
      inline: true,
      enableTime: false,
      dateFormat: "Y-m-d",
      onChange: function(selectedDates, dateStr) {
        const container = document.getElementById('dateNotes');
        container.innerHTML = "";

        if (notesData[dateStr]) {
          notesData[dateStr].forEach(note => {
            const p = document.createElement('p');
            p.className = "mb-2 text-gray-700";
            p.textContent = "- " + note;
            container.appendChild(p);
          });
        } else {
          container.innerHTML = `<p class="text-gray-400">No notes for this date.</p>`;
        }
      }
    });
  }

});
