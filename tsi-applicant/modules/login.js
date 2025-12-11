document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const messageEl = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            messageEl.textContent = "All fields are required!";
            messageEl.className = "text-red-600 font-semibold mt-2";
            return;
        }document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validate
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
                Swal.fire({
                    icon: "error",
                    title: "Login Failed",
                    text: data.message || "Invalid email or password.",
                });
            }

        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: "error",
                title: "Server Error",
                text: "Something went wrong. Please try again later.",
            });
        }
    });
});


        try {
            const res = await fetch("http://localhost:3001/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                messageEl.textContent = data.message || "Login successful!";
                messageEl.className = "text-green-600 font-semibold mt-2";

                setTimeout(() => {
                    window.location.href = "/tsi-applicant/pages/index";
                }, 1000);
            } else {
                messageEl.textContent = data.message || "Invalid credentials!";
                messageEl.className = "text-red-600 font-semibold mt-2";
            }
        } catch (err) {
            console.error(err);
            messageEl.textContent = "Server error, please try again later.";
            messageEl.className = "text-red-600 font-semibold mt-2";
        }
    });
});
