const pool = require('../db/mysql'); // make sure this exports a mysql2/promise pool

class ChartModel {

    static async getMonthlyData() {
        // Replace table/column names with your actual DB schema
        const [pending] = await pool.query(
            "SELECT MONTH(created_at) as month, COUNT(*) as value FROM checklist_submissions WHERE status = 'pending' GROUP BY MONTH(created_at)"
        );
        const [approved] = await pool.query(
            "SELECT MONTH(created_at) as month, COUNT(*) as value FROM checklist_submissions WHERE status = 'approved' GROUP BY MONTH(created_at)"
        );
        const [rejected] = await pool.query(
            "SELECT MONTH(created_at) as month, COUNT(*) as value FROM checklist_submissions WHERE status = 'rejected' GROUP BY MONTH(created_at)"
        );

        // Ensure array of 12 months with zeros for missing months
        const fillMonths = arr => {
            const result = Array(12).fill(0);
            arr.forEach(r => result[r.month - 1] = r.value);
            return result;
        };

        return {
            pending: fillMonths(pending),
            approved: fillMonths(approved),
            rejected: fillMonths(rejected)
        };
    }

    static async getDailyData(month) {
        const [rows] = await pool.query(
            "SELECT DAY(created_at) as day, COUNT(*) as value FROM checklist_submissions WHERE MONTH(created_at) = ? GROUP BY DAY(created_at)",
            [month]
        );

        // Fill in missing days with 0
        const maxDays = new Date(new Date().getFullYear(), month, 0).getDate();
        const result = Array(maxDays).fill(0);
        rows.forEach(r => result[r.day - 1] = r.value);

        return result;
    }
}

module.exports = ChartModel;
