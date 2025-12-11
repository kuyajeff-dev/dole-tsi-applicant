// controllers/adminAuthController.js
const adminModel = require('../models/adminModel');
const transporter = require('../config/nodemailer');
const bcrypt = require('bcrypt');
const path = require('path');

const otpStore = new Map();

exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'All fields required' });

        try {
        const admin = await adminModel.findByEmail(email);

        // BLOCK NON-ADMIN USERS
        if (!admin || admin.role !== "admin") {
            return res.status(403).json({ success: false, message: "Access denied: Admins only" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // TEMP SESSION for OTP
        req.session.tempAdmin = {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            avatar: admin.avatar
        };

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email, otp);
        setTimeout(() => otpStore.delete(email), 5 * 60 * 1000); // OTP expires in 5 min

        // Send OTP via email
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Your Admin Login OTP',
            html: `
            <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
              <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; padding: 30px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Admin Panel Login OTP</h2>
                <p style="color: #4b5563; font-size: 16px; margin-bottom: 30px;"> Hello <strong>${admin.full_name}</strong>, </p>
                <p>Use the following One-Time Password (OTP) to log in to your admin account. This OTP is valid for <strong>3 minutes</strong>.</p>
                <div style="display: inline-block; padding: 15px 25px; font-size: 20px; font-weight: bold; color: #ffffff; background-color: #10b981; border-radius: 8px; letter-spacing: 2px;">
                  ${otp}
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  If you did not request this OTP, please ignore this email.
                </p>
              </div>
            </div>
            `
        });

        res.json({ success: true, message: 'OTP sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    const storedOtp = otpStore.get(email);

    if (!storedOtp) return res.status(400).json({ success: false, message: 'OTP expired or invalid' });
    if (storedOtp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });

    try {
        const tempAdmin = req.session.tempAdmin;
        if (!tempAdmin || tempAdmin.email !== email) {
            return res.status(400).json({ success: false, message: 'No login attempt found' });
        }

        // Promote tempAdmin -> full admin session
        req.session.admin = {
            id: tempAdmin.id,
            full_name: tempAdmin.full_name,
            email: tempAdmin.email,
            role: 'admin',
            avatar: tempAdmin.avatar
        };

        // Clean up temp session and OTP
        delete req.session.tempAdmin;
        otpStore.delete(email);

        res.json({ success: true, message: 'Login successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.adminRegister = async (req, res) => {
    const { full_name, email, password } = req.body;
    const avatar = req.file ? req.file.path : null;

    if (!full_name || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    try {
        const existingAdmin = await adminModel.findByEmail(email);
        if (existingAdmin) return res.status(400).json({ success: false, message: 'Email already registered' });

        const hashedPassword = await bcrypt.hash(password, 10);
        await adminModel.create({ full_name, email, password: hashedPassword, avatar });

        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};


