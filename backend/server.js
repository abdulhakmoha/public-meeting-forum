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

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
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
});
