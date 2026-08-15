const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { saveUploadFile } = require('../utils/mediaStore');

// @route   POST /api/upload
// @desc    Upload a file to MongoDB GridFS (persistent) and get the URL
// @access  Private
router.post('/', protect, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const saved = await saveUploadFile(req.file);

    res.status(200).json({
      message: 'File uploaded successfully',
      fileUrl: saved.fileUrl,
      filename: saved.filename,
      mimetype: saved.mimetype,
      size: saved.size,
      storage: 'gridfs',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

module.exports = router;
