document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageEl = document.getElementById('loginMessage');

    const forgotForm = document.getElementById('forgotForm');
    const forgotEmailInput = document.getElementById('forgotEmail');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const backToLoginBtn = document.getElementById('backToLogin');

    const tempPasswordForm = document.getElementById('tempPasswordForm');
    const tempPasswordInput = document.getElementById('tempPassword');
    const backToEmailBtn = document.getElementById('backToEmail');

    const newPasswordForm = document.getElementById('newPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    let tempEmail = '';

    async function safeFetch(url, options) {
        try {
            const res = await fetch(url, options);
            let data;
            const ct = res.headers.get('content-type');
            if (ct && ct.includes('application/json')) data = await res.json();
            else data = { success: false, message: `Unexpected response: ${res.status}` };
            return { ok: res.ok, status: res.status, data };
        } catch (err) {
            console.error('Fetch error:', err);
            return { ok: false, status: 0, data: { success: false, message: 'Network error' } };
        }
    }

    // LOGIN
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) return Swal.fire('Warning', 'All fields required', 'warning');

        const { ok, data } = await safeFetch('/api/login/', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
        });

        if (ok && data.success) {
            Swal.fire('Success', data.message || 'Login successful', 'success');
            setTimeout(() => window.location.href = "/tsi-applicant/pages/index", 1200);
        } else Swal.fire('Error', data.message || 'Invalid credentials', 'error');
    });

    // SHOW FORGOT PASSWORD
    forgotPasswordBtn?.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        forgotForm.classList.remove('hidden');
        messageEl.textContent = '';
    });

    backToLoginBtn?.addEventListener('click', () => {
        forgotForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // SEND TEMP PASSWORD
    forgotForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = forgotEmailInput.value.trim();
        if (!email) return Swal.fire('Warning', 'Email required', 'warning');

        const { ok, data } = await safeFetch('/api/login/forgot-password', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
        });

        if (ok && data.success) {
            Swal.fire('Success', data.message, 'success');
            tempEmail = email;
            forgotForm.classList.add('hidden');
            tempPasswordForm.classList.remove('hidden');
        } else Swal.fire('Error', data.message || 'Failed', 'error');
    });

    // BACK TO EMAIL
    backToEmailBtn?.addEventListener('click', () => {
        tempPasswordForm.classList.add('hidden');
        forgotForm.classList.remove('hidden');
    });

    // VERIFY TEMP PASSWORD
    tempPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tempPass = tempPasswordInput.value.trim();
        if (!tempPass) return Swal.fire('Warning', 'Temporary password required', 'warning');

        const { ok, data } = await safeFetch('/api/login/verify-temp-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: tempEmail, tempPassword: tempPass })
        });

        if (ok && data.success) {
            Swal.fire('Success', 'Temporary password verified', 'success');
            tempPasswordForm.classList.add('hidden');
            newPasswordForm.classList.remove('hidden');
        } else Swal.fire('Error', data.message || 'Invalid temporary password', 'error');
    });

    // RESET PASSWORD
    newPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        if (!newPassword || !confirmPassword) return Swal.fire('Warning', 'All fields required', 'warning');
        if (newPassword !== confirmPassword) return Swal.fire('Warning', 'Passwords do not match', 'warning');

        const { ok, data } = await safeFetch('/api/login/reset-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: tempEmail, newPassword, confirmPassword })
        });

        if (ok && data.success) {
            Swal.fire('Success', data.message, 'success');

            newPasswordForm.classList.add('hidden');
            loginForm.classList.remove('hidden');

            // Clear all temporary values
            tempEmail = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            forgotEmailInput.value = '';
            tempPasswordInput.value = '';

            // Redirect after a short delay
            setTimeout(() => window.location.href = "/tsi-applicant/pages/index", 1200);
        } else {
            Swal.fire('Error', data.message || 'Failed', 'error');
        }
    });

});
