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

  // --- Table logic with pagination ---
  let currentStatus = 'approved';
  let currentPage = 1;
  const rowsPerPage = 5;

  const tableBody = document.getElementById('plansCardContainerTable');
  const statusTitle = document.getElementById('currentStatusTitle');

  let currentData = [];

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

  function renderTablePage(data, page) {
    tableBody.innerHTML = '';
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = data.slice(startIndex, endIndex);

    if (pageData.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center px-4 py-2 text-gray-500">No records found.</td></tr>`;
      return;
    }

    pageData.forEach((row, index) => {
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
        <td class="px-4 py-2">${startIndex + index + 1}</td>
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

    renderPaginationControls(data.length, page);
  }

  function renderPaginationControls(totalRows, page) {
    const pagination = document.getElementById('paginationControls');
    pagination.innerHTML = ''; // clear previous controls

    if (totalRows <= rowsPerPage) return;

    const totalPages = Math.ceil(totalRows / rowsPerPage);

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300';
    prevBtn.disabled = page === 1;
    prevBtn.addEventListener('click', () => {
      currentPage--;
      renderTablePage(currentData, currentPage);
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = `px-3 py-1 rounded ${i === page ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderTablePage(currentData, currentPage);
      });
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300';
    nextBtn.disabled = page === totalPages;
    nextBtn.addEventListener('click', () => {
      currentPage++;
      renderTablePage(currentData, currentPage);
    });
    pagination.appendChild(nextBtn);
  }

  async function renderTable(status) {
    statusTitle.textContent = status.charAt(0).toUpperCase() + status.slice(1) + " Applications";
    currentData = await fetchTableData(status);
    currentPage = 1;
    renderTablePage(currentData, currentPage);
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
        case 'approved': tab.classList.add('bg-green-600', 'text-white'); break;
        case 'pending': tab.classList.add('bg-yellow-300', 'text-white'); break;
        case 'rejected': tab.classList.add('bg-red-300', 'text-white'); break;
      }
    });
  });

  // --- Initial render ---
  await renderTable(currentStatus);

  // --- Search functionality ---
  const searchInput = document.getElementById('searchPlans');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filteredData = currentData.filter(row => {
      const rowText = `${row.applicant_establishment} ${row.equipment_location} ${row.total_units} ${row.equipment}`.toLowerCase();
      return rowText.includes(query);
    });
    currentPage = 1;
    renderTablePage(filteredData, currentPage);
  });

});
