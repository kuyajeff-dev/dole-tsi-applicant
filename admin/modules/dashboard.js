document.addEventListener('DOMContentLoaded', async () => {

  /* -----------------------------------------------
     1) LOAD SESSION (user or admin)
  ------------------------------------------------ */
  try {
    const res = await fetch('/api/user/adminOnly', { credentials: 'include' });
    if (!res.ok) return;

    const user = await res.json();
    const navUserName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navAvatar');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : '/uploads/default-avatar.png';

    navUserName.textContent = user.pendingAdmin 
      ? `${user.full_name} (OTP pending)` 
      : user.full_name;
    navAvatar.src = avatarUrl;
    if (welcomeTitle) {
      welcomeTitle.textContent = `Welcome, ${navUserName.textContent}`;
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
     3) FETCH DASHBOARD STATS
  ------------------------------------------------ */
  async function fetchDashboardStats() {
    try {
      const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return await res.json();
    } catch (err) {
      console.error(err);
      return { totalPlans: 0, pending: 0, rejected: 0, approved: 0, users: 0 };
    }
  }

  async function updateStats() {
    const stats = await fetchDashboardStats();
    document.getElementById('countPlans').textContent = stats.totalPlans || 0;
    document.getElementById('countPending').textContent = `${stats.pending || 0} / ${stats.rejected || 0}`;
    document.getElementById('countCompleted').textContent = stats.approved || 0;
    document.getElementById('countUsers').textContent = stats.users || 0;
  }

  await updateStats();

  /* -----------------------------------------------
     4) FETCH NOTES DYNAMICALLY
  ------------------------------------------------ */
  let notesData = {};
  try {
    const res = await fetch('/api/dashboard/remarks', { credentials: 'include' });
    if (res.ok) notesData = await res.json();
  } catch (err) {
    console.error("Failed to fetch remarks", err);
  }

  /* -----------------------------------------------
     5) HELPER FUNCTION: FORMAT DATE TO YYYY-MM-DD
  ------------------------------------------------ */
  function formatLocalDate(dateStr) {
    const dateObj = new Date(dateStr);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /* -----------------------------------------------
     6) UPDATE NOTES DISPLAY
  ------------------------------------------------ */
  function updateNotesDisplay(_, dateStr) {
    const container = document.getElementById('dateNotes');
    container.innerHTML = "";

    if (notesData[dateStr] && notesData[dateStr].length) {
      notesData[dateStr].forEach(note => {
        const p = document.createElement('p');
        p.className = "mb-2 text-gray-700";
        p.innerHTML = `
          - <strong>${note.applicant_establishment}</strong><br>
          <em>${note.equipment_location} - ${note.equipment}</em><br>
          <strong>By ${note.evaluated_by}:</strong> ${note.remarks}
        `;
        container.appendChild(p);
      });
    } else {
      container.innerHTML = `<p class="text-gray-400">No notes for this date.</p>`;
    }
  }

  /* -----------------------------------------------
     7) FLATPICKR CALENDAR + HIGHLIGHT NOTES
  ------------------------------------------------ */
  if (document.getElementById('calendar')) {
    flatpickr("#calendar", {
      inline: true,
      enableTime: false,
      dateFormat: "Y-m-d",
      onChange: updateNotesDisplay,
      onDayCreate: function(dObj, dStr, fp, dayElem) {
        // Highlight dates that have notes
        const y = dayElem.dateObj.getFullYear();
        const m = String(dayElem.dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dayElem.dateObj.getDate()).padStart(2, '0');
        const date = `${y}-${m}-${d}`;

        if (notesData[date]) {
          dayElem.classList.add("bg-red-100", "text-red-700", "font-bold", "rounded-full");
        }
      }
    });
  }

  /* -----------------------------------------------
     8) CONVERT REMARK DATES TO LOCAL
  ------------------------------------------------ */
  notesData = Object.fromEntries(
    Object.entries(notesData).map(([key, notes]) => [formatLocalDate(key), notes])
  );

});
