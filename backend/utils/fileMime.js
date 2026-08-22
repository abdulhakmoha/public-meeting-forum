const path = require('path');

const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function mimeFromName(name = '') {
  const ext = path.extname(String(name)).toLowerCase();
  return EXT_MIME[ext] || '';
}

function sniffBuffer(buf) {
  if (!buf || buf.length < 5) return '';
  if (buf.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.length > 11 && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return '';
}

function resolveUploadMime(file) {
  const declared = String(file.mimetype || '').trim();
  if (declared && declared !== 'application/octet-stream' && declared !== 'binary/octet-stream') {
    return declared;
  }
  return mimeFromName(file.originalname) || sniffBuffer(file.buffer) || declared || 'application/octet-stream';
}

function resolveStoredMime(gridFile, peekBuf) {
  const stored = String(gridFile.contentType || '').trim();
  if (stored && stored !== 'application/octet-stream' && stored !== 'binary/octet-stream') {
    return stored;
  }
  const original = gridFile.metadata?.originalName || gridFile.filename || '';
  return mimeFromName(original) || sniffBuffer(peekBuf) || stored || 'application/octet-stream';
}

function displayFilename(gridFile) {
  const original = String(gridFile.metadata?.originalName || '').trim();
  if (original) return original.replace(/"/g, '');
  return String(gridFile.filename || 'file').replace(/"/g, '');
}

function isOfficeMime(mime) {
  const m = String(mime || '').toLowerCase();
  return (
    m.includes('officedocument') ||
    m.includes('msword') ||
    m.includes('ms-excel') ||
    m.includes('ms-powerpoint')
  );
}

function isImageMime(mime) {
  return String(mime || '').toLowerCase().startsWith('image/');
}

function isPdfMime(mime) {
  return String(mime || '').toLowerCase().includes('pdf');
}

module.exports = {
  resolveUploadMime,
  resolveStoredMime,
  displayFilename,
  isOfficeMime,
  isImageMime,
  isPdfMime,
  sniffBuffer,
};
