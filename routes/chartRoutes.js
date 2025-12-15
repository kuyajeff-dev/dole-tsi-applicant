const express = require('express');
const router = express.Router();
const chartController = require('../controllers/chartController');

// Monthly chart data
router.get('/monthly-data', chartController.monthlyChart);

// Daily monitoring data
router.get('/daily-data', chartController.dailyData);

module.exports = router;
