document.addEventListener("DOMContentLoaded", async () => {

  // --- User info ---
  try {
    const res = await fetch('/api/user/adminOnly', { credentials: 'include' });
    if (res.ok) {
      const user = await res.json();
      const navUserName = document.getElementById('navUserName');
      const navAvatar = document.getElementById('navAvatar');
      const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : '/uploads/default-avatar.png';
      navUserName.textContent = user.full_name + (user.pendingAdmin ? ' (OTP pending)' : '');
      navAvatar.src = avatarUrl;
    }
  } catch (err) {
    console.error("Failed to load session info", err);
  }

  // --- Sidebar toggle ---
  const toggleBtn = document.getElementById('applicantToggle');
  const submenu = document.getElementById('applicantSubmenu');
  const arrow = document.getElementById('arrow');
  toggleBtn?.addEventListener('click', () => {
    submenu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
  });

  // --- Status badge helper ---
  function getStatusBadge(status) {
    const s = (status || "").toLowerCase();
    let badgeColor = "bg-gray-200 text-gray-800";
    let icon = "fa-question-circle";
    let statusLabel = "Unknown";

    if (s === "pending") {
      badgeColor = "bg-yellow-100 text-yellow-800";
      icon = "fa-clock";
      statusLabel = "Pending";
    } else if (s === "approved") {
      badgeColor = "bg-green-100 text-green-800";
      icon = "fa-check-circle";
      statusLabel = "Approved";
    } else if (s === "rejected") {
      badgeColor = "bg-red-100 text-red-800";
      icon = "fa-times-circle";
      statusLabel = "Rejected";
    }

    return `
      <span class="px-2 py-1 rounded inline-flex items-center gap-2 ${badgeColor}">
        <i class="fa ${icon}"></i>
        <span>${statusLabel}</span>
      </span>
    `;
  }

  // --- Table logic ---
  let currentStatus = 'approved';
  const tableBody = document.getElementById('plansCardContainerTable');
  const statusTitle = document.getElementById('currentStatusTitle');

  async function fetchTableData(status) {
    try {
      const res = await fetch(`/api/plans/approvals?status=${status}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch ${status} data`);
      return await res.json();
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async function renderTable(status) {
    tableBody.innerHTML = '';
    statusTitle.textContent = status.charAt(0).toUpperCase() + status.slice(1) + " Applications";

    const data = await fetchTableData(status);
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center px-4 py-2 text-gray-500">No records found.</td></tr>`;
      return;
    }

    data.forEach((row, index) => {
      let equipmentArray = [];
      if (row.equipment) {
        if (Array.isArray(row.equipment)) equipmentArray = row.equipment;
        else if (typeof row.equipment === "string") {
          try {
            const parsed = JSON.parse(row.equipment);
            if (Array.isArray(parsed)) equipmentArray = parsed;
            else equipmentArray = row.equipment.split(',').map(e => e.trim());
          } catch {
            equipmentArray = row.equipment.split(',').map(e => e.trim());
          }
        }
      }

      const tr = document.createElement('tr');
      tr.className = "border-b hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-2">${index + 1}</td>
        <td class="px-4 py-2">${row.applicant_establishment || '-'}</td>
        <td class="px-4 py-2">${row.equipment_location || '-'}</td>
        <td class="px-4 py-2">${row.total_units || '-'}</td>
        <td class="px-4 py-2">${equipmentArray.length ? equipmentArray.join(", ") : '-'}</td>
        <td class="px-4 py-2">${getStatusBadge(row.status)}</td>
        <td class="px-4 py-2">
          <a href="/admin/pages/viewPlan?id=${row.id}" target="_blank" 
             class="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">
            View
          </a>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // --- Tab click events ---
  document.querySelectorAll('.status-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      currentStatus = tab.getAttribute('data-status');
      await renderTable(currentStatus);

      document.querySelectorAll('.status-tab').forEach(t => {
        t.classList.remove('bg-green-600', 'bg-yellow-300', 'bg-red-300', 'text-white');
      });

      switch (currentStatus) {
        case 'approved':
          tab.classList.add('bg-green-600', 'text-white');
          break;
        case 'pending':
          tab.classList.add('bg-yellow-300', 'text-white');
          break;
        case 'rejected':
          tab.classList.add('bg-red-300', 'text-white');
          break;
      }
    });
  });

  // --- Initial render ---
  await renderTable(currentStatus);

  // --- Search functionality ---
  const searchInput = document.getElementById('searchPlans');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      const rowText = Array.from(cells).map(td => td.textContent.toLowerCase()).join(' ');
      row.style.display = rowText.includes(query) ? '' : 'none';
    });
  });

});