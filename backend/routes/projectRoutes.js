const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  addProjectComment,
  deleteProject,
  addProjectPhoto
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getProjects)
  .post(protect, authorize('admin', 'moderator'), createProject);

router.route('/:id')
  .get(protect, getProject)
  .put(protect, authorize('admin', 'moderator'), updateProject)
  .delete(protect, authorize('admin', 'moderator'), deleteProject);

router.route('/:id/comments')
  .post(protect, addProjectComment);

router.route('/:id/photos')
  .post(protect, authorize('admin', 'moderator'), addProjectPhoto);

module.exports = router;
