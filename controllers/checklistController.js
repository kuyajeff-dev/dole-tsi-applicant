// checklistController.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const pool = require('../db/mysql');

// ----------------- CHECKLIST ITEMS -----------------
const CHECKLIST_ITEMS = [
  "Request Letter for \"clearing of mechanical plans\" addressed to Regional Director with contact name & contact number",
  "Three (3) sets of duly accomplished Application Forms per equipment, signed/sealed by PME and signed by Owner/Manager",
  "Three (3) sets of Plans/drawings incorporated in the Application Form (A3 size acceptable if legible)",
  "Location / Site plans / Vicinity Map",
  "Room layout / Floor plans / Equipment specifications",
  "Installation drawings of equipment showing detailed sections / elevations / foundation construction",
  "Foundation design calculation with minimum factor of safety of 5 (Boiler, Pressure Vessel, Turbine, ICE)",
  "Mechanical plans/drawings, signed/sealed by PME and signed by Owner/Manager",
  "Photocopy of PME's valid PRC ID",
  "Photocopy of PME's recent Professional Tax Receipt",
  "Photocopy of PME's valid Certificate of Appearance (CA) issued from DOLE",
  "One (1) electronic copy of mechanical application in a portable document format (PDF) - if applicable"
];

// ----------------- CHECKLIST MODEL -----------------
const Checklist = {
  create: async (data) => {
    const sql = `
      INSERT INTO checklist_submissions
      (user_id, applicant_establishment, equipment_location, total_units, equipment, equipment_no, checklist_items, pdf_file, remarks, evaluated_by, evaluation_date, dynamic_check, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;

    const values = [
      data.user_id,
      data.applicant_establishment,
      data.equipment_location,
      data.total_units,
      data.equipment,
      data.equipment_no,
      JSON.stringify(data.checklist_items),
      data.pdf_file || null,
      data.remarks || null,
      data.evaluated_by || null,
      data.evaluation_date || null,
      JSON.stringify(data.dynamic_check || {}), // dynamic_check properly handled
      data.status || 'pending'                  // status as last value
    ];

    const [result] = await pool.query(sql, values);
    return result.insertId;
  },

  updatePDFPath: async (id, pdfPath) => {
    const sql = `UPDATE checklist_submissions SET pdf_file = ? WHERE id = ?`;
    await pool.query(sql, [pdfPath, id]);
  }
};

// ----------------- CONTROLLER -----------------
exports.generatePDF = async (req, res) => {
  try {
    const currentUser = req.body.user_id || req.session?.user?.id;
    if (!currentUser) return res.status(401).json({ success: false, message: 'User not logged in' });

    const {
      applicant_establishment,
      equipment_location,
      total_units,
      remarks,
      evaluated_by,
      evaluation_date,
      equipment,
      equipment_no
    } = req.body;

    const filesArray = req.files || [];

    // ----------------- ORGANIZE FILES -----------------
    const checklistFiles = {};
    const dynamicFiles = { item2: [], item3: [] };

    filesArray.forEach(file => {
      if (file.fieldname.startsWith('file_item')) checklistFiles[file.fieldname] = file.path;
      else if (file.fieldname.startsWith('equipment_item2_')) dynamicFiles.item2.push(file.path);
      else if (file.fieldname.startsWith('equipment_item3_')) dynamicFiles.item3.push(file.path);
    });

    // ----------------- PREPARE CHECKLIST ITEMS -----------------
    const checklistItems = CHECKLIST_ITEMS.map((item, i) => ({
      item,
      file: checklistFiles[`file_item${i + 1}`] || null
    }));

    // ----------------- PREPARE DYNAMIC CHECK -----------------
    const dynamic_check = {
      item2: dynamicFiles.item2,
      item3: dynamicFiles.item3
    };

    // ----------------- SAVE RECORD -----------------
    const insertedId = await Checklist.create({
      user_id: currentUser,
      applicant_establishment,
      equipment_location,
      total_units,
      equipment,
      equipment_no,
      checklist_items: checklistItems,
      dynamic_check,
      remarks,
      evaluated_by,
      evaluation_date,
      pdf_file: null,
      status: 'pending'
    });

    // ----------------- CREATE PDF -----------------
    const pdfDir = path.join(__dirname, '..', 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFileName = `Checklist-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font('Helvetica-Bold').fontSize(14)
      .text('Checklist for Application of Clearing Mechanical Plan Installation/s', { width: pageWidth, align: 'center' });
    doc.moveDown(2);

    doc.font('Helvetica').fontSize(11)
      .text(`Applicant Establishment: ${applicant_establishment}`, { width: pageWidth, align: 'center' })
      .text(`Location of Equipment: ${equipment_location}`, { width: pageWidth, align: 'center' })
      .text(`Total # of units: ${equipment_no}`, { width: pageWidth, align: 'center' })
      .text(`Equipment: ${equipment}`, { width: pageWidth, align: 'center' });
    doc.moveDown();

    checklistItems.forEach((itemObj, index) => {
      doc.font('Helvetica').fontSize(10)
        .text(`${index + 1}. ${itemObj.item}`, { width: pageWidth, align: 'left' });
      if (itemObj.file) doc.text(`Attached File: ${path.basename(itemObj.file)}`);
      else doc.text('No files attached.');
      doc.moveDown();
    });

    Object.keys(dynamic_check).forEach(key => {
      if (dynamic_check[key].length) {
        doc.font('Helvetica-Bold').text(`Equipment Files (${equipment}) - ${key}`, { width: pageWidth, align: 'left' });
        dynamic_check[key].forEach(f => doc.text(`Attached File: ${path.basename(f)}`));
        doc.moveDown();
      }
    });

    doc.font('Helvetica-Bold').text('Remarks:', { width: pageWidth, align: 'left' });
    doc.font('Helvetica').text(remarks || 'N/A', { width: pageWidth, align: 'left' });

    doc.end();

    stream.on('finish', async () => {
      await Checklist.updatePDFPath(insertedId, pdfFileName);
      res.download(pdfPath, pdfFileName);
    });

    stream.on('error', err => {
      console.error('PDF Stream error:', err);
      res.status(500).send('Server error creating PDF');
    });

  } catch (err) {
    console.error('generatePDF error:', err);
    res.status(500).send('Server error');
  }
};
