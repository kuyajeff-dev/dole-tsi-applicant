const pool = require('../db/mysql');

class userModel {
    static async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        return rows[0];
    }

    static async create({ full_name, email, password, avatar }) {
        const [result] = await pool.query(
            'INSERT INTO users (full_name, email, password, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?)',
            [full_name, email, password, avatar, 'user', 'active']
        );
        return { id: result.insertId, full_name, email, avatar, role: 'user', status: 'active' };
    }

     static async findAllUser(role = 'user') {
        const [rows] = await pool.query('SELECT * FROM users WHERE role = ?', [role]);
        return rows; // return all matching users
    }

    static async countUser(role = 'user') {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS total FROM users WHERE role = ?`,
            [role]
        );
        return rows; // rows[0].total will give the count
    }
}

module.exports = userModel;
