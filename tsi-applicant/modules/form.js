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

  // ----------------- DYNAMIC EQUIPMENT CHECKLIST -----------------
  const equipmentCheckboxes = document.querySelectorAll('.equipment-checkbox');
  const equipmentContainer = document.getElementById('equipmentChecklistContainer');

  function rebuildEquipmentChecklist() {
    equipmentContainer.innerHTML = '';
    let checklist2Counter = 1;
    let checklist3Counter = 1;

    equipmentCheckboxes.forEach(cb => {
      const wrapper = cb.closest('div');
      const countInput = wrapper.querySelector('.equipment-count');
      const count = parseInt(countInput.value);
      if (!cb.checked || !count || count < 1) return;

      const equipmentName = cb.value;
      for (let i = 1; i <= count; i++) {
        // -------- Checklist 2 Dynamic --------
        const item2 = document.createElement('div');
        item2.className = 'flex flex-col gap-1';
        const input2Name = `equipment_item2_${equipmentName}_${i}`;
        const preview2Id = `preview_${input2Name}`;
        item2.innerHTML = `
          <label class="flex items-center gap-2 text-sm font-semibold">
            2.${checklist2Counter} ${equipmentName} #${i} – Three (3) sets of duly accomplished Application Forms
          </label>
          <input type="file" name="${input2Name}" multiple class="border rounded px-2 py-1" />
          <div id="${preview2Id}" class="flex flex-wrap gap-2 mt-2"></div>
        `;
        equipmentContainer.appendChild(item2);
        setupFilePreview(item2.querySelector('input[type="file"]'), document.getElementById(preview2Id));
        checklist2Counter++;

        // -------- Checklist 3 Dynamic --------
        const item3 = document.createElement('div');
        item3.className = 'flex flex-col gap-1 mt-2';
        const input3Name = `equipment_item3_${equipmentName}_${i}`;
        const preview3Id = `preview_${input3Name}`;
        item3.innerHTML = `
          <label class="flex items-center gap-2 text-sm font-semibold">
            3.${checklist3Counter} ${equipmentName} #${i} – Three (3) sets of Plans / Drawings
          </label>
          <input type="file" name="${input3Name}" multiple class="border rounded px-2 py-1" />
          <div id="${preview3Id}" class="flex flex-wrap gap-2 mt-2"></div>
        `;
        equipmentContainer.appendChild(item3);
        setupFilePreview(item3.querySelector('input[type="file"]'), document.getElementById(preview3Id));
        checklist3Counter++;
      }
    });
  }

  equipmentCheckboxes.forEach(cb => {
    const wrapper = cb.closest('div');
    const countInput = wrapper.querySelector('.equipment-count');

    cb.addEventListener('change', () => {
      if (cb.checked) { countInput.classList.remove('hidden'); countInput.focus(); }
      else { countInput.classList.add('hidden'); countInput.value = ''; rebuildEquipmentChecklist(); }
    });

    countInput.addEventListener('input', rebuildEquipmentChecklist);
  });

  // ----------------- FORM SUBMISSION -----------------
  const form = document.getElementById("checklistForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser || !currentUser.id) {
        Swal.fire({ icon: "error", title: "Not Logged In", text: "Please log in before submitting the form." });
        return;
      }

      Swal.fire({ title: "Submitting...", text: "Please wait while we generate your PDF checklist.", allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading() });

      try {
        const formData = new FormData(form);
        formData.append('user_id', currentUser.id);

        // ----------------- COLLECT EQUIPMENT NUMBERS -----------------
        const equipmentNos = {};
        equipmentCheckboxes.forEach(cb => {
          const wrapper = cb.closest('div');
          const countInput = wrapper.querySelector('.equipment-count');
          if (cb.checked && countInput && countInput.value) {
            equipmentNos[cb.value] = parseInt(countInput.value);
          }
        });
        formData.append('equipment_no', JSON.stringify(equipmentNos));

        // Append static checklist 1–12 files
        for (let i = 1; i <= 12; i++) {
          const input = document.getElementById(`fileItem${i}`);
          if (input && input.files.length > 0) Array.from(input.files).forEach(file => formData.append(`file_item${i}`, file));
        }

        // Append dynamic checklist files
        document.querySelectorAll('#equipmentChecklistContainer input[type="file"]').forEach(input => {
          Array.from(input.files).forEach(file => formData.append(input.name, file));
        });

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
        Swal.fire({ icon: "success", title: "Checklist Submitted!", text: "Your PDF has been downloaded successfully.", timer: 1500, showConfirmButton: false }).then(() => {
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
