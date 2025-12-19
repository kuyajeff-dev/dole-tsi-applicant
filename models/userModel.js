const pool = require('../db/mysql');
const bcrypt = require('bcrypt');

class userModel {
    // Toggle to alternate backups
    static backupToggle = true; // true -> users_backupA, false -> users_backupB

    // Helper: get backup table alternately
    static getBackupTable() {
        const table = this.backupToggle ? 'users_backupA' : 'users_backupB';
        this.backupToggle = !this.backupToggle; // flip for next create
        return table;
    }

    // Find a user by email
    static async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        return rows[0] || null;
    }

    // Create user + save backup alternately (with JSON)
    static async create({ full_name, email, password, avatar, role = 'user' }) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Insert into main users table
            const [result] = await conn.query(
                'INSERT INTO users (full_name, email, password, avatar, role, status) VALUES (?, ?, ?, ?, ?, ?)',
                [full_name, email, password, avatar || null, role, 'active']
            );

            const userId = result.insertId;

            // Build user object for JSON
            const userObj = { id: userId, full_name, email, password, avatar, role, status: 'active' };

            // Save to backup table (alternating) with JSON
            const backupTable = this.getBackupTable();
            await conn.query(
                `INSERT INTO ${backupTable} 
                 (id, full_name, email, password, avatar, role, status, user_data_json, backup_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [userId, full_name, email, password, avatar || null, role, 'active', JSON.stringify(userObj)]
            );

            await conn.commit();
            return userObj;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    // Update user + save previous state to both backup tables (with JSON)
    static async update(id, updates) {
        const conn = await pool.getConnection();
        try {
        await conn.beginTransaction();

        const [rows] = await conn.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
        if (!rows[0]) throw new Error('User not found');
        const current = rows[0];

        // Save current state to backup tables
        for (const table of ['users_backupA', 'users_backupB']) {
            const userObj = { ...current };
            await conn.query(
            `INSERT INTO ${table} 
            (id, full_name, email, password, avatar, role, status, user_data_json, backup_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [current.id, current.full_name, current.email, current.password, current.avatar, current.role, current.status, JSON.stringify(userObj)]
            );
        }

        const fields = [];
        const values = [];
        for (const key in updates) {
            fields.push(`${key} = ?`);
            values.push(updates[key]);
        }
        if (fields.length === 0) throw new Error('No updates provided');

        values.push(id);
        await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        await conn.commit();
        return { ...current, ...updates };
        } catch (err) {
        await conn.rollback();
        throw err;
        } finally {
        conn.release();
        }
    }

    // CHANGE PASSWORD by user ID
    static async changePasswordById(id, newPassword) {
        const hashed = await bcrypt.hash(newPassword, 10);
        const [result] = await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashed, id]
        );
        return result.affectedRows > 0;
    }

    // Delete user + save deleted state to both backup tables (with JSON)
    static async delete(id) {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            // Fetch current user
            const [rows] = await conn.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
            if (!rows[0]) throw new Error('User not found');
            const current = rows[0];

            // Save current state to both backup tables
            for (const table of ['users_backupA', 'users_backupB']) {
                const userObj = { ...current };
                await conn.query(
                    `INSERT INTO ${table} 
                     (id, full_name, email, password, avatar, role, status, user_data_json, backup_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [current.id, current.full_name, current.email, current.password, current.avatar, current.role, current.status, JSON.stringify(userObj)]
                );
            }

            // Delete from main users table
            await conn.query('DELETE FROM users WHERE id = ?', [id]);

            await conn.commit();
            return current;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }

    // Get all users by role
    static async findAllUser(role = 'user') {
        const [rows] = await pool.query('SELECT * FROM users WHERE role = ?', [role]);
        return rows;
    }

    // Count users by role
    static async countUser(role = 'user') {
        const [rows] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = ?', [role]);
        // safely return 0 if rows[0] is undefined
        return rows?.[0]?.total || 0;
    }


    // Optional: restore a user from latest backup
    static async restoreFromBackup(id) {
        const [rowsA] = await pool.query(
            'SELECT user_data_json FROM users_backupA WHERE id = ? ORDER BY backup_date DESC LIMIT 1',
            [id]
        );
        const [rowsB] = await pool.query(
            'SELECT user_data_json FROM users_backupB WHERE id = ? ORDER BY backup_date DESC LIMIT 1',
            [id]
        );

        const latestJSON = (() => {
            if (!rowsA[0] && !rowsB[0]) return null;
            if (!rowsA[0]) return rowsB[0].user_data_json;
            if (!rowsB[0]) return rowsA[0].user_data_json;
            return new Date(rowsA[0].backup_date) > new Date(rowsB[0].backup_date) ? rowsA[0].user_data_json : rowsB[0].user_data_json;
        })();

        return latestJSON ? JSON.parse(latestJSON) : null;
    }

    static async changePassword(email, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const [result] = await pool.query(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email]
        );
        return result.affectedRows > 0;
    }
    
}

module.exports = userModel;
