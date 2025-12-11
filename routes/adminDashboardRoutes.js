// routes/adminDashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashController = require('../controllers/dashController');

router.get('/stats', dashController.getTotalUserAndStats);
router.get('/remarks', dashController.getAllPlanRemarks);

module.exports = router;
