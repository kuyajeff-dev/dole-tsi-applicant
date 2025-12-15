document.addEventListener('DOMContentLoaded', async () => {
  // ----------------- FETCH LOGGED-IN USER -----------------
  let currentUser = null;
  try {
    const res = await fetch('http://localhost:3001/api/user/userOnly', { credentials: 'include' });
    if (!res.ok) throw new Error('Not logged in');
    currentUser = await res.json();

    // Update nav
    const navUserName = document.getElementById('navUserName');
    const navAvatar = document.getElementById('navAvatar');
    if (navUserName) navUserName.textContent = currentUser.full_name || 'User';
    if (navAvatar) navAvatar.src = currentUser.avatar ? `/uploads/${currentUser.avatar}` : '/uploads/default-avatar.png';
  } catch (err) {
    console.warn('Failed to load user info:', err);
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
        previewContainer.innerHTML = '';
      }
    });
  });

  // ----------------- FILE PREVIEW -----------------
  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const previewContainer = document.getElementById(`preview_${e.target.id}`);
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
          input.value = ''; // Reset invalid file
        }
      });
    });
  });

  // ----------------- FORM SUBMISSION -----------------
  const form = document.getElementById("checklistForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser.id) {
      Swal.fire({
        icon: "error",
        title: "Not Logged In",
        text: "Please log in before submitting the form.",
      });
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

      // Append files from checklist items (file_item1...file_item12)
      for (let i = 1; i <= 12; i++) {
        const input = document.getElementById(`file_item${i}`);
        if (input && input.files.length > 0) {
          Array.from(input.files).forEach(file => {
            formData.append(`file_item${i}`, file);
          });
        }
      }

      const response = await fetch("/submit-checklist", {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Server error while submitting checklist.");

      // Convert response PDF to blob and trigger download
      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = `Checklist-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
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
        document.querySelectorAll('[id^="preview_file_item"]').forEach(preview => {
          preview.innerHTML = '';
        });
        document.querySelectorAll('input[type="file"]').forEach(input => {
          input.classList.add('hidden');
          input.value = "";
        });
        document.querySelectorAll('.checklist-checkbox').forEach(cb => {
          cb.checked = false;
        });
        window.location.href = "/tsi-applicant/pages/index";
      });

    } catch (error) {
      console.error(error);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: error.message || "Unexpected error occurred.",
      });
    }
  });
});
