const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  district: {
    type: String,
    required: [true, 'Please select a district']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Do not return password by default
  },
  role: {
    type: String,
    enum: ['citizen', 'moderator', 'admin'],
    default: 'citizen'
  },
  resetPasswordToken: String,
  resetPasswordCode: String,
  resetPasswordAttempts: {
    type: Number,
    default: 0
  },
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
