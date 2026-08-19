const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const { getResetPasswordUrl } = require('../utils/frontendUrl');

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
      'If an account exists for that email, a reset link was sent. Open the email and click the link in any web browser (computer or phone). You do not need the mobile app.';

    const user = await findUserByEmail(email);
    if (!user) {
      // Same response timing/shape — do not reveal whether email exists
      return res.json({ message: okMessage });
    }

    // Keep stored email lowercase going forward
    if (user.email !== email) {
      user.email = email;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = getResetPasswordUrl(resetToken);

    const smtpReady = sendEmail.isSmtpConfigured();
    if (!smtpReady) {
      console.error('Forgot-password blocked: SMTP_HOST / SMTP_EMAIL / SMTP_PASSWORD not set on server');
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(503).json({
        message:
          'Email service is not configured on the server. Ask an admin to set SMTP_HOST, SMTP_EMAIL, and SMTP_PASSWORD (Gmail App Password).',
      });
    }

    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset your PMCFMS password',
        message: `You requested a password reset for PMCFMS.

Open this website link in any browser (computer or phone). You do not need the mobile app:

${resetUrl}

The page will ask you to choose a new password. The link expires in 1 hour.

If you did not request this, ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <h2 style="color:#0d9488;margin:0 0 16px;">Reset your PMCFMS password</h2>
            <p>Click the button below. It opens the <strong>PMCFMS website</strong> in your browser (computer or phone). You do not need the mobile app.</p>
            <p style="margin:28px 0;">
              <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 24px;background:#0D9488;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
                Open website and set new password
              </a>
            </p>
            <p style="font-size:14px;color:#334155;">If the button does not work, copy this link into Chrome or any browser:</p>
            <p style="font-size:13px;word-break:break-all;"><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a></p>
            <p style="font-size:13px;color:#64748b;">This link expires in 1 hour. If you did not request a reset, you can ignore this email.</p>
          </div>
        `,
      });
      console.log(`Forgot-password email sent to ${user.email}`);
      return res.json({ message: okMessage });
    } catch (mailErr) {
      console.error('Forgot password email failed:', mailErr.message || mailErr);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(502).json({
        message:
          'Could not send the reset email. Check SMTP settings (Gmail needs an App Password) and try again.',
      });
    }
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
