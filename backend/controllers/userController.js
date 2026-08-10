const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    console.log('👥 Fetching all users...');
    const users = await User.find({}).select('-password');
    console.log(`✅ Found ${users.length} users in database`);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Error in getUsers:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.role = req.body.role || user.role;
      const updatedUser = await user.save();
      res.json({ success: true, data: updatedUser });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    console.log(`🗑️ Attempting to delete user with ID: ${req.params.id}`);
    const user = await User.findById(req.params.id);

    if (user) {
      console.log(`👤 Found user: ${user.name} (${user.email})`);
      await User.findByIdAndDelete(req.params.id);
      console.log('✅ User deleted successfully');
      res.json({ success: true, message: 'User removed' });
    } else {
      console.log('❌ User not found');
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('❌ Error in deleteUser:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;
      user.district = req.body.district || user.district;

      if (req.file) {
        user.profilePicture = `/uploads/${req.file.filename}`;
      }

      // Password change only via newPassword + currentPassword (no bare `password` field)
      if (req.body.password && !req.body.newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Use newPassword with currentPassword to change password',
        });
      }

      if (req.body.newPassword) {
        if (!req.body.currentPassword) {
          return res.status(400).json({ success: false, message: 'Current password is required' });
        }
        if (String(req.body.newPassword).length < 6) {
          return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        }
        const withPass = await User.findById(req.user._id).select('+password');
        const match = await bcrypt.compare(req.body.currentPassword, withPass.password);
        if (!match) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(String(req.body.newPassword), salt);
      }

      const updatedUser = await user.save();
      res.json({
        success: true,
        data: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone,
          district: updatedUser.district,
          profilePicture: updatedUser.profilePicture || '',
          profileImage: updatedUser.profilePicture || '',
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
