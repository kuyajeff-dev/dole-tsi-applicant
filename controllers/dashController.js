// controllers/dashController.js
const planModel = require('../models/planModel');
const userModel = require('../models/userModel');

exports.getTotalUserAndStats = async (req, res) => {
    try {
        const totalPlansRows = await planModel.getCount();
        const totalPlans = totalPlansRows?.[0]?.total || 0;

        const pending = (await planModel.getStatus('pending'))?.length || 0;
        const rejected = (await planModel.getStatus('rejected'))?.length || 0;
        const approved = (await planModel.getStatus('approved'))?.length || 0;

        const users = await userModel.countUser(); // now safe

        res.json({ totalPlans, pending, rejected, approved, users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
};


// controllers/dashController.js
exports.getAllPlanRemarks = async (req, res) => {
    try {
        const rows = await planModel.getAllRemarks();
        const notes = {};

        rows.forEach(row => {
            // Convert evaluation_date to local YYYY-MM-DD
            const evalDate = new Date(row.evaluation_date);
            const year = evalDate.getFullYear();
            const month = String(evalDate.getMonth() + 1).padStart(2, '0');
            const day = String(evalDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (!notes[dateStr]) notes[dateStr] = [];

            // Push structured note object
            notes[dateStr].push({
                applicant_establishment: row.applicant_establishment || '',
                equipment_location: row.equipment_location || '',
                equipment: row.equipment || '',
                evaluated_by: row.evaluated_by || '',
                remarks: row.remarks || ''
            });
        });

        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch remarks' });
    }
};


