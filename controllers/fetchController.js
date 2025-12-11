const userModel = require('../models/userModel');

exports.getAllUser = async (req, res) => {
    try {
        const users = await userModel.findAllUser('user');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};
