// routes/loginRoutes.js
const express = require('express');
const router = express.Router();
const registerController = require('../controllers/registerController'); // or loginController if you have it


router.post('/', registerController.loginUser);

module.exports = router;
