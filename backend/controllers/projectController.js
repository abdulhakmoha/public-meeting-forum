const Project = require('../models/Project');
const {
  resolveProjectTransition,
  progressForProjectStatus
} = require('../utils/statusWorkflow');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('creator', 'name role')
      .sort('-createdAt');
    res.status(200).json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name role')
      .populate('comments.author', 'name role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin/Moderator)
exports.createProject = async (req, res) => {
  try {
    const { title, description, budget, location, imageUrl } = req.body;

    // Audit: new projects always start at Planning (no status skip on create)
    const project = await Project.create({
      title,
      description,
      status: 'Planning',
      budget,
      progress: 0,
      location,
      imageUrl: imageUrl || '',
      creator: req.user._id
    });

    const populated = await Project.findById(project._id).populate('creator', 'name role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin/Moderator)
exports.updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const body = { ...req.body };

    if (body.status || body.action === 'advance') {
      const requested = body.action === 'advance' || body.status === 'advance'
        ? 'advance'
        : body.status;
      const transition = resolveProjectTransition(project.status, requested);
      if (!transition.ok) {
        return res.status(400).json({ success: false, message: transition.message });
      }
      body.status = transition.next;
      body.progress = progressForProjectStatus(transition.next);
    }

    project = await Project.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true
    }).populate('creator', 'name role');

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to project
// @route   POST /api/projects/:id/comments
// @access  Private
exports.addProjectComment = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    project.comments.push({
      author: req.user._id,
      authorName: req.user.name,
      text
    });

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('creator', 'name role')
      .populate('comments.author', 'name role');

    res.status(201).json({ success: true, data: updatedProject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin/Moderator)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add progress photo to project
// @route   POST /api/projects/:id/photos
// @access  Private (Admin/Moderator)
exports.addProjectPhoto = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { url, status } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Photo URL is required' });
    }

    const photoStatus = status || 'In Progress';

    // Audit: photo stage must match current or next status only
    if (photoStatus === 'In Progress') {
      if (project.status === 'Completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot add In Progress files to a Completed project'
        });
      }
      if (project.status === 'Planning') {
        const transition = resolveProjectTransition(project.status, 'In Progress');
        if (!transition.ok) {
          return res.status(400).json({ success: false, message: transition.message });
        }
        project.status = transition.next;
        project.progress = progressForProjectStatus(transition.next);
      }
    } else if (photoStatus === 'Completed') {
      if (project.status === 'Planning') {
        return res.status(400).json({
          success: false,
          message: 'Audit order: move to In Progress before Completed'
        });
      }
      if (project.status === 'In Progress') {
        const transition = resolveProjectTransition(project.status, 'Completed');
        if (!transition.ok) {
          return res.status(400).json({ success: false, message: transition.message });
        }
        project.status = transition.next;
        project.progress = progressForProjectStatus(transition.next);
      }
    }

    project.progressImages.push({ url, status: photoStatus });
    await project.save();

    const populated = await Project.findById(project._id)
      .populate('creator', 'name role')
      .populate('comments.author', 'name role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
