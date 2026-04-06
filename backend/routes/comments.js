const express  = require('express');
const router   = express.Router();
const Comment  = require('../models/Comment');
const Note     = require('../models/Note');
const Notification = require('../models/Notification');
const { protect, requireActive } = require('../middleware/auth');

/* ── GET /api/comments/:noteId — Get comments for a note ────── */
router.get('/:noteId', async (req, res) => {
  try {
    const comments = await Comment.find({ note: req.params.noteId, parentId: null })
      .populate('author', 'firstName lastName role department')
      .sort({ createdAt: -1 });

    // Attach replies
    const withReplies = await Promise.all(comments.map(async c => {
      const replies = await Comment.find({ parentId: c._id })
        .populate('author', 'firstName lastName role department')
        .sort({ createdAt: 1 });
      return { ...c.toObject(), replies };
    }));

    res.json({ success: true, data: withReplies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/comments/:noteId — Post comment/doubt ────────── */
router.post('/:noteId', protect, requireActive, async (req, res) => {
  try {
    const { text, type, parentId } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required.' });

    const note = await Note.findById(req.params.noteId).populate('uploadedBy', '_id firstName');
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    const comment = await Comment.create({
      note:     req.params.noteId,
      author:   req.user._id,
      text,
      type:     type || 'comment',
      parentId: parentId || null,
    });

    await comment.populate('author', 'firstName lastName role department');

    // Notify the note's teacher about new doubt/comment
    if (note.uploadedBy._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient:   note.uploadedBy._id,
        type:        'comment',
        title:       type === 'doubt' ? 'New Doubt on Your Note' : 'New Comment on Your Note',
        message:     `${req.user.firstName} ${req.user.lastName}: "${text.substring(0, 80)}..."`,
        relatedNote: note._id,
      });
    }

    // If reply, notify the parent comment author
    if (parentId) {
      const parent = await Comment.findById(parentId).populate('author', '_id');
      if (parent && parent.author._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient:   parent.author._id,
          type:        'doubt_answered',
          title:       'Someone replied to your comment',
          message:     `${req.user.firstName}: "${text.substring(0, 80)}"`,
          relatedNote: note._id,
        });
      }
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE /api/comments/:id ───────────────────────────────── */
router.delete('/:id', protect, requireActive, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment.' });
    }
    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/comments/:id/answered — Mark doubt as answered ── */
router.put('/:id/answered', protect, requireActive, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { isAnswered: true }, { new: true });
    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
