const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const checklistController = require('../controllers/checklistController');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Use timestamp + original filename to avoid collisions
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Prepare fields for all checklist items (12 items)
const fileFields = Array.from({ length: 12 }, (_, i) => ({
  name: `file_item${i + 1}`,
  maxCount: 15
}));

const upload = multer({ storage });

router.post('/submit-checklist', upload.fields(fileFields),checklistController.generatePDF);

module.exports = router;
