const express = require('express');
const router = express.Router();
const path = require('path');
const sessionController = require('../controllers/sessionController');

router.get('/userOnly', sessionController.getUserSession);
router.get('/adminOnly', sessionController.getAdminSession);

module.exports = router;