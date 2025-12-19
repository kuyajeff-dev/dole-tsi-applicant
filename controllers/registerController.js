// controllers/registerController.js
const path = require('path');
const userModel = require('../models/userModel');
const transporter = require('../config/nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

exports.registerUser = async (req, res) => {
    try {
        const { full_name, establishment, email, password, confirm_password } = req.body;
        const avatar = req.file ? req.file.filename : null;

        if(!full_name || !establishment || !email || !password || !confirm_password){
            return res.status(400).json({ message: 'All fields are required' });
        }

        if(password !== confirm_password){
            return res.status(400).json({ message: 'Passwords do not match' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);

        const existingUser = await userModel.findByEmail(email);
        if(existingUser){
            return res.status(400).json({ message: 'Email already registered' });
        }

        const newUser = await userModel.create({ full_name, email, establishment, password: passwordHash, avatar });

        res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await userModel.findByEmail(email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // 🔒 Block admin access to user dashboard
        if (user.role && user.role.toLowerCase() === 'admin') {
            return res.status(403).json({ message: 'Admins cannot log in here' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // User session
        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: "user", // enforce role
            avatar: user.avatar || null,
            establishment: user.establishment,
        };

        return res.json({
            success: true,
            message: "Login successful",
            user: req.session.user
        });

    } catch (err) {
        console.log("Login Error:", err);
        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        const user = await userModel.findByEmail(email);
        if (!user) return res.status(404).json({ success: false, message: 'Email not found' });

        const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 char temp
        const hashedTemp = await bcrypt.hash(tempPassword, 10);

        await userModel.changePassword(email, tempPassword); // hashed inside

        await transporter.sendMail({
            from: `"TSI Temporary Password" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Your Temporary Password for TSI Applicant System',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <p>Dear <strong>${user.full_name}</strong>,</p>

                    <p>We have generated a temporary password for your TSI Applicant System account. Please use the details below to log in and reset your password immediately for security purposes:</p>

                    <p style="text-align: center; font-size: 1.2em; margin: 20px 0;">
                        <strong>${tempPassword}</strong>
                    </p>

                    <p>For security, we strongly recommend changing this password as soon as you log in.</p>

                    <p>Thank you for using the TSI Applicant System.</p>

                    <p>Best regards,<br>
                    <strong>TSI Support Team</strong></p>
                </div>
            `
        });

        res.json({ success: true, message: 'Temporary password sent to your email' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to send temporary password' });
    }
};

// VERIFY TEMP PASSWORD
exports.verifyTempPassword = async (req, res) => {
    try {
        const { email, tempPassword } = req.body;
        if (!email || !tempPassword) return res.status(400).json({ success: false, message: 'Required' });

        const user = await userModel.findByEmail(email);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const match = await bcrypt.compare(tempPassword, user.password);
        if (!match) return res.status(400).json({ success: false, message: 'Temporary password invalid' });

        res.json({ success: true, message: 'Temporary password verified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;
        if (!email || !newPassword || !confirmPassword)
            return res.status(400).json({ success: false, message: 'All fields required' });
        if (newPassword !== confirmPassword)
            return res.status(400).json({ success: false, message: 'Passwords do not match' });

        const user = await userModel.findByEmail(email);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await userModel.changePassword(email, newPassword);

        // Optional: log user out if session exists
        if (req.session.user && req.session.user.email === email) delete req.session.user;

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
};