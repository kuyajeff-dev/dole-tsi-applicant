document.addEventListener('DOMContentLoaded', () => {
    const AdminRegister = document.getElementById('AdminRegister');
    const avatarInput = document.getElementById('avatar');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageEl = document.getElementById('registerMessage');
    const showMessage = (el, msg, type='red') => {
        el.textContent = msg;
        el.className = type === 'red' ? 'text-red-600 font-semibold mt-2' : 'text-green-600 font-semibold mt-2';
    };

    AdminRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        const avatarFile = avatarInput.files[0];

        if (!full_name || !email || !password || !confirmPassword) {
            return showMessage(messageEl, "All fields are required!");
        }
        if (password !== confirmPassword) {
            return showMessage(messageEl, "Passwords do not match!");
        }
        const formData = new FormData();
        formData.append('full_name', full_name);
        formData.append('email', email);
        formData.append('password', password);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }
        try {
            const res = await fetch("/api/admin/adminRegister", {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showMessage(messageEl, data.message || "Registration successful!", 'green');
                setTimeout(() => {
                    window.location.href = "/admin/";
                }, 1000);
            } else {
                showMessage(messageEl, data.message || "Registration failed!");
            }
        } catch (err) {
            console.error(err);
            showMessage(messageEl, "Server error, please try again later.");
        }
    });
});