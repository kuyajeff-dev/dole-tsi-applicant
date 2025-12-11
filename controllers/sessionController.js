const path = require('path');
const userModel = require('../models/userModel')

exports.getUserSession = (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'user') {
        return res.status(401).json({ message: 'User not logged in' });
    }
    return res.json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: "user",
        avatar: user.avatar ? path.basename(user.avatar) : null
    });
};

exports.getAdminSession = (req, res) => {
    const user = req.session.admin;
    const tempAdmin = req.session.tempAdmin;

    if (!user && !tempAdmin) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    if (tempAdmin) {
        // OTP pending
        return res.json({
            pendingAdmin: true,
            full_name: tempAdmin.full_name,
            email: tempAdmin.email,
            avatar: tempAdmin.avatar ? path.basename(tempAdmin.avatar) : null
        });
    }

    // Full login
    return res.json({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: "admin",
        avatar: user.avatar ? path.basename(user.avatar) : null
    });
};