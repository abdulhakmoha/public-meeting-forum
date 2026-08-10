const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { deliverToUsers } = require('../utils/deliverToUsers');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('creator', 'name role')
      .sort('-date');
    res.status(200).json({ success: true, count: announcements.length, data: announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Create new announcement (+ Email & SMS to all users)
// @route   POST /api/announcements
// @access  Private (Admin/Moderator)
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, category, date } = req.body;

    if (date) {
      const chosen = new Date(date);
      if (Number.isNaN(chosen.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date' });
      }
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (chosen < startOfToday) {
        return res.status(400).json({ success: false, message: 'Past dates are not allowed' });
      }
    }

    const announcement = await Announcement.create({
      title,
      content,
      category,
      date: date || Date.now(),
      creator: req.user._id,
    });

    const populated = await Announcement.findById(announcement._id).populate('creator', 'name role');

    // Return UI success immediately, then notify in background
    res.status(201).json({
      success: true,
      data: populated,
      message: 'Announcement published. Email + SMS notifications are being sent to users.',
    });

    setImmediate(async () => {
      try {
        const users = await User.find({}).select('name email phone');
        const shortContent = String(content || '').slice(0, 120);
        const result = await deliverToUsers(users, {
          emailSubject: `New Announcement: ${title}`,
          emailText: (u) =>
            `Hello ${u.name},\n\nA new announcement has been posted:\n\nTitle: ${title}\nCategory: ${category}\nContent:\n${content}\n\nBest regards,\nPMCFMS Team`,
          emailHtml: (u) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">New Public Announcement</h2>
              <p>Hello <strong>${u.name}</strong>,</p>
              <p>A new announcement has been posted on PMCFMS:</p>
              <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1e293b;">${title}</h3>
                <p style="font-size: 12px; color: #64748b; font-weight: bold; text-transform: uppercase;">Category: ${category}</p>
                <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${content}</p>
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; text-align: center;">Automated message from PMCFMS</p>
            </div>
          `,
          smsMessage: `PMCFMS Announcement: ${title}. ${shortContent}${String(content || '').length > 120 ? '…' : ''}`,
          inApp: {
            type: 'system_alert',
            title: `Announcement: ${title}`,
            message: shortContent || title,
            link: '/dashboard/announcements',
          },
        });
        console.log('✅ Announcement notify finished:', result);
      } catch (err) {
        console.error('Background announcement notify failed:', err);
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/Moderator)
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
