const multer = require('multer');
const path = require('path');

const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.pdf',
  '.doc', '.docx',
  '.ppt', '.pptx',
  '.xls', '.xlsx',
  '.txt', '.csv',
]);

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf', 'application/x-pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/csv',
]);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'application/pdf': '.pdf',
  'application/x-pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/csv': '.csv',
};

function resolveExt(file) {
  const fromName = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_EXT.has(fromName)) return fromName;
  const fromMime = MIME_TO_EXT[file.mimetype];
  if (fromMime && ALLOWED_EXT.has(fromMime)) return fromMime;
  return '';
}

// Memory storage → MongoDB GridFS (persistent). Local disk on Render is wiped on redeploy.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = resolveExt(file);
  const mimeOk = ALLOWED_MIME.has(file.mimetype) || (file.mimetype || '').startsWith('image/');
  if (ext && mimeOk) {
    return cb(null, true);
  }
  if (ext === '.pdf') {
    return cb(null, true);
  }
  cb(new Error('File type not allowed. Use images, PDF, Office docs, or CSV/TXT.'));
}

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;
