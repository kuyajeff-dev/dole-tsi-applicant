const pool = require('../db/mysql');

class Plan {
    static async findAll() {
        const [rows] = await pool.query('SELECT * FROM checklist_submissions ORDER BY created_at DESC');
        return rows;
    }

    static async findByUser(user_id) {
        const [rows] = await pool.query('SELECT * FROM checklist_submissions WHERE user_id  = ?', [user_id]);
        return rows;
    }

    static async getAll() {
        const [rows] = await pool.query(`
            SELECT cs.*, u.full_name AS applicant_name
            FROM checklist_submissions cs
            LEFT JOIN users u ON cs.user_id = u.id
            ORDER BY 
                CASE 
                    WHEN cs.status = 'pending' THEN 0
                    WHEN cs.status = 'rejected' THEN 1
                    ELSE 2
                END,
                cs.created_at DESC
        `);
        return rows;
    }

    static async updateApplicant(id, remarks, evaluated_by, evaluation_date) {
    const [result] = await pool.query(
        `UPDATE checklist_submissions 
        SET remarks = ?, evaluated_by = ?, evaluation_date = ? 
        WHERE id = ?`,
        [remarks, evaluated_by, evaluation_date, id]
    );

    return result;
    }

    static async UpdateStatus(id, status) {
        const [result] = await pool.query(
            `UPDATE checklist_submissions SET status = ? WHERE id = ?`,
            [status, id]
        );

        return result;
    }

    static async getStatus(status){
        const [result] = await pool.query(
            `SELECT * FROM checklist_submissions WHERE status = ? ORDER BY created_at DESC`,
            [status]
        );

        return result;
    }

    static async getAllRemarks() {
        const [rows] = await pool.query(
            `SELECT 
                applicant_establishment, 
                equipment_location, 
                equipment, 
                evaluated_by, 
                remarks, 
                evaluation_date 
             FROM checklist_submissions 
             WHERE evaluation_date IS NOT NULL 
             ORDER BY evaluation_date DESC`
        );
        return rows;
    }

    static async getById(id) {
    const [result] = await pool.query(
      `SELECT * FROM checklist_submissions WHERE id = ?`, 
      [id]
    );
    return result;
  }

  static async getCount() {
    const [result] = await pool.query(`SELECT COUNT(*) AS total FROM checklist_submissions`);
    return result;
  }
}

module.exports = Plan;