// controllers/registerController.js
const path = require('path');
const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');

exports.registerUser = async (req, res) => {
    try {
        const { full_name, email, password, confirm_password } = req.body;
        const avatar = req.file ? req.file.filename : null;

        if(!full_name || !email || !password || !confirm_password){
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

        const newUser = await userModel.create({ full_name, email, password: passwordHash, avatar });

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
            avatar: user.avatar || null
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