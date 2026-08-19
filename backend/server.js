const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');

// Load env vars
dotenv.config();

const app = express();

// Manual CORS middleware - must be FIRST before everything
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  // Allow github.io (GitHub Pages), vercel.app, localhost, and local network (192.168.x.x)
  if (
    origin.includes('github.io') ||
    origin.includes('vercel.app') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('192.168.') ||
    origin.includes('10.')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  // Immediately respond to preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Set static folder + ensure uploads dir exists (legacy local files only)
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(express.static(path.join(__dirname, 'public')));

// Persistent media from MongoDB GridFS (and fallback to local disk for old files)
const { isObjectIdString, openDownloadById } = require('./utils/mediaStore');
app.get('/uploads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isObjectIdString(id)) {
      const found = await openDownloadById(id);
      if (!found) {
        return res.status(404).json({ message: 'File not found' });
      }
      const { file, stream } = found;
      if (file.contentType) res.setHeader('Content-Type', file.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (file.filename) {
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
      }
      stream.on('error', () => {
        if (!res.headersSent) res.status(404).end();
      });
      return stream.pipe(res);
    }

    // Legacy disk filename (pre-GridFS) — may be gone after Render redeploy
    const safe = path.basename(id);
    const diskPath = path.join(uploadsDir, safe);
    if (fs.existsSync(diskPath)) {
      return res.sendFile(diskPath);
    }
    return res.status(404).json({
      message: 'File not found. Older uploads may have been lost on server restart; re-upload the file.',
    });
  } catch (err) {
    console.error('Media serve error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Could not serve file' });
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected (uploads stored in GridFS — persistent)'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
const { getResetPasswordUrl } = require('./utils/frontendUrl');

app.get('/reset-password/:token', (req, res) => {
  res.redirect(302, getResetPasswordUrl(req.params.token));
});

app.get('/api/health', (req, res) => {
  const sendEmail = require('./utils/sendEmail');
  res.json({ ok: true, smtp: sendEmail.isSmtpConfigured() });
});

app.use('/api/auth', authRoutes);
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/forums', require('./routes/forumRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/quick-search', require('./routes/searchRoutes'));
app.use('/api/polls', require('./routes/pollRoutes'));
app.use('/api/announcements', require('./routes/announcementRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/issues', require('./routes/issueRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('PMCFMS Backend is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  const sendEmail = require('./utils/sendEmail');
  sendEmail.verifySmtp().catch(() => {});
});
