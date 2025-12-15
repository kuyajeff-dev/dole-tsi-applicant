document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageEl = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validate fields
        if (!email || !password) {
            Swal.fire({
                icon: "warning",
                title: "Missing Fields",
                text: "Please fill out all fields.",
            });
            return;
        }

        try {
            const res = await fetch("http://localhost:3001/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                
                // UI message under form (kept from your old code)
                messageEl.textContent = data.message || "Login successful!";
                messageEl.className = "text-green-600 font-semibold mt-2";

                // SweetAlert popup
                Swal.fire({
                    icon: "success",
                    title: "Login Successful",
                    text: data.message || "Welcome!",
                    timer: 1200,
                    showConfirmButton: false
                });

                setTimeout(() => {
                    window.location.href = "/tsi-applicant/pages/index";
                }, 1200);

            } else {
                // UI error message under form (kept)
                messageEl.textContent = data.message || "Invalid credentials!";
                messageEl.className = "text-red-600 font-semibold mt-2";

                Swal.fire({
                    icon: "error",
                    title: "Login Failed",
                    text: data.message || "Invalid email or password.",
                });
            }

        } catch (err) {
            console.error(err);

            messageEl.textContent = "Server error, please try again later.";
            messageEl.className = "text-red-600 font-semibold mt-2";

            Swal.fire({
                icon: "error",
                title: "Server Error",
                text: "Something went wrong. Please try again later.",
            });
        }
    });
});
