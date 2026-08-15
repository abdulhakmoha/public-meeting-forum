const express = require('express');
const router = express.Router();
const {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getDocuments)
  .post(protect, authorize('admin', 'moderator'), createDocument);

router.route('/:id')
  .put(protect, authorize('admin', 'moderator'), updateDocument)
  .delete(protect, authorize('admin', 'moderator'), deleteDocument);

module.exports = router;
