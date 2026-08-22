const Meeting = require('../models/Meeting');
const { isMeetingEnded } = require('../utils/meetingTime');

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Public
exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find().populate('organizer', 'name email role').sort('-date');

    const now = new Date();
    const enriched = meetings.map(m => {
      const obj = m.toObject();
      if (obj.status !== 'cancelled' && obj.status !== 'ongoing') {
        obj.status = isMeetingEnded(obj, now) ? 'completed' : 'upcoming';
      }
      return obj;
    });

    res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single meeting
// @route   GET /api/meetings/:id
// @access  Public
exports.getMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id)
      .populate('organizer', 'name email role')
      .populate('attendees', 'name district');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const obj = meeting.toObject();
    if (obj.status !== 'cancelled' && obj.status !== 'ongoing') {
      obj.status = isMeetingEnded(obj) ? 'completed' : 'upcoming';
    }
    res.status(200).json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new meeting
// @route   POST /api/meetings
// @access  Private (Admin/Moderator)
exports.createMeeting = async (req, res) => {
  try {
    console.log('📅 New meeting request from user:', req.user.id);
    console.log('📦 Data received:', req.body);
    
    // Validate past dates - combine date + startTime then compare
    const meetingDate = new Date(req.body.date);
    if (req.body.startTime) {
      const [h, min] = req.body.startTime.split(':').map(Number);
      // Treat startTime as local time (UTC+3 for Somalia), convert to UTC for comparison
      meetingDate.setUTCHours(h - 3, min, 0, 0); // subtract offset to get UTC
    }
    if (meetingDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot schedule a meeting in the past' });
    }
    
    req.body.organizer = req.user.id;
    
    const meeting = await Meeting.create(req.body);
    // Stable Jitsi room shared by web + mobile
    if (!meeting.roomName) {
      meeting.roomName = `PMCFMS-Meeting-${meeting._id}`;
      await meeting.save();
    }
    // Organizer is automatically an attendee
    if (!meeting.attendees.map(String).includes(String(req.user.id))) {
      meeting.attendees.push(req.user.id);
      await meeting.save();
    }
    console.log('✅ Meeting created successfully:', meeting._id);

    res.status(201).json({
      success: true,
      data: meeting,
      message: 'Meeting created. Email + SMS notifications are being sent to users.',
    });

    setImmediate(async () => {
      try {
        const User = require('../models/User');
        const { deliverToUsers } = require('../utils/deliverToUsers');
        const users = await User.find({}).select('name email phone');
        const meetingDate = new Date(meeting.date).toLocaleString();
        const meetingDay = new Date(meeting.date).toLocaleDateString();
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
                <p><strong>Time:</strong> ${meeting.startTime || ''} – ${meeting.endTime || ''}</p>
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
        console.log('✅ Meeting-create notify finished:', result);
      } catch (err) {
        console.error('Background meeting-create notify failed:', err);
      }
    });
  } catch (error) {
    console.error('❌ Error creating meeting:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Join/RSVP for a meeting
// @route   POST /api/meetings/:id/join
// @access  Private
exports.joinMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Block joining past or cancelled meetings
    if (meeting.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This meeting has been cancelled' });
    }
    if (isMeetingEnded(meeting) && meeting.status !== 'ongoing') {
      return res.status(400).json({ success: false, message: 'This meeting has ended and is no longer accepting RSVPs' });
    }

    // Check if already joined
    if (meeting.attendees.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You have already joined this meeting' });
    }

    meeting.attendees.push(req.user.id);
    await meeting.save();

    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private (Admin only)
exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    await meeting.deleteOne();

    res.status(200).json({ success: true, message: 'Meeting removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update meeting
// @route   PUT /api/meetings/:id
// @access  Private (Admin/Moderator)
exports.updateMeeting = async (req, res) => {
  try {
    let meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    // Check if status is being updated to 'cancelled'
    const isCancelling = req.body.status === 'cancelled' && meeting.status !== 'cancelled';

    // Prevent moving to a past date on update restriction removed per user request

    meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('organizer', 'name email role');

    if (isCancelling) {
      console.log(`📣 Meeting ${meeting._id} cancelled. Sending notifications to all citizens...`);
      try {
        const User = require('../models/User');
        const Notification = require('../models/Notification');
        const sendEmail = require('../utils/sendEmail');
        const sendSMS = require('../utils/sendSMS');

        const citizens = await User.find({ role: 'citizen' });
        
        const notificationPromises = citizens.map(async (citizen) => {
          // 1. Create in-app notification
          await Notification.create({
            recipient: citizen._id,
            type: 'system_alert',
            title: 'Meeting Cancelled',
            message: `The meeting "${meeting.title}" scheduled for ${new Date(meeting.date).toLocaleString()} has been cancelled.`,
            link: `/dashboard/meetings/${meeting._id}`
          });

          // 2. Send Email
          if (citizen.email) {
            try {
              await sendEmail({
                email: citizen.email,
                subject: `Cancelled: Public Meeting - ${meeting.title}`,
                message: `Dear ${citizen.name},\n\nPlease note that the public meeting "${meeting.title}" has been cancelled.\nDate scheduled: ${new Date(meeting.date).toLocaleString()}\n\nBest regards,\nPMCFMS Team`
              });
            } catch (err) {
              console.error(`Error sending cancellation email to ${citizen.email}:`, err.message);
            }
          }

          // 3. Send SMS
          if (citizen.phone) {
            try {
              const smsMessage = `PMCFMS Alert: Meeting "${meeting.title}" on ${new Date(meeting.date).toLocaleDateString()} has been cancelled.`;
              await sendSMS(citizen.phone, smsMessage);
            } catch (err) {
              console.error(`Error sending cancellation SMS to ${citizen.phone}:`, err.message);
            }
          }
        });

        await Promise.all(notificationPromises);
      } catch (err) {
        console.error('Error processing cancellation notifications:', err);
      }
    }

    res.status(200).json({ success: true, data: meeting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
