const Forum = require('../models/Forum');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all forums
// @route   GET /api/forums
// @access  Public
exports.getForums = async (req, res) => {
  try {
    let query;

    // If user is admin/moderator, show all. If citizen/public, show only approved.
    if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
      query = Forum.find();
    } else {
      query = Forum.find({ isApproved: true });
    }

    const forums = await query.populate('author', 'name role').sort('-createdAt');
    res.status(200).json({ success: true, count: forums.length, data: forums });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single forum with comments
// @route   GET /api/forums/:id
// @access  Public
exports.getForum = async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id).populate('author', 'name role');

    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    // Citizens can only view approved forums
    if (!forum.isApproved && (!req.user || req.user.role === 'citizen')) {
      return res.status(403).json({ success: false, message: 'This forum is pending approval' });
    }

    const comments = await Comment.find({ forum: forum._id }).populate('author', 'name').sort('createdAt');

    res.status(200).json({ success: true, data: forum, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new forum
// @route   POST /api/forums
// @access  Private
exports.createForum = async (req, res) => {
  try {
    const isStaff = req.user.role === 'admin' || req.user.role === 'moderator';
    const { saveMany } = require('../utils/mediaStore');
    let images = [];
    if (req.files && req.files.length) {
      const saved = await saveMany(req.files);
      images = saved.map((s) => s.fileUrl);
    }

    // Whitelist fields — never trust client isApproved / author / votes
    const forum = await Forum.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'General',
      images,
      author: req.user.id,
      isApproved: isStaff,
      status: 'open',
    });

    res.status(201).json({ success: true, data: forum });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Approve a forum
// @route   PUT /api/forums/:id/approve
// @access  Private (Admin/Moderator)
exports.approveForum = async (req, res) => {
  try {
    let forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    forum.isApproved = true;
    await forum.save();

    // Notify author
    await Notification.create({
      recipient: forum.author,
      type: 'forum_approved',
      title: 'Discussion Approved',
      message: `Your discussion topic "${forum.title}" has been approved and is now live.`,
      link: `/dashboard/forums/${forum._id}`
    });

    // Send Email
    const author = await User.findById(forum.author);
    if (author && author.email) {
      await sendEmail({
        email: author.email,
        subject: 'PMCFMS: Discussion Approved',
        message: `Your discussion topic "${forum.title}" has been approved and is now live. View it here: http://localhost:3000/dashboard/forums/${forum._id}`
      });
    }

    res.status(200).json({ success: true, data: forum });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add a comment to a forum
// @route   POST /api/forums/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    if (!forum.isApproved) {
      return res.status(400).json({ success: false, message: 'Cannot comment on an unapproved forum' });
    }

    const comment = await Comment.create({
      text: req.body.text,
      author: req.user.id,
      forum: req.params.id
    });

    // Notify forum author if it's not the same person
    if (forum.author.toString() !== req.user.id.toString()) {
      await Notification.create({
        recipient: forum.author,
        sender: req.user.id,
        type: 'new_comment',
        title: 'New Response',
        message: `${req.user.name} responded to your discussion: "${forum.title}"`,
        link: `/dashboard/forums/${forum._id}`
      });

      // Send Email
      const author = await User.findById(forum.author);
      if (author && author.email) {
        await sendEmail({
          email: author.email,
          subject: 'PMCFMS: New Response to your Topic',
          message: `${req.user.name} responded to your discussion: "${forum.title}". View it here: http://localhost:3000/dashboard/forums/${forum._id}`
        });
      }
    }

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete/Reject a forum
// @route   DELETE /api/forums/:id
// @access  Private (Admin/Moderator)
exports.deleteForum = async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    await Forum.findByIdAndDelete(req.params.id);
    
    // Also delete associated comments
    await Comment.deleteMany({ forum: req.params.id });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Upvote a forum
// @route   PUT /api/forums/:id/upvote
// @access  Private
exports.upvoteForum = async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    // Check if already upvoted
    if (forum.upvotes.includes(req.user.id)) {
      // Remove upvote (toggle)
      forum.upvotes = forum.upvotes.filter(id => id.toString() !== req.user.id.toString());
    } else {
      // Add upvote and remove from downvotes if exists
      forum.upvotes.push(req.user.id);
      forum.downvotes = forum.downvotes.filter(id => id.toString() !== req.user.id.toString());
    }

    await forum.save();
    res.status(200).json({ success: true, data: forum });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Downvote a forum
// @route   PUT /api/forums/:id/downvote
// @access  Private
exports.downvoteForum = async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id);

    if (!forum) {
      return res.status(404).json({ success: false, message: 'Forum not found' });
    }

    // Check if already downvoted
    if (forum.downvotes.includes(req.user.id)) {
      // Remove downvote (toggle)
      forum.downvotes = forum.downvotes.filter(id => id.toString() !== req.user.id.toString());
    } else {
      // Add downvote and remove from upvotes if exists
      forum.downvotes.push(req.user.id);
      forum.upvotes = forum.upvotes.filter(id => id.toString() !== req.user.id.toString());
    }

    await forum.save();
    res.status(200).json({ success: true, data: forum });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
