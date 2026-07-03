const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subject:     { type: String, required: true },
  department:  { type: String, default: 'CSE' },
  year:        { type: String, default: '' },   // e.g. "TE – Sem 5"
  section:     { type: String, default: 'All' },
  tags:        [{ type: String }],

  // File info
  fileName:    { type: String, required: true },
  filePath:    { type: String, required: true },
  fileType:    { type: String },          // PDF, PPT, DOC, etc.
  fileSize:    { type: Number, default: 0 },
  cloudinaryId:{ type: String, default: '' },


  // Upload info
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Status / approval
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: '' },

  // Scheduled release
  isScheduled:  { type: Boolean, default: false },
  releaseAt:    { type: Date },

  // Stats
  views:        { type: Number, default: 0 },
  downloads:    { type: Number, default: 0 },

  // Version control
  version:      { type: Number, default: 1 },
  versionHistory: [{
    version:    Number,
    fileName:   String,
    filePath:   String,
    updatedAt:  { type: Date, default: Date.now },
    note:       String,
  }],
}, { timestamps: true });

// Text search index
NoteSchema.index({ title: 'text', subject: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Note', NoteSchema);
