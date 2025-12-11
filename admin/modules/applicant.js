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
     1) SIDEBAR TOGGLE
  ----------------------------- */
  const toggleBtn = document.getElementById('applicantToggle');
  const submenu = document.getElementById('applicantSubmenu');
  const arrow = document.getElementById('arrow');

  toggleBtn?.addEventListener('click', () => {
    submenu?.classList.toggle('hidden');
    arrow?.classList.toggle('rotate-180');
  });

  /* -----------------------------
     2) DYNAMIC TABLE & STATS
  ----------------------------- */
  const tableBody = document.getElementById("plansCardContainerTable");
  const searchInput = document.getElementById("searchPlans");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const currentPageEl = document.getElementById("currentPage");
  const rowsPerPageSelect = document.getElementById("rowsPerPage");
  const jumpPageInput = document.getElementById("jumpPage");
  const jumpPageBtn = document.getElementById("jumpPageBtn");

  const countPlansEl = document.getElementById("countPlans");
  const countPendingEl = document.getElementById("countPending");
  const countApprovedEl = document.getElementById("countApproved");
  const countRejectedEl = document.getElementById("countRejected");

  let plans = [];
  let filteredPlans = [];
  let currentPage = 1;
  let rowsPerPage = parseInt(rowsPerPageSelect.value) || 5;

  async function fetchPlans() {
    try {
      const res = await fetch("/api/plans/applicant", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch plans");
      plans = await res.json();
      filteredPlans = plans;
      currentPage = 1;
      updateStats();
      renderTable();
    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-red-600 py-4">Failed to load plans</td></tr>`;
      countPlansEl.textContent = countPendingEl.textContent = countApprovedEl.textContent = countRejectedEl.textContent = 0;
    }
  }

  function updateStats() {
    const normalize = s => (s || "").toLowerCase();

    const total = plans.length;
    const pending = plans.filter(p => normalize(p.status) === "pending").length;
    const approved = plans.filter(p => normalize(p.status) === "approved").length;
    const rejected = plans.filter(p => normalize(p.status) === "rejected").length;

    countPlansEl.textContent = total;
    countPendingEl.textContent = pending;
    countApprovedEl.textContent = approved;
    countRejectedEl.textContent = rejected;
  }

  /* -----------------------------
     3) RENDER TABLE + EDIT MODAL
  ----------------------------- */
  function renderTable() {
    tableBody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = filteredPlans.slice(start, end);

    if (!pageData.length) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-gray-500">No plans found</td></tr>`;
      currentPageEl.textContent = `0 / 0`;
      prevBtn.disabled = nextBtn.disabled = true;
      return;
    }

    pageData.forEach((plan, index) => {
    // Parse equipment robustly inside the loop
    const equipmentArray = [];
    if (plan.equipment) {
        if (Array.isArray(plan.equipment)) {
            equipmentArray.push(...plan.equipment);
        } else if (typeof plan.equipment === "string") {
            try {
                const parsed = JSON.parse(plan.equipment);
                if (Array.isArray(parsed)) equipmentArray.push(...parsed);
                else equipmentArray.push(...plan.equipment.split(',').map(e => e.trim()));
            } catch {
                equipmentArray.push(...plan.equipment.split(',').map(e => e.trim()));
            }
        }
    }
    const status = (plan.status || "").toLowerCase();

      let badgeColor = "bg-gray-200 text-gray-800";
      let icon = "fa-question-circle";
      let statusLabel = "Unknown";

      if (status === "pending") {
        badgeColor = "bg-yellow-100 text-yellow-800";
        icon = "fa-clock";
        statusLabel = "Pending";
      } 
      else if (status === "approved") {
        badgeColor = "bg-green-100 text-green-800";
        icon = "fa-check-circle";
        statusLabel = "Approved";
      } 
      else if (status === "rejected") {
        badgeColor = "bg-red-100 text-red-800";
        icon = "fa-times-circle";
        statusLabel = "Rejected";
      }

      const row = document.createElement("tr");
      row.classList.add("hover:bg-gray-50");
      row.innerHTML = `
        <td class="px-4 py-2">${start + index + 1}</td>
        <td class="px-4 py-2">${plan.user_name || plan.applicant_name}</td>
        <td class="px-4 py-2">${plan.applicant_establishment}</td>
        <td class="px-4 py-2">${plan.equipment_location}</td>
        <td class="px-4 py-2">${plan.total_units}</td>
        <td class="px-4 py-2">${equipmentArray.length ? equipmentArray.join(", ") : "-"}</td>
        <td class="px-4 py-2">
          <span class="px-3 py-1 rounded-full text-xs flex items-center gap-1 ${badgeColor}">
            <i class="fas ${icon}"></i>
            ${statusLabel}
          </span>
        </td>
        <td class="px-4 py-2 flex items-center gap-3">
          <!-- VIEW PDF -->
          <button class="view-btn text-blue-600 hover:text-blue-800" title="View PDF">
            <i class="fas fa-file-pdf text-xl"></i>
          </button>

          <!-- EDIT -->
          <button class="edit-btn text-green-600 hover:text-green-800" title="Edit">
            <i class="fas fa-edit text-xl"></i>
          </button>

          <!-- STATUS -->
          <button class="statusUpdate-btn text-orange-500 hover:text-orange-700" title="Update Status">
            <i class="fas fa-sync-alt text-xl"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  }

  /* -----------------------------
     4) EVENT DELEGATION FOR MODAL
  ----------------------------- */
  const checklistModal = document.getElementById("checklistModal");
  const modalContent = document.getElementById("modalContent");
  const closeChecklistModal = document.getElementById("closeChecklistModal");

  tableBody.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    const viewBtn = e.target.closest(".view-btn");

    if (viewBtn) {
      const row = viewBtn.closest("tr");
      const index = parseInt(row.children[0].textContent) - 1 + (currentPage - 1) * rowsPerPage;
      const plan = filteredPlans[index];
      if (plan.pdf_file) window.open(`/pdfs/${plan.pdf_file}`, "_blank");
      return;
    }

    if (editBtn) {
      const row = editBtn.closest("tr");
      const index = parseInt(row.children[0].textContent) - 1 + (currentPage - 1) * rowsPerPage;
      const plan = filteredPlans[index];

      // Show simplified modal
      checklistModal.classList.remove("hidden");
      checklistModal.classList.add("flex");

      // Inject simplified modal form (only Remarks, Evaluated by, Date)
      modalContent.innerHTML = `
        <form id="checklistForm" class="mt-6 space-y-6">
          <div>
            <label class="font-semibold">REMARKS:</label>
            <textarea name="remarks" class="w-full mt-2 border p-2 h-20"></textarea>
          </div>
          <div class="flex justify-between mt-4 gap-4">
            <div>
              <label class="font-semibold">Evaluated by:</label>
              <input type="text" name="evaluated_by" class="border-b w-64 outline-none mt-1">
            </div>
            <div>
              <label class="font-semibold">Date of Evaluation:</label>
              <input type="date" name="evaluation_date" class="border-b w-52 outline-none mt-1">
            </div>
          </div>
          <div class="text-center mt-6">
            <button type="submit" class="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800">Submit</button>
          </div>
        </form>
      `;

      // Pre-fill fields
      const form = modalContent.querySelector("form");
      form.querySelector("[name='remarks']").value = plan.remarks || "";
      form.querySelector("[name='evaluated_by']").value = plan.evaluated_by || "";
      form.querySelector("[name='evaluation_date']").value = plan.evaluation_date || "";

      closeChecklistModal.addEventListener("click", () => {
        checklistModal.classList.add("hidden");
        checklistModal.classList.remove("flex");
      });

      // Optional: handle form submission
      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const updatedData = {
          remarks: form.remarks.value,
          evaluated_by: form.evaluated_by.value,
          evaluation_date: form.evaluation_date.value,
        };

        try {
          const res = await fetch(`/api/plans/applicant/${plan.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData),
            credentials: "include"
          });

          if (!res.ok) throw new Error("Failed to update plan");

          // SUCCESS ALERT
          Swal.fire({
            title: "Updated Successfully!",
            text: "The applicant record has been updated.",
            icon: "success",
            confirmButtonColor: "#2563eb"
          }).then(() => {
            checklistModal.classList.add("hidden");
            checklistModal.classList.remove("flex");
            fetchPlans(); // refresh table
          });

        } catch (err) {
          console.error(err);

          // ERROR ALERT
          Swal.fire({
            title: "Update Failed",
            text: "Unable to update the applicant. Please try again.",
            icon: "error",
            confirmButtonColor: "#dc2626"
          });
        }
      });
    }
    const statusBtn = e.target.closest(".statusUpdate-btn");

    if (statusBtn) {
      const row = statusBtn.closest("tr");
      const index = parseInt(row.children[0].textContent) - 1 + (currentPage - 1) * rowsPerPage;
      const plan = filteredPlans[index];

      // STATUS SELECT POPUP
      Swal.fire({
        title: `Update Status`,
        html: `
          <select id="newStatus" class="swal2-select">
            <option value="Pending" ${plan.status === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Approved" ${plan.status === "Approved" ? "selected" : ""}>Approved</option>
            <option value="Rejected" ${plan.status === "Rejected" ? "selected" : ""}>Rejected</option>
          </select>
        `,
        confirmButtonText: "Update",
        showCancelButton: true,
        cancelButtonText: "Cancel",
        confirmButtonColor: "#2563eb",
      }).then(async (result) => {
        if (!result.isConfirmed) return;

        const newStatus = document.getElementById("newStatus").value;

        try {
          const res = await fetch(`/api/plans/status/${plan.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: newStatus })
          });

          if (!res.ok) throw new Error("Failed to update status");

          Swal.fire({
            title: "Status Updated",
            text: `Status changed to ${newStatus}`,
            icon: "success",
            confirmButtonColor: "#2563eb"
          }).then(() => {
            fetchPlans(); // refresh table
          });

        } catch (err) {
          console.error(err);
          Swal.fire({
            title: "Error",
            text: "Failed to update status.",
            icon: "error",
            confirmButtonColor: "#dc2626"
          });
        }
      });
    }
  });

  /* -----------------------------
     5) SEARCH & PAGINATION
  ----------------------------- */
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();

    filteredPlans = plans.filter(plan => {
      const name = (plan.user_name || plan.full_name || "").toLowerCase();
      const establishment = (plan.applicant_establishment || "").toLowerCase();
      const status = (plan.status || "").toLowerCase();

      return (
        name.includes(query) ||
        establishment.includes(query) ||
        status.includes(query)
      );
    });

    currentPage = 1;
    updateStats();
    renderTable();
  });

  prevBtn.addEventListener("click", () => { if(currentPage>1) currentPage--; renderTable(); });
  nextBtn.addEventListener("click", () => { if(currentPage<Math.ceil(filteredPlans.length/rowsPerPage)) currentPage++; renderTable(); });
  rowsPerPageSelect.addEventListener("change", ()=>{ rowsPerPage=parseInt(rowsPerPageSelect.value)||5; currentPage=1; renderTable(); });
  jumpPageBtn.addEventListener("click", ()=>{ let jump=parseInt(jumpPageInput.value)||1; if(jump>Math.ceil(filteredPlans.length/rowsPerPage)) jump=Math.ceil(filteredPlans.length/rowsPerPage); currentPage=jump; renderTable(); });

  fetchPlans();

});
