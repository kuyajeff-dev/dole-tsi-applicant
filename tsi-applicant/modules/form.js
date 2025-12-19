document.addEventListener('DOMContentLoaded', async () => {

  let currentUser = null;

  // ----------------- ELEMENT REFERENCES -----------------
  const applicantInput = document.getElementById('applicant_establishment'); // <-- use ID
  const navUserName = document.getElementById('navUserName');
  const navAvatar = document.getElementById('navAvatar');

  // Show placeholder immediately
  if (applicantInput) {
    applicantInput.value = 'Loading...';
    applicantInput.readOnly = true;
    applicantInput.classList.add('bg-gray-100', 'cursor-not-allowed', 'text-center');
  }

  // ----------------- FETCH LOGGED-IN USER -----------------
  try {
    const res = await fetch('http://localhost:3001/api/user/userOnly', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('Not logged in');
    currentUser = await res.json();

    console.log('Current User:', currentUser);

    // Update navbar
    if (navUserName) navUserName.textContent = currentUser.full_name || 'User';
    if (navAvatar) navAvatar.src = currentUser.avatar ? `/uploads/${currentUser.avatar}` : '/uploads/default-avatar.png';

    // Fill establishment instantly
    if (applicantInput) {
      applicantInput.value = currentUser.establishment || 'N/A';
    }

  } catch (err) {
    console.warn('Failed to load user info:', err);
    if (applicantInput) applicantInput.value = 'N/A';
  }

  // ----------------- MOBILE NAVBAR TOGGLE -----------------
  const mobileMenuButton = document.getElementById('mobileMenuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
    mobileMenu.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => mobileMenu.classList.add('hidden')); });
  }

  // ----------------- SHOW/HIDE FILE INPUTS -----------------
  document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const fileInputId = e.target.dataset.file;
      const fileInput = document.getElementById(fileInputId);
      const previewContainer = document.getElementById(`preview_${fileInputId}`);
      if (e.target.checked) { 
        fileInput.classList.remove('hidden'); 
      } else { 
        fileInput.classList.add('hidden'); 
        fileInput.value = ''; 
        if (previewContainer) previewContainer.innerHTML = ''; 
      }
    });
  });

  // ----------------- FILE PREVIEW FUNCTION -----------------
  function setupFilePreview(input, previewContainer) {
    if (!input || !previewContainer) return;
    input.addEventListener('change', (e) => {
      previewContainer.innerHTML = '';
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        if (file.type.startsWith('image/')) {
          reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.className = 'w-24 h-24 object-cover border rounded m-1';
            previewContainer.appendChild(img);
          };
          reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
          const pdfPreview = document.createElement('div');
          pdfPreview.className = 'border px-2 py-1 rounded text-xs bg-gray-100 m-1';
          pdfPreview.textContent = file.name;
          previewContainer.appendChild(pdfPreview);
        } else {
          Swal.fire({
            icon: "error",
            title: "Invalid File Type",
            text: `${file.name} is not allowed. Only images and PDFs are accepted.`,
          });
          input.value = '';
        }
      });
    });
  }

  // ----------------- APPLY PREVIEW TO STATIC ITEMS 1–12 -----------------
  for (let i = 1; i <= 12; i++) {
    const input = document.getElementById(`fileItem${i}`);
    const previewContainer = document.getElementById(`preview_fileItem${i}`);
    setupFilePreview(input, previewContainer);
  }

  // ----------------- DYNAMIC EQUIPMENT CHECKLIST + FOUNDATION -----------------
  const equipmentCheckboxes = document.querySelectorAll('.equipment-checkbox');
  const equipmentContainer = document.getElementById('equipmentChecklistContainer');

  const foundationItem7 = document.getElementById('foundationItem7');
  const foundationCheckbox = document.getElementById('foundationCheckbox');
  const foundationFile = document.getElementById('foundationFile');
  const foundationPreview = document.getElementById('preview_foundationFile');

  const foundationEquipments = [
    'Boiler',
    'Pressure vessel',
    'Steam/gas/hydro/wind turbine',
    'Internal combustion engine'
  ];

  setupFilePreview(foundationFile, foundationPreview);

  function toggleFoundationItem7() {
    if (!foundationItem7 || !foundationCheckbox || !foundationFile || !foundationPreview) return;

    const show = Array.from(equipmentCheckboxes).some(cb => cb.checked && foundationEquipments.includes(cb.value.trim()));

    if (show) {
      foundationItem7.classList.remove('hidden');
    } else {
      foundationItem7.classList.add('hidden');
      foundationCheckbox.checked = false;
      foundationFile.value = '';
      foundationFile.classList.add('hidden');
      foundationPreview.innerHTML = '';
    }
  }

  if (foundationCheckbox && foundationFile && foundationPreview) {
    foundationCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        foundationFile.classList.remove('hidden');
      } else {
        foundationFile.classList.add('hidden');
        foundationFile.value = '';
        foundationPreview.innerHTML = '';
      }
    });
  }

  function rebuildEquipmentChecklist() {
    if (!equipmentContainer) return;
    equipmentContainer.innerHTML = '';

    equipmentCheckboxes.forEach(cb => {
      const wrapper = cb.closest('div');
      if (!wrapper) return;

      const countInput = wrapper.querySelector('.equipment-count');
      const count = parseInt(countInput?.value, 10);

      if (!cb.checked || !count || count <= 1) return;

      const equipmentName = cb.value.trim();
      for (let i = 1; i <= count - 1; i++) {
        createChecklistItem(equipmentName, i + 1);
      }
    });
  }

  function createChecklistItem(equipmentName, index = null) {
    if (!equipmentContainer) return;
    const suffix = index ? ` #${index}` : '';

    const input2Name = `equipment_item2_${equipmentName}${index ? '_' + index : ''}`;
    const preview2Id = `preview_${input2Name}`;
    const item2 = document.createElement('div');
    item2.className = 'flex flex-col gap-1';
    item2.innerHTML = `
      <label class="text-sm font-semibold">
        ${equipmentName}${suffix} – Three (3) sets of duly accomplished Application Forms per equipment, signed/sealed by PME and signed by Owner/Manager
      </label>
      <input type="file" name="${input2Name}" multiple class="border rounded px-2 py-1" />
      <div id="${preview2Id}" class="flex flex-wrap gap-2 mt-2"></div>
    `;
    equipmentContainer.appendChild(item2);
    setupFilePreview(item2.querySelector('input'), document.getElementById(preview2Id));

    const input3Name = `equipment_item3_${equipmentName}${index ? '_' + index : ''}`;
    const preview3Id = `preview_${input3Name}`;
    const item3 = document.createElement('div');
    item3.className = 'flex flex-col gap-1 mt-2';
    item3.innerHTML = `
      <label class="text-sm font-semibold">
        ${equipmentName}${suffix} – Three (3) sets of Plans/drawings incorporated in the Application Form (A3 size acceptable if legible)
      </label>
      <input type="file" name="${input3Name}" multiple class="border rounded px-2 py-1" />
      <div id="${preview3Id}" class="flex flex-wrap gap-2 mt-2"></div>
    `;
    equipmentContainer.appendChild(item3);
    setupFilePreview(item3.querySelector('input'), document.getElementById(preview3Id));
  }

  equipmentCheckboxes.forEach(cb => {
    const wrapper = cb.closest('div');
    const countInput = wrapper?.querySelector('.equipment-count');

    cb.addEventListener('change', () => {
      if (countInput) {
        if (cb.checked) {
          countInput.classList.remove('hidden');
          countInput.focus();
        } else {
          countInput.classList.add('hidden');
          countInput.value = '';
        }
      }

      toggleFoundationItem7();
      rebuildEquipmentChecklist();
    });

    countInput?.addEventListener('input', rebuildEquipmentChecklist);
  });

  toggleFoundationItem7();

  // ----------------- FORM SUBMISSION -----------------
  const form = document.getElementById("checklistForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser || !currentUser.id) {
        Swal.fire({ icon: "error", title: "Not Logged In", text: "Please log in before submitting the form." });
        return;
      }

      Swal.fire({
        title: "Submitting...",
        text: "Please wait while we generate your PDF checklist.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const formData = new FormData(form);
        formData.append('user_id', currentUser.id);

        // ----------------- SINGLE EQUIPMENT -----------------
        const equipmentCheckbox = document.querySelector('.equipment-checkbox:checked');
        if (!equipmentCheckbox) throw new Error("Please select one equipment type.");
        const equipmentName = equipmentCheckbox.value.trim();
        const totalUnitsInput = equipmentCheckbox.closest('div')?.querySelector('.equipment-count');
        const totalUnits = totalUnitsInput?.value || 1;

        formData.append('equipment', equipmentName);          // string, single equipment
        formData.append('equipment_no', totalUnits);         // number of units

        // ----------------- APPEND STATIC FILES 1–12 -----------------
        for (let i = 1; i <= 12; i++) {
          const input = document.getElementById(`fileItem${i}`);
          if (input && input.files.length > 0) Array.from(input.files).forEach(file => formData.append(`file_item${i}`, file));
        }

        // ----------------- APPEND DYNAMIC FILES FOR SINGLE EQUIPMENT -----------------
        document.querySelectorAll('#equipmentChecklistContainer input[type="file"]').forEach(input => {
          Array.from(input.files).forEach(file => formData.append(input.name, file));
        });

        // ----------------- SEND REQUEST -----------------
        const response = await fetch("/submit-checklist", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Server error while submitting checklist.");

        const blob = await response.blob();
        const pdfUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = `Checklist-${Date.now()}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(pdfUrl);

        Swal.close();
        Swal.fire({
          icon: "success",
          title: "Checklist Submitted!",
          text: "Your PDF has been downloaded successfully.",
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          form.reset();
          document.querySelectorAll('[id^="preview_"]').forEach(preview => preview.innerHTML = '');
          document.querySelectorAll('input[type="file"]').forEach(input => input.classList.add('hidden'));
          document.querySelectorAll('.checklist-checkbox').forEach(cb => cb.checked = false);
          equipmentContainer.innerHTML = '';
          window.location.href = "/tsi-applicant/pages/index";
        });

      } catch (error) {
        console.error(error);
        Swal.close();
        Swal.fire({ icon: "error", title: "Submission Failed", text: error.message || "Unexpected error occurred." });
      }
    });
  }

});
