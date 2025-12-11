document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const avatarInput = document.getElementById('avatar');
    const avatarPreview = document.getElementById('avatarPreview');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');
    const passwordMessage = document.getElementById('passwordMatchMessage');
    const submitBtn = document.getElementById('submitBtn');
    const form = document.getElementById('registerForm');
    const messageEl = document.getElementById('signupMessage');

    // ---------- Avatar Preview ----------
    avatarInput.addEventListener('change', () => {
        const file = avatarInput.files[0];
        if(file){
            avatarPreview.src = URL.createObjectURL(file);
        } else {
            avatarPreview.src = ''; // reset if no file
        }
    });

    // ---------- Password Toggle ----------
    function setupToggle(inputId, toggleId, iconId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        const icon = document.getElementById(iconId);

        toggle.addEventListener('click', () => {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);

            icon.innerHTML = type === 'password'
                ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                        -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />`
                : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7
                        a9.963 9.963 0 012.223-3.563m3.26-2.273A9.953 9.953 0 0112 5
                        c4.478 0 8.268 2.943 9.542 7a9.957 9.957 0 01-1.319 2.357
                        M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
        });
    }

    setupToggle('password', 'togglePassword', 'eyeIcon');
    setupToggle('confirm_password', 'toggleConfirmPassword', 'eyeConfirmIcon');

    // ---------- Live Password Match ----------
    function validatePassword() {
        if(confirmPassword.value === ''){
            passwordMessage.textContent = '';
            submitBtn.disabled = false;
            return;
        }

        if(password.value === confirmPassword.value){
            passwordMessage.textContent = 'Passwords match!';
            passwordMessage.className = 'mt-1 text-sm font-medium text-green-600';
            submitBtn.disabled = false;
        } else {
            passwordMessage.textContent = 'Passwords do not match!';
            passwordMessage.className = 'mt-1 text-sm font-medium text-red-600';
            submitBtn.disabled = true;
        }
    }

    password.addEventListener('input', validatePassword);
    confirmPassword.addEventListener('input', validatePassword);

    // ---------- Form Submission ----------
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if(res.ok){
                messageEl.textContent = data.message || 'Registered successfully!';
                messageEl.className = 'text-sm mt-2 text-green-600';

                // Redirect to index page after 1 second
                setTimeout(() => {
                    window.location.href = '/tsi-applicant/login';
                }, 1000);
            } else {
                messageEl.textContent = data.message || 'Something went wrong!';
                messageEl.className = 'text-sm mt-2 text-red-600';
            }

        } catch (err) {
            console.error(err);
            messageEl.textContent = 'Something went wrong!';
            messageEl.className = 'text-sm mt-2 text-red-600';
        }
    });

});
