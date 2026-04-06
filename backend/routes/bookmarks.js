const express   = require('express');
const router    = express.Router();
const Bookmark  = require('../models/Bookmark');
const { protect, requireActive } = require('../middleware/auth');

/* ── GET /api/bookmarks — Get logged-in user's bookmarks ────── */
router.get('/', protect, requireActive, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user._id })
      .populate({ path: 'note', populate: { path: 'uploadedBy', select: 'firstName lastName' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: bookmarks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/bookmarks/:noteId — Toggle bookmark ──────────── */
router.post('/:noteId', protect, requireActive, async (req, res) => {
  try {
    const existing = await Bookmark.findOne({ user: req.user._id, note: req.params.noteId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, bookmarked: false, message: 'Bookmark removed.' });
    }
    await Bookmark.create({ user: req.user._id, note: req.params.noteId });
    res.json({ success: true, bookmarked: true, message: 'Note bookmarked.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/bookmarks/check/:noteId — Check if bookmarked ─── */
router.get('/check/:noteId', protect, async (req, res) => {
  try {
    const bm = await Bookmark.findOne({ user: req.user._id, note: req.params.noteId });
    res.json({ success: true, bookmarked: !!bm });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
