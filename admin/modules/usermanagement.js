document.addEventListener("DOMContentLoaded", async () => {
  /* -----------------------------
     1) ADMIN SESSION CHECK
  ----------------------------- */
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

    const avatarUrl = user.avatar ? `/uploads/${user.avatar}` : '/uploads/default-avatar.png';

    if (user.pendingAdmin) {
      if (navUserName) navUserName.textContent = `${user.full_name} (OTP pending)`;
      if (navAvatar) navAvatar.src = avatarUrl;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.full_name} (OTP pending)`;
    } else {
      if (navUserName) navUserName.textContent = user.full_name || 'Admin';
      if (navAvatar) navAvatar.src = avatarUrl;
      if (welcomeTitle) welcomeTitle.textContent = `Welcome, ${user.full_name || 'Admin'}`;
    }

  } catch (err) {
    console.error("Failed to load session info", err);
  }

  /* -----------------------------
     2) SIDEBAR TOGGLE
  ----------------------------- */
  const toggleBtn = document.getElementById('applicantToggle');
  const submenu = document.getElementById('applicantSubmenu');
  const arrow = document.getElementById('arrow');

  toggleBtn?.addEventListener('click', () => {
    submenu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
  });

  /* -----------------------------
     3) USER TABLE FETCH & RENDER
  ----------------------------- */
  const userTableBody = document.getElementById("userTableBody");
  const searchInput = document.getElementById("searchUsers");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const currentPageEl = document.getElementById("currentPage");

  let users = [];
  let filteredUsers = [];
  let currentPage = 1;
  const perPage = 5;

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users/allUsers", { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch users");
      users = await res.json();
      filteredUsers = users;
      currentPage = 1;
      renderTable();
    } catch (err) {
      console.error(err);
      userTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-600 py-4">Failed to load users</td></tr>`;
    }
  }

  function renderTable() {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageUsers = filteredUsers.slice(start, end);

    userTableBody.innerHTML = pageUsers.map(user => `
      <tr>
        <td class="px-4 py-3">
          <img src="${user.avatar ? '/uploads/' + user.avatar : '/uploads/default-avatar.png'}"
               class="w-10 h-10 rounded-lg border border-gray-300 shadow-sm object-cover" alt="avatar">
        </td>
        <td class="px-4 py-3">${user.full_name}</td>
        <td class="px-4 py-3">${user.email}</td>
        <td class="px-4 py-3">
          <span class="px-3 py-1 ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'} rounded-full text-xs">
            ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        </td>
        <td class="px-4 py-3">
          <span class="px-3 py-1 ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} rounded-full text-xs">
            ${user.status}
          </span>
        </td>
      </tr>
    `).join("");

    currentPageEl.textContent = `${currentPage} / ${Math.ceil(filteredUsers.length / perPage)}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === Math.ceil(filteredUsers.length / perPage);
  }

  // Search
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    filteredUsers = users.filter(u =>
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
    currentPage = 1;
    renderTable();
  });

  // Pagination
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPage < Math.ceil(filteredUsers.length / perPage)) {
      currentPage++;
      renderTable();
    }
  });

  // Initialize users table
  await fetchUsers();
});
