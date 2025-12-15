const Chart = require('../models/chartModel');

// Monthly Chart
exports.monthlyChart = async (req, res) => {
    try {
        // Optional: check session for admin
        // if (!req.session || !req.session.admin) return res.status(401).json({ error: "Unauthorized" });

        const data = await Chart.getMonthlyData();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
};

// Daily Monitoring Data
exports.dailyData = async (req, res) => {
    try {
        // Optional: check session for admin
        // if (!req.session || !req.session.admin) return res.status(401).json({ error: "Unauthorized" });

        const month = parseInt(req.query.month);
        if (!month || month < 1 || month > 12) return res.status(400).json({ error: "Invalid month" });

        const data = await Chart.getDailyData(month);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
};
