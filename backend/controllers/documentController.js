const Document = require('../models/Document');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find()
      .populate('uploadedBy', 'name role')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: documents.length, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Create new document record
// @route   POST /api/documents
// @access  Private (Admin/Moderator)
exports.createDocument = async (req, res) => {
  try {
    const { title, description, fileUrl, fileSize, category } = req.body;

    const document = await Document.create({
      title,
      description,
      fileUrl,
      fileSize: fileSize || '1.2 MB',
      category: category || 'Other',
      uploadedBy: req.user._id
    });

    const populated = await Document.findById(document._id).populate('uploadedBy', 'name role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update document record
// @route   PUT /api/documents/:id
// @access  Private (Admin/Moderator)
exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const { title, description, fileUrl, fileSize, category } = req.body;
    if (title !== undefined) document.title = title;
    if (description !== undefined) document.description = description;
    if (fileUrl !== undefined) document.fileUrl = fileUrl;
    if (fileSize !== undefined) document.fileSize = fileSize;
    if (category !== undefined) document.category = category;

    await document.save();
    const populated = await Document.findById(document._id).populate('uploadedBy', 'name role');
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete document record
// @route   DELETE /api/documents/:id
// @access  Private (Admin/Moderator)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
