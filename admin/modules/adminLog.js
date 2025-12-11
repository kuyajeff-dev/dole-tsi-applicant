document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('Adminlogin');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    /** SWEET ALERT HELPER */
    const alertMsg = (icon, title, text) => {
        Swal.fire({
            icon,
            title,
            text,
        });
    };

    let otpSent = false;

    const sendOtp = async (email, password) => {
        try {
            const res = await fetch("/api/admin/adminLogin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                alertMsg("error", "Login Failed", data.message);
                return false;
            }

            otpSent = true;

            Swal.fire({
                icon: "success",
                title: "OTP Sent",
                text: "Please check your email for the verification code.",
                timer: 1500,
                showConfirmButton: false
            });

            return true;
        } catch (err) {
            console.error(err);
            alertMsg("error", "Server Error", "Please try again later.");
            return false;
        }
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            alertMsg("warning", "Missing Fields", "Please fill in both email and password.");
            return;
        }

        if (!otpSent) {
            const sent = await sendOtp(email, password);
            if (!sent) return;
        }

        /** Replace form with OTP inputs */
        loginForm.innerHTML = `
            <label class="block text-gray-600 mb-1">Enter OTP</label>
            <input type="text" id="otp" placeholder="6-digit OTP" class="w-full p-3 rounded-lg border mb-3">
            <button id="verifyOtpBtn" class="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 mb-2">Verify OTP</button>
            <div class="flex justify-between items-center mt-2">
                <span id="otpMessage" class="text-sm"></span>
                <span id="otpTimer" class="text-sm text-gray-500 font-medium"></span>
            </div>
            <button id="resendOtpBtn" class="w-full bg-gray-300 text-gray-700 p-2 rounded-lg font-medium mt-3 hover:bg-gray-400 hidden">Resend OTP</button>
        `;

        const otpInputEl = document.getElementById('otp');
        const verifyBtn = document.getElementById('verifyOtpBtn');
        const resendBtn = document.getElementById('resendOtpBtn');
        const otpMessage = document.getElementById('otpMessage');
        const otpTimer = document.getElementById('otpTimer');

        /** OTP Timer Logic */
        let remainingTime = 3 * 60;
        let timerInterval;

        const updateTimer = () => {
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;

            otpTimer.textContent = `Expires in: ${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}`;

            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                otpMessage.textContent = "OTP expired.";
                otpMessage.style.color = "red";
                resendBtn.classList.remove("hidden");
                verifyBtn.disabled = true;
            }

            remainingTime--;
        };

        const startTimer = () => {
            resendBtn.classList.add("hidden");
            verifyBtn.disabled = false;
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        };

        startTimer();

        /** Verify OTP */
        verifyBtn.addEventListener('click', async () => {
            const otp = otpInputEl.value.trim();
            if (!otp) {
                alertMsg("warning", "Missing OTP", "Please enter the 6-digit OTP.");
                return;
            }

            try {
                const verifyRes = await fetch("/api/admin/verifyOtp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, otp })
                });

                const verifyData = await verifyRes.json();

                if (!verifyRes.ok || !verifyData.success) {
                    alertMsg("error", "Invalid OTP", verifyData.message);
                    return;
                }

                Swal.fire({
                    icon: "success",
                    title: "OTP Verified",
                    text: "You are being logged in...",
                    timer: 1200,
                    showConfirmButton: false
                });

                clearInterval(timerInterval);

                setTimeout(() => {
                    window.location.href = "/admin/pages/";
                }, 1200);

            } catch (err) {
                console.error(err);
                alertMsg("error", "Verification Error", "Unable to verify OTP.");
            }
        });

        /** Resend OTP */
        resendBtn.addEventListener('click', async () => {
            const sent = await sendOtp(email, password);
            if (!sent) return;

            Swal.fire({
                icon: "success",
                title: "OTP Resent",
                text: "A new OTP has been sent to your email.",
                timer: 1200,
                showConfirmButton: false
            });

            remainingTime = 3 * 60;
            startTimer();
        });
    });
});
