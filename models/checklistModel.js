const pool = require('../db/mysql');

const Checklist = {
  create: async (data) => {
    const sql = `
      INSERT INTO checklist_submissions
      (user_id, applicant_establishment, equipment_location, total_units, equipment, checklist_items, pdf_file, remarks, evaluated_by, evaluation_date, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;

    const values = [
      data.user_id,
      data.applicant_establishment,
      data.equipment_location,
      data.total_units,
      JSON.stringify(data.equipment),
      JSON.stringify(data.checklist_items),
      data.pdf_file || null,       // PDF file name, can be null initially
      data.remarks || null,
      data.evaluated_by || null,
      data.evaluation_date || null,
      'pending'
    ];

    const [result] = await pool.query(sql, values); // use pool.query only
    return result.insertId;
  },

  updatePDFPath: async (id, pdfPath) => {
    const sql = `UPDATE checklist_submissions SET pdf_file = ? WHERE id = ?`;
    await pool.query(sql, [pdfPath, id]); // use pool.query only
  }
};

module.exports = Checklist;
