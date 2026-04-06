const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:    { type: String, enum: ['new_note','comment','doubt_answered','note_approved','note_rejected','user_approved','system'], default: 'system' },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String, default: '#' },
  isRead:  { type: Boolean, default: false },
  relatedNote: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
