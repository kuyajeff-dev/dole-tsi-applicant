const express = require('express');
const router = express.Router();
const fetchController = require('../controllers/fetchController');
const db = require('../db/mysql');

router.get('/allUsers', fetchController.getAllUser);

router.get('/', async (req, res) => {
    const role = req.query.role;
    if (!role) return res.status(400).json({ message: 'Role is required' });

    try {
        const users = await db.query(
            'SELECT id, full_name, avatar FROM users WHERE role = ?',
            [role]
        );
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

module.exports = router;
