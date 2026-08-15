const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

let bucket = null;

function getBucket() {
  if (bucket) return bucket;
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB not connected — cannot use media store');
  }
  bucket = new GridFSBucket(db, { bucketName: 'uploads' });
  return bucket;
}

/** Save a multer memory file into MongoDB GridFS (survives Render restarts). */
async function saveUploadFile(file) {
  const b = getBucket();
  const filename = `${Date.now()}-${(file.originalname || 'file').replace(/[^\w.\-]+/g, '_')}`;

  return new Promise((resolve, reject) => {
    const uploadStream = b.openUploadStream(filename, {
      contentType: file.mimetype || 'application/octet-stream',
      metadata: {
        originalName: file.originalname || '',
        size: file.size || 0,
      },
    });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      const id = uploadStream.id.toString();
      resolve({
        id,
        filename,
        // Public URL path — served by GET /uploads/:id
        fileUrl: `/uploads/${id}`,
        mimetype: file.mimetype,
        size: file.size,
      });
    });

    uploadStream.end(file.buffer);
  });
}

async function saveMany(files = []) {
  const out = [];
  for (const f of files) {
    out.push(await saveUploadFile(f));
  }
  return out;
}

function isObjectIdString(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

async function openDownloadById(id) {
  const b = getBucket();
  const _id = new mongoose.Types.ObjectId(id);
  const files = await b.find({ _id }).toArray();
  if (!files.length) return null;
  return {
    file: files[0],
    stream: b.openDownloadStream(_id),
  };
}

module.exports = {
  getBucket,
  saveUploadFile,
  saveMany,
  isObjectIdString,
  openDownloadById,
};
