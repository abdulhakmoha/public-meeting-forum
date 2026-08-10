const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');
const { deliverToUsers } = require('../utils/deliverToUsers');

// @desc    Send Email + SMS notification to all citizens about a meeting
// @route   POST /api/notifications/meeting/:id
// @access  Private/Admin
exports.notifyUsersAboutMeeting = async (req, res) => {
  console.log(`🔔 Notification request received for Meeting ID: ${req.params.id}`);
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const users = await User.find({ role: 'citizen' }).select('name email phone');
    const meetingDate = new Date(meeting.date).toLocaleString();
    const meetingDay = new Date(meeting.date).toLocaleDateString();

    // Respond immediately so the browser does not hit Network Error / timeout
    res.status(202).json({
      success: true,
      message: `Sending Email + SMS to ${users.length} citizens now. This continues in the background.`,
      data: { recipients: users.length },
    });

    setImmediate(async () => {
      try {
        const result = await deliverToUsers(users, {
          emailSubject: `Public Meeting - ${meeting.title}`,
          emailText: (user) =>
            `Dear ${user.name},\n\nYou are invited to a public meeting: ${meeting.title}.\nDate: ${meetingDate}\nLocation: ${meeting.location || 'TBA'}\n\nPlease join us.\n\nBest regards,\nPMCFMS Team`,
          emailHtml: (user) => `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #0d9488;">Public Meeting Invitation</h2>
              <p>Dear <strong>${user.name}</strong>,</p>
              <p>You are invited to an upcoming public meeting:</p>
              <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #0d9488; margin: 20px 0;">
                <h3 style="margin-top: 0;">${meeting.title}</h3>
                <p><strong>Date:</strong> ${meetingDate}</p>
                <p><strong>Location:</strong> ${meeting.location || 'TBA'}</p>
              </div>
              <p>Your voice matters. We hope to see you there!</p>
              <p style="font-size: 12px; color: #64748b;">PMCFMS</p>
            </div>
          `,
          smsMessage: `PMCFMS: Meeting "${meeting.title}" on ${meetingDay} at ${meeting.location || 'TBA'}. Please join.`,
          inApp: {
            type: 'meeting_reminder',
            title: `Meeting: ${meeting.title}`,
            message: `You are invited to "${meeting.title}" on ${meetingDate}.`,
            link: `/dashboard/meetings/${meeting._id}`,
          },
        });
        console.log('✅ Meeting notify finished:', result);
      } catch (err) {
        console.error('Background meeting notify failed:', err);
      }
    });
  } catch (error) {
    console.error('Notification Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error sending notifications' });
    }
  }
};

// @desc    Get all notifications for logged in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort('-createdAt')
      .limit(50);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.readAllNotifications = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id }, { isRead: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
