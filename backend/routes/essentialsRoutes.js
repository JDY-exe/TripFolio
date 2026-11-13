const express = require("express");
const router = express.Router({ mergeParams: true }); 
const multer = require('multer');
const essentialsController = require('../controllers/essentialsController');
const authenticateToken = require('../middleware/authenticateToken');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/essentials/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Only accept PDFs and standard images
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDFs and images are allowed.'));
    }
  }
});

router.use(authenticateToken);
router.post('/', upload.single('file'), essentialsController.addEssential);
router.delete('/:essentialId', essentialsController.deleteEssential);
router.get('/:essentialId/download', essentialsController.downloadEssential);

module.exports = router;