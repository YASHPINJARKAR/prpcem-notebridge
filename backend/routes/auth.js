const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { generateToken, protect } = require('../middleware/auth');
const { sendEmail, forgotPasswordTemplate, welcomeTemplate } = require('../utils/sendEmail');

/* ── Helper ─────────────────────────────────────────────────── */
const generateTempPassword = (len = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

/* ── POST /api/auth/register ────────────────────────────────── */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, department, rollNumber, year, branch, section, phone, enrolmentNo } = req.body;

    if (!firstName || !lastName || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }
    
    // Check existing
    if (role === 'student') {
      if (!rollNumber) return res.status(400).json({ success: false, message: 'Roll Number is required for students.' });
      const existRoll = await User.findOne({ rollNumber });
      if (existRoll) return res.status(400).json({ success: false, message: 'Roll Number already registered.' });
    } else {
      if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Admin role: only 1 admin allowed via registration (or disable this)
    const userStatus = role === 'admin' ? 'active' : 'pending';

    const user = await User.create({
      firstName, lastName, email: email || `student_${rollNumber}@notebridge.local`, password,
      role: role || 'student',
      department: department || '',
      branch: branch || '',
      section: section || '',
      phone: phone || '',
      enrolmentNo: enrolmentNo || '',
      rollNumber: rollNumber || '',
      year: year || '',
      status: userStatus,
    });

    // Send welcome email
    try {
      await sendEmail({
        to:      email,
        subject: '🎓 Welcome to PRPCEM NoteBridge!',
        html:    welcomeTemplate(`${firstName} ${lastName}`, role || 'student'),
      });
    } catch (emailErr) {
      console.warn('Welcome email failed (non-critical):', emailErr.message);
    }

    // Notify admins of new registration
    if (userStatus === 'pending') {
      try {
        const admins = await User.find({ role: 'admin' });
        const notifs = admins.map(admin => ({
          recipient: admin._id,
          type: 'system',
          title: `New Registration Pending 🔔`,
          message: `${firstName} ${lastName} (${role || 'student'}) has registered and is awaiting your approval.`,
        }));
        if (notifs.length > 0) {
          await Notification.insertMany(notifs);
        }
      } catch (notifyErr) {
        console.error('Failed to notify admins:', notifyErr.message);
      }
    }

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: role === 'admin' ? 'Admin account created.' : 'Registration successful!',
      token,
      user: {
        id: user._id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, status: user.status,
        branch: user.branch, section: user.section, rollNumber: user.rollNumber,
        year: user.year, phone: user.phone, enrolmentNo: user.enrolmentNo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/auth/login ───────────────────────────────────── */
router.post('/login', async (req, res) => {
  try {
    const { email, rollNumber, password, role } = req.body;
    let user;

    if (role === 'student') {
      if (!rollNumber || !password) return res.status(400).json({ success: false, message: 'Roll Number and password required.' });
      user = await User.findOne({ rollNumber }).select('+password');
    } else {
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });
      user = await User.findOne({ email }).select('+password');
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact admin.' });
    if (user.status === 'pending')   return res.status(403).json({ success: false, message: 'Your account is pending admin approval.', code: 'PENDING' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, status: user.status,
        department: user.department, branch: user.branch, section: user.section, 
        rollNumber: user.rollNumber, enrolmentNo: user.enrolmentNo, 
        year: user.year, phone: user.phone,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ── POST /api/auth/forgot-password ────────────────────────── */
// Generates a temp password, hashes it, saves to DB, sends via email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal whether email exists
      return res.json({ success: true, message: 'If this email is registered, a temporary password has been sent.' });
    }

    // Generate temp password (plain) → save (pre-save hook will hash it automatically)
    const tempPassword = generateTempPassword(10);
    user.password = tempPassword;
    await user.save({ validateBeforeSave: false });

    // Send email with plain temp password
    await sendEmail({
      to:      email,
      subject: '🔐 PRPCEM NoteBridge – Temporary Password',
      html:    forgotPasswordTemplate(`${user.firstName} ${user.lastName}`, tempPassword, user.role),
    });

    res.json({ success: true, message: 'Temporary password sent to your email address. Please check your inbox.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Failed to send email. Check server email configuration.' });
  }
});

/* ── GET /api/auth/me ───────────────────────────────────────── */
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ── POST /api/auth/change-password ────────────────────────── */
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
