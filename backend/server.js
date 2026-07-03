const express     = require('express');
const dotenv      = require('dotenv');
const cors        = require('cors');
const helmet      = require('helmet');
const path        = require('path');
const rateLimit   = require('express-rate-limit');
const connectDB   = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

/* ── Security Middleware ────────────────────────────────────── */
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limiting – 100 req per 15 min per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { success: false, message: 'Too many requests, please try again later.' } });
app.use('/api/', limiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

/* ── CORS ───────────────────────────────────────────────────── */
// Allow all configured origins (supports multiple CLIENT_URL entries comma-separated)
const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(u => u.trim()) : []),
  'http://localhost:3000',
  'http://localhost:3500',
  'http://localhost:5173',
  'http://127.0.0.1:3500',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5500',
  'null',                     // file:// origin for direct open
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. Postman, curl) or from allowed list
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any *.onrender.com subdomain for Render deployments
    if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ── Body Parsers ───────────────────────────────────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── Serve uploaded files statically ───────────────────────── */
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

/* ── API Routes ─────────────────────────────────────────────── */
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/notes',         require('./routes/notes'));
app.use('/api/comments',      require('./routes/comments'));
app.use('/api/bookmarks',     require('./routes/bookmarks'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin',         require('./routes/admin'));

/* ── Health Check ───────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🚀 PRPCEM NoteBridge API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'MongoDB Connected',
  });
});

/* ── Test Email Endpoint ────────────────────────────────────── */
app.get('/api/email/test', async (req, res) => {
  const { to } = req.query;
  if (!to) {
    return res.status(400).json({ success: false, message: 'Please specify "to" query parameter.' });
  }
  try {
    const { sendEmail } = require('./utils/sendEmail');
    await sendEmail({
      to,
      subject: '🧪 PRPCEM NoteBridge Email Test',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 500px; margin: auto;">
          <h2 style="color: #3b82f6;">🧪 Email Integration Test</h2>
          <p>This email verifies that your SMTP config in your <code>.env</code> file is working perfectly!</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 0.85rem; color: #64748b;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });
    res.json({ success: true, message: `Test email sent successfully to ${to}!` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, message: 'Failed to send test email. Please check your SMTP settings in backend/.env' });
  }
});

/* ── 404 Handler ────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

/* ── Global Error Handler ───────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: `File too large. Max size is ${process.env.MAX_FILE_SIZE_MB || 50}MB.` });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

/* ── Start Server ───────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🎓 PRPCEM NOTES – NoteBridge Backend       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   🚀 Server: http://localhost:${PORT}            ║`);
  console.log(`║   📡 API:    http://localhost:${PORT}/api         ║`);
  console.log(`║   🏥 Health: http://localhost:${PORT}/api/health  ║`);
  console.log('╚══════════════════════════════════════════════╝\n');
});

module.exports = app;
