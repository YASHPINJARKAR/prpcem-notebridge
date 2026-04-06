const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName:  { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:   { type: String, required: true, minlength: 6, select: false },
  role:       { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },

  // Profile
  department:  { type: String, default: '' },
  branch:      { type: String, default: '' },
  section:     { type: String, default: '' },
  rollNumber:  { type: String, default: '' },
  enrolmentNo: { type: String, default: '' },
  year:        { type: String, default: '' },
  phone:       { type: String, default: '' },
  subject:     { type: String, default: '' },   // teachers only

  // Status
  status:     { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  isVerified: { type: Boolean, default: false },

  // Metadata
  avatar:     { type: String, default: '' },
  lastLogin:  { type: Date },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Virtual: full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', UserSchema);
