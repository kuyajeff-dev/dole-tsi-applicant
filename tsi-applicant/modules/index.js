// tsi-applicant/modules/index.js
let currentPage = 1;
let rowsPerPage = parseInt(document.getElementById("rowsPerPage")?.value || 5);
let filteredPlans = [];

/* -------------------- HELPER FUNCTIONS -------------------- */
function getStatusColor(status) {
    switch ((status || "").toLowerCase()) {
        case "pending": return "bg-yellow-100 text-yellow-700";
        case "approved": return "bg-green-100 text-green-700";
        case "completed": return "bg-blue-100 text-blue-700";
        case "rejected": return "bg-red-100 text-red-700";
        default: return "bg-gray-200 text-gray-700";
    }
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

/* -------------------- RENDER PLANS -------------------- */
function renderPlansPage() {
    const tableContainer = document.getElementById("plansCardContainerTable");
    const mobileContainer = document.getElementById("plansCardContainerMobile");
    const totalPages = Math.ceil(filteredPlans.length / rowsPerPage);

    if (!tableContainer || !mobileContainer) return;

    tableContainer.innerHTML = "";
    mobileContainer.innerHTML = "";

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pagePlans = filteredPlans.slice(start, end);

    pagePlans.forEach((plan, index) => {
        const statusColor = getStatusColor(plan.status);
        let equipmentArray = [];
        if (plan.equipment) {
            try {
                equipmentArray = typeof plan.equipment === "string" ? JSON.parse(plan.equipment) : plan.equipment;
            } catch {}
        }

        // Desktop table row
        const tr = document.createElement("tr");
        tr.className = "border-b hover:bg-gray-50";
        tr.innerHTML = `
            <td class="px-4 py-2 text-sm">${start + index + 1}</td>
            <td class="px-4 py-2 text-sm">${plan.applicant_establishment || "N/A"}</td>
            <td class="px-4 py-2 text-sm">${plan.equipment_location || "N/A"}</td>
            <td class="px-4 py-2 text-sm">${plan.total_units || "N/A"}</td>
            <td class="px-4 py-2 text-sm">${equipmentArray.length ? equipmentArray.join(", ") : "N/A"}</td>
            <td class="px-4 py-2 text-sm"><span class="px-2 py-1 rounded-full ${statusColor} text-xs font-semibold">${plan.status || "N/A"}</span></td>
            <td class="px-4 py-2 text-sm">${plan.remarks || "N/A"}</td>
            <td class="px-4 py-2 text-sm">${plan.evaluated_by || "N/A"}</td>
            <td class="px-4 py-2 text-sm">${formatDate(plan.evaluation_date)}</td>
        `;
        tableContainer.appendChild(tr);

        // Mobile card
        const card = document.createElement("div");
        card.className = "bg-gray-50 p-4 rounded shadow hover:shadow-lg transition";
        card.innerHTML = `
            <div class="flex justify-between mb-2"><span class="font-semibold">#</span> <span>${start + index + 1}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Applicant</span> <span>${plan.applicant_establishment || "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Location</span> <span>${plan.equipment_location || "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Total Units</span> <span>${plan.total_units || "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Equipment</span> <span>${equipmentArray.length ? equipmentArray.join(", ") : "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Status</span> <span class="${statusColor} px-2 py-1 rounded-full text-xs font-semibold">${plan.status || "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Remarks</span> <span>${plan.remarks || "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Evaluated By</span> <span>${plan.evaluated_by || "N/A"}</span></div>
            <div class="flex justify-between mb-2"><span class="font-semibold">Date</span> <span>${formatDate(plan.evaluation_date)}</span></div>
        `;
        mobileContainer.appendChild(card);
    });

    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById("currentPage").textContent = `${currentPage} / ${totalPages || 1}`;
}

/* -------------------- LOAD PLANS -------------------- */
async function loadPlans() {
    const searchValue = document.getElementById("searchPlans")?.value.toLowerCase() || "";

    try {
        const res = await fetch("/api/plans", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch plans");
        const plans = await res.json();

        filteredPlans = plans.filter(p => {
            let equipmentText = "";
            if (p.equipment) {
                try {
                    const arr = typeof p.equipment === "string" ? JSON.parse(p.equipment) : p.equipment;
                    equipmentText = arr.join(" ").toLowerCase();
                } catch {}
            }
            return (
                p.applicant_establishment?.toLowerCase().includes(searchValue) ||
                p.equipment_location?.toLowerCase().includes(searchValue) ||
                p.status?.toLowerCase().includes(searchValue) ||
                equipmentText.includes(searchValue)
            );
        });

        // Update stats
        document.getElementById("countPlans").textContent = plans.length;
        document.getElementById("countPending").textContent = plans.filter(p => p.status?.toLowerCase() === "pending").length;
        document.getElementById("countCompleted").textContent = plans.filter(p => p.status?.toLowerCase() === "completed").length;

        currentPage = 1;
        renderPlansPage();
    } catch (err) {
        console.error("Failed to load plans:", err);
    }
}

/* -------------------- LOAD USER INFO -------------------- */
async function loadUser() {
    try {
        const res = await fetch("/api/user/userOnly", { credentials: "include" });
        if (!res.ok) throw new Error("User not logged in");

        const data = await res.json();

        const avatarUrl = data.avatar
            ? `/uploads/${data.avatar.replace(/^uploads\//, "")}`
            : `/uploads/default-avatar.png`;

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

/* -------------------- INITIALIZE -------------------- */
document.addEventListener("DOMContentLoaded", async () => {
    // Load user info first
    await loadUser();

    // Load plans
    await loadPlans();

    // Search input
    const searchInput = document.getElementById("searchPlans");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            currentPage = 1;
            loadPlans();
        });
    }

    // Pagination buttons
    document.getElementById("prevPage").addEventListener("click", () => {
        if (currentPage > 1) currentPage--;
        renderPlansPage();
    });
    document.getElementById("nextPage").addEventListener("click", () => {
        const totalPages = Math.ceil(filteredPlans.length / rowsPerPage);
        if (currentPage < totalPages) currentPage++;
        renderPlansPage();
    });

    // Rows per page
    document.getElementById("rowsPerPage").addEventListener("change", (e) => {
        rowsPerPage = parseInt(e.target.value);
        currentPage = 1;
        renderPlansPage();
    });

    // Jump to page
    document.getElementById("jumpPageBtn").addEventListener("click", () => {
        const jumpInput = parseInt(document.getElementById("jumpPage").value);
        const totalPages = Math.ceil(filteredPlans.length / rowsPerPage);
        if (jumpInput >= 1 && jumpInput <= totalPages) {
            currentPage = jumpInput;
            renderPlansPage();
        }
    });
});
