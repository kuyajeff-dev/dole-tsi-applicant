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
    // ----------------- VALIDATE USER -----------------
    const currentUser = req.body.user_id || (req.session?.user?.id);
    if (!currentUser) return res.status(401).json({ success: false, message: 'User not logged in' });

    const { applicant_establishment, equipment_location, total_units, remarks, evaluated_by, evaluation_date } = req.body;
    const filesArray = req.files || [];

    // ----------------- ORGANIZE FILES -----------------
    const checklistFiles = {};          // Static checklist
    const dynamicFiles = { item2: {}, item3: {} }; // Dynamic equipment files

    filesArray.forEach(file => {
      // Only first file per static checklist item
      if (file.fieldname.startsWith('file_item')) {
        if (!checklistFiles[file.fieldname]) checklistFiles[file.fieldname] = file.path;
      }

      // Dynamic files (all attachments preserved)
      if (file.fieldname.startsWith('equipment_item2_')) {
        const key = file.fieldname.replace('equipment_item2_', '');
        if (!dynamicFiles.item2[key]) dynamicFiles.item2[key] = [];
        dynamicFiles.item2[key].push(file.path);
      }
      if (file.fieldname.startsWith('equipment_item3_')) {
        const key = file.fieldname.replace('equipment_item3_', '');
        if (!dynamicFiles.item3[key]) dynamicFiles.item3[key] = [];
        dynamicFiles.item3[key].push(file.path);
      }
    });

    // ----------------- PREPARE CHECKLIST ITEMS -----------------
    const checklistItems = CHECKLIST_ITEMS.map((item, i) => ({
      item,
      file: checklistFiles[`file_item${i + 1}`] || null
    }));

    // ----------------- SAVE RECORD -----------------
    const insertedId = await Checklist.create({
      user_id: currentUser,
      applicant_establishment,
      equipment_location,
      total_units,
      equipment: [], // No equipment saved
      checklist_items: checklistItems,
      remarks,
      evaluated_by,
      evaluation_date,
      pdf_file: null
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

    // ----------------- LOGOS -----------------
    const logos = ['logo1.jpg', 'logo2.jfif', 'image.png', 'image(1).png'];
    let logoX = 50;
    const logoY = 20;
    logos.forEach(logo => {
      const fullPath = path.join(__dirname, '..', 'public', 'images', logo);
      if (fs.existsSync(fullPath)) {
        try { doc.image(fullPath, logoX, logoY, { width: 60 }); logoX += 70; } catch {}
      }
    });

    // ----------------- HEADER -----------------
    doc.font('Helvetica').fontSize(10).text('Republic of the Philippines', { width: pageWidth, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).text('Department of Labor and Employment', { width: pageWidth, align: 'center' });
    doc.font('Helvetica').fontSize(10).text('Regional Office No. VII', { width: pageWidth, align: 'center' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Checklist for Application of Clearing Mechanical Plan Installation/s', { width: pageWidth, align: 'center' });
    doc.font('Helvetica-Oblique').fontSize(8).text('Checklist of requirements in the application for mechanical Installation & mechanical fabrication of industrial facilities effective March 01, 2017.', { width: pageWidth, align: 'center' });
    doc.moveDown(2);

    // ----------------- APPLICANT INFO -----------------
    doc.font('Helvetica').fontSize(11)
      .text(`Applicant Establishment: ${applicant_establishment}`, { width: pageWidth, align: 'center' })
      .text(`Location of Equipment: ${equipment_location}`, { width: pageWidth, align: 'center' })
      .text(`Total # of units: ${total_units}`, { width: pageWidth, align: 'center' })
      .text(`Selected Equipment: None`, { width: pageWidth, align: 'center' });
    doc.moveDown();

    // ----------------- CHECKLIST ITEMS -----------------
    checklistItems.forEach((itemObj, index) => {
      doc.font('Helvetica').fontSize(10).text(`${index + 1}. ${itemObj.item}`, { width: pageWidth, align: 'left' });
      if (itemObj.file) {
        const ext = path.extname(itemObj.file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
          try { doc.image(itemObj.file, { width: 250 }).moveDown(); } 
          catch { doc.text(`Could not load image: ${itemObj.file}`); }
        } else {
          doc.text(`Attached File: ${path.basename(itemObj.file)}`);
        }
      } else {
        doc.text('No files attached.');
      }
      doc.moveDown();
    });

// ----------------- DYNAMIC EQUIPMENT FILES (SIDE BY SIDE, NO REPEAT) -----------------
const allDynamicFiles = { ...dynamicFiles.item2, ...dynamicFiles.item3 };

Object.keys(allDynamicFiles).forEach(key => {
  doc.font('Helvetica-Bold').text(`EQUIPMENT - ${key}`, { width: pageWidth, align: 'left' });

  const filesForKey = allDynamicFiles[key];
  if (filesForKey && filesForKey.length > 0) {
    const imagesPerRow = 3;
    const imageWidth = 150;
    const padding = 10;
    let x = doc.page.margins.left;
    let y = doc.y + 5;

    filesForKey.forEach((f, index) => {
      const ext = path.extname(f).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        try { doc.image(f, x, y, { width: imageWidth }); } 
        catch { doc.text(`Could not load image: ${f}`, x, y); }
      } else {
        doc.text(`Attached File: ${path.basename(f)}`, x, y);
      }

      x += imageWidth + padding;
      if ((index + 1) % imagesPerRow === 0) {
        x = doc.page.margins.left;
        y += 120;
      }
    });

    doc.y = y + 120;
  } else {
    doc.text('No files attached.');
  }

  doc.moveDown();
});


    // ----------------- REMARKS & EVALUATION -----------------
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Remarks:', { width: pageWidth, align: 'left' });
    doc.font('Helvetica').text(remarks || 'N/A', { width: pageWidth, align: 'left' });
    doc.moveDown();

    const y = doc.y;
    doc.text(`Evaluated by: ${evaluated_by || 'N/A'}`, { align: 'left' });
    doc.text(`Date of Evaluation: ${evaluation_date || 'N/A'}`, doc.page.margins.left, y, { align: 'right' });

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
