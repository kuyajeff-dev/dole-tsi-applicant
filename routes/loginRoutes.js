// routes/loginRoutes.js
const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController'); // or loginController if you have it


router.post('/', registerController.loginUser);
router.post('/forgot-password', registerController.forgotPassword);
router.post('/verify-temp-password', registerController.verifyTempPassword); 
router.put('/reset-password', registerController.resetPassword);

module.exports = router;
