const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Note     = require('../models/Note');
const Comment  = require('../models/Comment');
const Bookmark = require('../models/Bookmark');
const Notification = require('../models/Notification');
const { protect, authorize, requireActive } = require('../middleware/auth');
const { sendEmail, approvalTemplate } = require('../utils/sendEmail');

const isAdmin = [protect, authorize('admin')];

/* ── GET /api/admin/stats — System dashboard stats ──────────── */
router.get('/stats', ...isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalNotes, totalComments, totalBookmarks,
           pendingUsers, pendingNotes, approvedNotes,
           students, teachers] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Comment.countDocuments(),
      Bookmark.countDocuments(),
      User.countDocuments({ status: 'pending' }),
      Note.countDocuments({ status: 'pending' }),
      Note.countDocuments({ status: 'approved' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
    ]);

    // Aggregate total views & downloads
    const stats = await Note.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalDownloads: { $sum: '$downloads' } } }
    ]);
    const viewDownloads = stats[0] || { totalViews: 0, totalDownloads: 0 };

    // Notes by department
    const byDept = await Note.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$department', count: { $sum: 1 }, views: { $sum: '$views' } } },
      { $sort: { views: -1 } },
    ]);

    // Top 5 notes by views
    const topNotes = await Note.find({ status: 'approved' })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ views: -1 }).limit(5).select('title subject views downloads');

    res.json({
      success: true,
      data: {
        totalUsers, students, teachers,
        totalNotes, approvedNotes, pendingNotes,
        pendingUsers,
        totalComments, totalBookmarks,
        totalViews:     viewDownloads.totalViews,
        totalDownloads: viewDownloads.totalDownloads,
        byDept, topNotes,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/admin/users — All users ───────────────────────── */
router.get('/users', ...isAdmin, async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status) query.status = status;
    if (role)   query.role   = role;
    if (search) query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName:  { $regex: search, $options: 'i' } },
      { email:     { $regex: search, $options: 'i' } },
    ];
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    res.json({ success: true, total, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/admin/users/:id/approve ───────────────────────── */
router.put('/users/:id/approve', ...isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    try {
      await sendEmail({
        to: user.email,
        subject: '✅ Your PRPCEM NoteBridge Account is Approved!',
        html: approvalTemplate(`${user.firstName} ${user.lastName}`),
      });
    } catch (e) { console.warn('Approval email failed:', e.message); }
    res.json({ success: true, data: user, message: `${user.firstName} approved. Email sent.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/admin/users/:id/reject ────────────────────────── */
router.put('/users/:id/reject', ...isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, message: `${user.firstName} has been rejected/suspended.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── GET /api/admin/notes/pending ───────────────────────────── */
router.get('/notes/pending', ...isAdmin, async (req, res) => {
  try {
    const notes = await Note.find({ status: 'pending' })
      .populate('uploadedBy', 'firstName lastName email department')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/admin/notes/:id/approve ───────────────────────── */
router.put('/notes/:id/approve', ...isAdmin, async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true })
      .populate('uploadedBy', 'firstName lastName _id');
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    // Notify teacher
    await Notification.create({
      recipient:   note.uploadedBy._id,
      type:        'note_approved',
      title:       '✅ Note Approved!',
      message:     `Your note "${note.title}" has been approved and is now visible to students.`,
      relatedNote: note._id,
    });

    res.json({ success: true, data: note, message: 'Note approved and published.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── PUT /api/admin/notes/:id/reject ────────────────────────── */
router.put('/notes/:id/reject', ...isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const note = await Note.findByIdAndUpdate(req.params.id,
      { status: 'rejected', rejectionReason: reason || 'Does not meet content guidelines.' },
      { new: true }
    ).populate('uploadedBy', 'firstName _id');
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    await Notification.create({
      recipient:   note.uploadedBy._id,
      type:        'note_rejected',
      title:       '❌ Note Rejected',
      message:     `Your note "${note.title}" was rejected. Reason: ${reason || 'Content guidelines not met.'}`,
      relatedNote: note._id,
    });

    res.json({ success: true, message: 'Note rejected. Teacher notified.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE /api/admin/notes/:id ────────────────────────────── */
router.delete('/notes/:id', ...isAdmin, async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    res.json({ success: true, message: 'Note deleted by admin.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
