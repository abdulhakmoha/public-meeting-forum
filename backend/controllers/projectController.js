const Project = require('../models/Project');

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
    const { title, description, status, budget, location, imageUrl } = req.body;

    const projectStatus = status || 'Planning';
    let progress = 0;
    if (projectStatus === 'In Progress') progress = 50;
    if (projectStatus === 'Completed') progress = 100;

    const project = await Project.create({
      title,
      description,
      status: projectStatus,
      budget,
      progress,
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

    if (req.body.status) {
      if (req.body.status === 'Planning') req.body.progress = 0;
      if (req.body.status === 'In Progress') req.body.progress = 50;
      if (req.body.status === 'Completed') req.body.progress = 100;
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
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
    console.log('[addProjectPhoto] url:', url, 'status:', status);
    if (!url) {
      return res.status(400).json({ success: false, message: 'Photo URL is required' });
    }

    const imageData = { url };
    if (status) {
      imageData.status = status;
      if (status === 'In Progress') {
        project.status = 'In Progress';
        project.progress = 50;
      } else if (status === 'Completed') {
        project.status = 'Completed';
        project.progress = 100;
      }
    }

    console.log('[addProjectPhoto] imageData:', imageData);
    project.progressImages.push(imageData);
    await project.save();
    console.log('[addProjectPhoto] saved progressImages:', project.progressImages.map(p => ({ url: p.url, status: p.status })));

    const populated = await Project.findById(project._id)
      .populate('creator', 'name role')
      .populate('comments.author', 'name role');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
