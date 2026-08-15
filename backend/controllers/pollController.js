const Poll = require('../models/Poll');
const Meeting = require('../models/Meeting');

// @desc    Create a poll
// @route   POST /api/polls
// @access  Private (Admin/Moderator)
exports.createPoll = async (req, res) => {
  try {
    const { meeting, question, options } = req.body;
    console.log('🗳️ New Poll Request:', { meeting, question, options });

    // Check if meeting exists (if provided)
    if (meeting) {
      const meetingExists = await Meeting.findById(meeting);
      if (!meetingExists) {
        console.warn('❌ Meeting not found:', meeting);
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }
    }

    // Prepare options format (ensure we handle both strings and objects)
    const formattedOptions = options.map(opt => {
      const text = typeof opt === 'string' ? opt : (opt.text || '');
      return { text, votes: 0 };
    });

    const poll = await Poll.create({
      meeting,
      question,
      options: formattedOptions,
      creator: req.user._id
    });

    console.log('✅ Poll created:', poll._id);
    res.status(201).json({ success: true, data: poll });
  } catch (error) {
    console.error('❌ Poll Creation Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all polls for a meeting
// @route   GET /api/polls/meeting/:meetingId
// @access  Private
exports.getMeetingPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ meeting: req.params.meetingId }).sort('-createdAt');
    res.json({ success: true, data: polls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get ALL polls across all meetings
// @route   GET /api/polls
// @access  Private
exports.getAllPolls = async (req, res) => {
  try {
    const polls = await Poll.find()
      .populate('meeting', 'title _id')
      .populate('creator', 'name role')
      .sort('-createdAt');
    res.json({ success: true, data: polls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vote in a poll
// @route   PUT /api/polls/:id/vote
// @access  Private
exports.voteInPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (poll.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Poll is closed' });
    }

    // Check if user already voted
    if (poll.voters.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll' });
    }

    const { optionId } = req.body;
    
    // Find option and increment votes
    const option = poll.options.id(optionId);
    if (!option) {
      return res.status(400).json({ success: false, message: 'Invalid option' });
    }

    option.votes += 1;
    poll.voters.push(req.user._id);

    await poll.save();

    res.json({ success: true, data: poll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle poll status
// @route   PUT /api/polls/:id/status
// @access  Private (Admin/Moderator)
exports.togglePollStatus = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    poll.status = poll.status === 'open' ? 'closed' : 'open';
    await poll.save();

    res.json({ success: true, data: poll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete poll
// @route   DELETE /api/polls/:id
// @access  Private (Admin/Moderator)
exports.deletePoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    await poll.deleteOne();
    res.json({ success: true, message: 'Poll removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
