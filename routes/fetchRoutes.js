const express = require('express');
const router = express.Router();
const fetchController = require('../controllers/fetchController');

router.get('/allUsers', fetchController.getAllUser);

module.exports = router;
