const express = require('express');
const router = express.Router();
const ProfileController = require('../controllers/profileController');
const requireLogin = require('../middleware/requireLogin');

// Profile
router.get('/profile', requireLogin, ProfileController.getProfile);
router.put('/profile', requireLogin, ProfileController.updateProfile);

// Password
router.put('/change-password', requireLogin, ProfileController.changePassword);
// Verify current password
router.post('/verify-password', requireLogin, ProfileController.verifyPassword);


module.exports = router;
