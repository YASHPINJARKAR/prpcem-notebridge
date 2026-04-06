const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  note:      { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true, trim: true },
  type:      { type: String, enum: ['comment', 'doubt'], default: 'comment' },
  parentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // for replies
  isAnswered:{ type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Comment', CommentSchema);
