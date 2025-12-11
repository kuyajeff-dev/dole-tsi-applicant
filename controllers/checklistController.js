const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Checklist = require('../models/checklistModel');

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

exports.generatePDF = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const user_id = req.session.user.id;
    const {
      applicant_establishment,
      equipment_location,
      total_units,
      equipment = [],
      remarks,
      evaluated_by,
      evaluation_date
    } = req.body;

    const files = req.files || {};

    // Map checklist items with checked status and attached files
    const checklistItems = CHECKLIST_ITEMS.map((item, i) => {
      const fieldKey = `file_item${i + 1}`;
      return {
        item,
        checked: req.body[`check_item${i + 1}`] === 'on',
        files: files[fieldKey] ? files[fieldKey].map(f => f.path) : []
      };
    });

    // Step 1: Insert checklist submission into DB (PDF filename will be null for now)
    const insertedId = await Checklist.create({
      user_id,
      applicant_establishment,
      equipment_location,
      total_units,
      equipment,
      checklist_items: checklistItems,
      remarks,
      evaluated_by,
      evaluation_date,
      pdf_file: null // initially null
    });

    // Step 2: Ensure PDFs folder exists
    const pdfDir = path.join(__dirname, '..', 'pdfs');
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const pdfFileName = `Checklist-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);

    // Step 3: Generate PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Add logos
    const logos = ['logo1.jpg','logo2.jfif','image.png','image(1).png'];
    logos.forEach((logo, i) => {
      const fullPath = path.join(__dirname, '..', 'public', 'images', logo);
      if (fs.existsSync(fullPath)) {
        try { doc.image(fullPath, 50 + i * 70, 30, { width: 60 }); } 
        catch (err) { console.warn(`Failed to add logo ${logo}:`, err.message); }
      }
    });

    // Header
    doc.fontSize(12).text('Republic of the Philippines', 0, 50, { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).text('Department of Labor and Employment', { align: 'center' });
    doc.font('Helvetica').fontSize(10).text('Regional Office No. VII', { align: 'center' });
    doc.moveDown(2);

    // Checklist title
    doc.font('Helvetica-Bold').fontSize(14).text('Checklist for Application of Clearing Mechanical Plan Installation/s', { align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(10).text('Checklist of requirements effective March 01, 2017', { align: 'center' });
    doc.moveDown(2);

    // Applicant info
    doc.font('Helvetica').fontSize(12).text(`Applicant Establishment: ${applicant_establishment}`, { align: 'center' });
    doc.text(`Equipment Location: ${equipment_location}`, { align: 'center' });
    doc.text(`Total Units: ${total_units}`, { align: 'center' });
    doc.text(`Selected Equipment: ${equipment.join(', ') || 'None'}`, { align: 'center' });
    doc.moveDown();

    // Checklist items
    doc.font('Helvetica-Bold').fontSize(12).text('Mechanical Application Checklist', { underline: true });
    doc.moveDown(0.5);

    checklistItems.forEach((itemObj, index) => {
      doc.font('Helvetica').fontSize(11).text(`${index + 1}. ${itemObj.item}`);
      doc.text(`Checked: ${itemObj.checked ? 'Yes' : 'No'}`);
      if (itemObj.files.length > 0) {
        itemObj.files.forEach(f => {
          const ext = path.extname(f).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            try { doc.image(f, { width: 300 }).moveDown(); } 
            catch { doc.text(`Could not load image: ${f}`); }
          } else {
            doc.text(`Attached File: ${f}`);
          }
        });
      } else {
        doc.text('No files attached.');
      }
      doc.moveDown();
    });

    // Remarks and evaluation
    doc.moveDown();
    doc.text(`Remarks: ${remarks || 'N/A'}`);
    doc.text(`Evaluated by: ${evaluated_by || 'N/A'}`);
    doc.text(`Date of Evaluation: ${evaluation_date || 'N/A'}`);

    doc.end();

    // Step 4: After PDF is generated, update DB with PDF filename
    stream.on('finish', async () => {
      await Checklist.updatePDFPath(insertedId, pdfFileName);
      res.download(pdfPath, pdfFileName); // trigger download
    });

    stream.on('error', (err) => {
      console.error('PDF Stream error:', err);
      res.status(500).send('Server error creating PDF');
    });

  } catch (err) {
    console.error('generatePDF error:', err);
    res.status(500).send('Server error');
  }
};
