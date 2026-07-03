const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const Note     = require('../models/Note');
const Notification = require('../models/Notification');
const User     = require('../models/User');
const { protect, authorize, requireActive } = require('../middleware/auth');
const { getFileTypeLabel } = require('../middleware/upload');
const { uploadCloudinary, cloudinary } = require('../middleware/cloudinaryUpload');
const { sendEmail, newNoteTemplate } = require('../utils/sendEmail');

/* ── GET /api/notes — List notes with filters ───────────────── */
router.get('/', protect, async (req, res) => {
  try {
    const { subject, teacher, fileType, search, department, year, sortBy, page = 1, limit = 20 } = req.query;
    let query = { status: 'approved' };

    // Build $and conditions array — avoids $or/$and clobbering
    const andConditions = [];

    // Scheduled: only show if releaseAt is in the past
    andConditions.push({
      $or: [{ isScheduled: false }, { isScheduled: true, releaseAt: { $lte: new Date() } }]
    });

    // Section-based filtering for students
    if (req.user && req.user.role === 'student') {
      const studentSection = (req.user.section || '').trim();
      andConditions.push({
        $or: [
          { section: studentSection },
          { section: 'All' },
          { section: '' },
          { section: 'Select All Options' }
        ]
      });
    }

    if (andConditions.length > 0) query.$and = andConditions;

    if (subject)    query.subject    = { $regex: subject, $options: 'i' };
    if (department) query.department = { $regex: department, $options: 'i' };
    if (year)       query.year       = { $regex: year, $options: 'i' };
    if (fileType)   query.fileType   = fileType.toUpperCase();
    if (teacher)    query.uploadedBy = teacher;
    if (search)     query.$text      = { $search: search };

    const sortOptions = {
      newest:    { createdAt: -1 },
      oldest:    { createdAt: 1 },
      mostViewed:{ views: -1 },
      mostDownloaded: { downloads: -1 },
    };
    const sort = sortOptions[sortBy] || { createdAt: -1 };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Note.countDocuments(query);
    const notes = await Note.find(query)
      .populate('uploadedBy', 'firstName lastName email department')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / limit), data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/notes — Upload note (Teacher only) ───────────── */
router.post('/', protect, requireActive, authorize('teacher', 'admin'), uploadCloudinary.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Please upload a file.' });

    const { title, description, subject, department, year, section, tags, isScheduled, releaseAt } = req.body;
    if (!title || !subject) return res.status(400).json({ success: false, message: 'Title and subject are required.' });

    // Normalize section: blank / "Select All Options" → "All"
    const normalizedSection = (!section || section.trim() === '' || section === 'Select All Options') ? 'All' : section.trim();

    const fileType = getFileTypeLabel(req.file.mimetype);
    const note = await Note.create({
      title, description: description || '', subject,
      department: department || 'CSE',
      year: year || '', section: normalizedSection,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      fileName: req.file.originalname,
      filePath: req.file.path, // Cloudinary URL
      fileType,
      fileSize: req.file.size,
      cloudinaryId: req.file.filename, // Cloudinary public ID
      uploadedBy: req.user._id,
      status: (req.user.role === 'teacher' || req.user.role === 'admin') ? 'approved' : 'pending',
      isScheduled: isScheduled === 'true',
      releaseAt: isScheduled === 'true' && releaseAt ? new Date(releaseAt) : null,
    });

    // Notify students — respect section targeting
    if (note.status === 'approved') {
      // Build query: always filter by active students
      const studentQuery = { role: 'student', status: 'active' };
      // If note is for a specific section, only notify that section
      if (normalizedSection !== 'All') {
        studentQuery.section = normalizedSection;
      }
      const students = await User.find(studentQuery).select('_id email');
      const notifications = students.map(s => ({
        recipient: s._id, type: 'new_note',
        title: 'New Note Available!',
        message: `${req.user.firstName} uploaded: ${note.title}${normalizedSection !== 'All' ? ` (${normalizedSection})` : ''}`,
        relatedNote: note._id,
      }));
      if (notifications.length) await Notification.insertMany(notifications);

      // Send email notifications to the targeted students
      const host = process.env.CLIENT_URL || 'http://localhost:5173';
      const link = `${host}/student/dashboard`;
      for (const s of students) {
        if (s.email) {
          try {
            await sendEmail({
              to: s.email,
              subject: `📚 New Note Uploaded: ${note.subject}`,
              html: newNoteTemplate(note.title, note.subject, `${req.user.firstName} ${req.user.lastName}`, link),
            });
          } catch (e) {
            console.warn('Failed sending new note email to:', s.email);
          }
        }
      }
    }

    res.status(201).json({ success: true, data: note, message: note.status === 'approved' ? 'Note published!' : 'Note submitted for admin approval.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/notes/teacher/my — My uploaded notes (Teacher) ── */
router.get('/teacher/my', protect, requireActive, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const notes = await Note.find({ uploadedBy: req.user._id })
      .populate('uploadedBy', 'firstName lastName email department')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/notes/:id — Single note ──────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('uploadedBy', 'firstName lastName email department');
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/notes/:id/view — Increment view count ────────── */
router.post('/:id/view', async (req, res) => {
  try {
    await Note.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/notes/:id/download — Increment download, redirect to Cloudinary */
router.get('/:id/download', protect, requireActive, async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    // Redirect client to Cloudinary URL for direct download
    res.redirect(note.filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/notes/:id/preview — Serve file for preview ────── */
router.get('/:id/preview', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    // Redirect client to Cloudinary URL for preview
    res.redirect(note.filePath);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/notes/:id — Update note ──────────────────────── */
router.put('/:id', protect, requireActive, authorize('teacher', 'admin'), uploadCloudinary.single('file'), async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this note.' });
    }

    const { title, description, subject, tags, versionNote } = req.body;
    if (title)       note.title       = title;
    if (description) note.description = description;
    if (subject)     note.subject     = subject;
    if (tags)        note.tags        = tags.split(',').map(t => t.trim());

    // Simplification: removed versionHistory
    // Handle file replacement on Cloudinary
    if (req.file) {
      if (note.cloudinaryId) {
        try {
          const resourceType = note.fileType === 'Image' ? 'image' : 'raw';
          await cloudinary.uploader.destroy(note.cloudinaryId, { resource_type: resourceType });
        } catch (e) {
          console.warn('Failed to delete old file from Cloudinary:', e.message);
        }
      }
      note.fileName = req.file.originalname;
      note.filePath = req.file.path;
      note.fileType = getFileTypeLabel(req.file.mimetype);
      note.fileSize = req.file.size;
      note.cloudinaryId = req.file.filename;
    }
    
    // Status remains approved if teacher/admin
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      note.status = 'approved';
    } else {
      note.status = 'pending';
    }
    await note.save();
    res.json({ success: true, data: note, message: 'Note updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE /api/notes/:id ──────────────────────────────────── */
router.delete('/:id', protect, requireActive, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this note.' });
    }
    // Delete file from Cloudinary
    if (note.cloudinaryId) {
      try {
        const resourceType = note.fileType === 'Image' ? 'image' : 'raw';
        await cloudinary.uploader.destroy(note.cloudinaryId, { resource_type: resourceType });
      } catch (e) {
        console.warn('Failed to delete file from Cloudinary:', e.message);
      }
    } else if (fs.existsSync(note.filePath)) {
      // Fallback for old local files
      try {
        fs.unlinkSync(note.filePath);
      } catch (e) {
        console.warn('Failed to delete local file:', e.message);
      }
    }
    await note.deleteOne();
    res.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
