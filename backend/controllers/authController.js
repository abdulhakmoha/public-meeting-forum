const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const findUserByEmail = async (email, extraSelect = '') => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  // Exact match on normalized form, then case-insensitive for legacy mixed-case emails
  let q = User.findOne({ email: normalized });
  if (extraSelect) q = q.select(extraSelect);
  let user = await q;
  if (user) return user;
  q = User.findOne({ email: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
  if (extraSelect) q = q.select(extraSelect);
  return q;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, phone, district, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const userExists = await findUserByEmail(email);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash only after plaintext validation (schema minlength would otherwise check the hash)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(password), salt);

    const user = await User.create({
      name,
      email,
      phone,
      district,
      password: hashedPassword,
      role: 'citizen',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        district: user.district,
        profilePicture: user.profilePicture || '',
        profileImage: user.profilePicture || '',
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = await findUserByEmail(email, '+password');

    if (!user) {
      return res.status(401).json({ message: 'Login failed: Incorrect email or password.' });
    }

    // Normalize legacy mixed-case emails on successful login
    if (user.email !== email) {
      user.email = email;
      await user.save({ validateBeforeSave: false });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        district: user.district,
        profilePicture: user.profilePicture || '',
        profileImage: user.profilePicture || '',
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Login failed: Incorrect email or password.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Request password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address' });
    }

    const okMessage =
      'A 6-digit code is on the way. Stay on this computer. Wait a few seconds, read the code from your phone email, and type it here. Do not tap the email.';

    const user = await findUserByEmail(email);
    if (!user) {
      return res.json({ message: okMessage, codeSent: true });
    }

    if (user.email !== email) {
      user.email = email;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetCode = String(crypto.randomInt(100000, 1000000));
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordCode = crypto.createHash('sha256').update(resetCode).digest('hex');
    user.resetPasswordAttempts = 0;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const smtpReady = sendEmail.isSmtpConfigured();
    if (!smtpReady) {
      console.error('Forgot-password blocked: SMTP_HOST / SMTP_EMAIL / SMTP_PASSWORD not set on server');
      user.resetPasswordToken = undefined;
      user.resetPasswordCode = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(503).json({
        message:
          'Email service is not configured on the server. Ask an admin to set SMTP_HOST, SMTP_EMAIL, and SMTP_PASSWORD (Gmail App Password).',
      });
    }

    res.json({ message: okMessage, codeSent: true });

    const toEmail = user.email;
    const codeForMail = resetCode;
    setImmediate(async () => {
      try {
        await sendEmail({
          email: toEmail,
          subject: `${codeForMail} is your PMCFMS reset code`,
          message: `Your PMCFMS password reset code is: ${codeForMail}

Stay on your computer. Type this code on the website. Do NOT tap any link on your phone.

The code expires in 1 hour. If you did not request this, ignore this email.`,
          html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <h2 style="color:#0d9488;margin:0 0 12px;">Your PMCFMS reset code</h2>
            <p style="font-size:16px;line-height:1.5;">
              You are resetting your password on the <strong>computer website</strong>.
              Look at this code on your phone, then go back to the computer and type it there.
            </p>
            <p style="font-size:16px;font-weight:700;color:#b45309;margin:8px 0 20px;">
              Do not tap a link on your phone. Do not open this in the phone browser.
            </p>
            <p style="font-size:36px;letter-spacing:8px;font-weight:800;text-align:center;background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 12px;color:#134e4a;">
              ${codeForMail}
            </p>
            <p style="font-size:13px;color:#64748b;margin-top:20px;">This code expires in 1 hour. If you did not request a reset, ignore this email.</p>
          </div>
        `,
        });
        console.log(`Forgot-password code emailed to ${toEmail}`);
      } catch (mailErr) {
        console.error('Forgot password email failed:', mailErr.message || mailErr);
      }
    });
    return;
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error during password reset request' });
    }
  }
};

// @desc    Reset password with token from email
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(password), salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordExpire = undefined;
    // Ensure email stays normalized
    user.email = normalizeEmail(user.email);
    await user.save();

    res.json({ message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// @desc    Reset password with 6-digit code (stay on computer website)
// @route   POST /api/auth/reset-with-code
// @access  Public
exports.resetWithCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').replace(/\D/g, '');
    const { password } = req.body;

    if (!email || code.length !== 6) {
      return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await findUserByEmail(email, '+password');
    if (!user || !user.resetPasswordCode || !user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one on this page.' });
    }

    if ((user.resetPasswordAttempts || 0) >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (user.resetPasswordCode !== hashedCode) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ message: 'That code is incorrect. Check the email and try again.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(password), salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordCode = undefined;
    user.resetPasswordAttempts = 0;
    user.resetPasswordExpire = undefined;
    user.email = normalizeEmail(user.email);
    await user.save();

    res.json({ message: 'Password updated successfully. You can sign in now.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

// @desc    Current user (session check)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        district: user.district,
        profilePicture: user.profilePicture || '',
        profileImage: user.profilePicture || '',
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
