const express = require('express');
const router = express.Router();
const { getUsers, updateUserRole, deleteUser, updateProfile } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

function profileUpload(req, res, next) {
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    const pic = req.files?.profilePicture?.[0] || req.files?.profileImage?.[0];
    if (pic) req.file = pic;
    next();
  });
}

router.route('/')
  .get(protect, admin, getUsers);

router.route('/profile')
  .put(protect, profileUpload, updateProfile);

router.route('/:id')
  .delete(protect, admin, deleteUser);

router.route('/:id/role')
  .put(protect, admin, updateUserRole);

module.exports = router;
