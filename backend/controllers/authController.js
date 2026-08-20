const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const sendSMS = require('../utils/sendSMS');

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

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return 'your phone';
  return `***${digits.slice(-4)}`;
}

// @desc    Request password reset code (SMS first — works on Render free tier; email if available)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address' });
    }

    const okMessage =
      'If an account exists, a 6-digit code is on the way. Stay on this computer, read the code on your phone, and type it here.';

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

    const smsReady = sendSMS.isConfigured && sendSMS.isConfigured();
    const emailReady = sendEmail.isEmailConfigured();
    const phone = String(user.phone || '').trim();

    if (!smsReady && !emailReady) {
      user.resetPasswordToken = undefined;
      user.resetPasswordCode = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(503).json({
        message: 'Password reset is not configured on the server. Contact support.',
      });
    }

    const codeForDelivery = resetCode;
    const smsText = `PMCFMS password reset code: ${codeForDelivery}. Valid 1 hour. Type this on the website. Do not share.`;
    let sentViaSms = false;
    let sentViaEmail = false;
    let lastDeliveryError = '';

    if (smsReady && phone) {
      const smsResult = await sendSMS(phone, smsText);
      if (smsResult?.success !== false) {
        sentViaSms = true;
        console.log(`Forgot-password code SMS → ${maskPhone(phone)}`);
      } else {
        lastDeliveryError = String(smsResult?.error || 'SMS send failed');
        console.error('Forgot password SMS failed:', lastDeliveryError);
      }
    }

    if (emailReady) {
      try {
        await sendEmail({
          email: user.email,
          subject: `${codeForDelivery} is your PMCFMS reset code`,
          message: `Your PMCFMS password reset code is: ${codeForDelivery}

Stay on your computer. Type this code on the website.

The code expires in 1 hour. If you did not request this, ignore this email.`,
          html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">
            <h2 style="color:#0d9488;margin:0 0 12px;">Your PMCFMS reset code</h2>
            <p style="font-size:16px;line-height:1.5;">
              You are resetting your password on the <strong>computer website</strong>.
              Look at this code on your phone, then type it on the computer.
            </p>
            <p style="font-size:36px;letter-spacing:8px;font-weight:800;text-align:center;background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 12px;color:#134e4a;">
              ${codeForDelivery}
            </p>
            <p style="font-size:13px;color:#64748b;margin-top:20px;">This code expires in 1 hour.</p>
          </div>
        `,
        });
        sentViaEmail = true;
        console.log(`Forgot-password code emailed to ${user.email}`);
      } catch (mailErr) {
        lastDeliveryError = String(mailErr.message || sendEmail.lastError?.() || 'Email send failed');
        console.error('Forgot password email failed:', lastDeliveryError);
      }
    }

    if (!sentViaSms && !sentViaEmail) {
      user.resetPasswordToken = undefined;
      user.resetPasswordCode = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      if (!phone && smsReady) {
        return res.status(400).json({
          message:
            'This account has no phone number on file. Add your phone in profile or contact support.',
        });
      }

      return res.status(502).json({
        message: lastDeliveryError || 'Could not send the reset code. Try again in a minute.',
      });
    }

    let message = okMessage;
    if (sentViaSms && sentViaEmail) {
      message = `Code sent to your phone (${maskPhone(phone)}) and email. Read it on your phone, type it here on the computer.`;
    } else if (sentViaSms) {
      message = `Code sent to your phone (${maskPhone(phone)}). Check SMS on your phone, then type the 6-digit code here on the computer.`;
    } else {
      message =
        'A 6-digit code was sent to your email. Read it on your phone, then type it here on the computer.';
    }

    return res.json({ message, codeSent: true, channel: sentViaSms ? 'sms' : 'email' });
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

// @desc    Check 6-digit reset code before showing new-password step
// @route   POST /api/auth/verify-reset-code
// @access  Public
exports.verifyResetCode = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').replace(/\D/g, '');

    if (!email || code.length !== 6) {
      return res.status(400).json({ message: 'Enter the 6-digit code from your email' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.resetPasswordCode || !user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' });
    }

    if ((user.resetPasswordAttempts || 0) >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (user.resetPasswordCode !== hashedCode) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ message: 'That code is incorrect. Check your email and try again.' });
    }

    user.resetPasswordAttempts = 0;
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'Code verified. Choose your new password below.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during code verification' });
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
