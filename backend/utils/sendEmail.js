const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT),
    secure: false,            // true for 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const mailOptions = {
    from:    process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
};

/* ── Email Templates ─────────────────────────────────────── */

const forgotPasswordTemplate = (name, tempPassword, role) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F4FF;margin:0;padding:0;}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:linear-gradient(135deg,#3B82F6,#6366F1);padding:40px 32px;text-align:center;}
  .header h1{color:white;margin:0;font-size:1.6rem;font-weight:800;}
  .header p{color:rgba(255,255,255,.85);margin:8px 0 0;font-size:.95rem;}
  .body{padding:32px;}
  .greeting{font-size:1.1rem;font-weight:600;color:#0F172A;margin-bottom:12px;}
  .desc{color:#475569;line-height:1.7;margin-bottom:24px;}
  .pwd-box{background:#F0F4FF;border:2px dashed #3B82F6;border-radius:12px;padding:20px;text-align:center;margin:24px 0;}
  .pwd-label{font-size:.8rem;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;}
  .pwd-value{font-size:1.8rem;font-weight:900;color:#3B82F6;letter-spacing:.12em;font-family:monospace;}
  .warning{background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:14px 16px;font-size:.85rem;color:#92400E;margin-top:16px;}
  .footer{background:#F8FAFF;padding:20px 32px;text-align:center;font-size:.8rem;color:#94A3B8;border-top:1px solid #E2E8F0;}
  .badge{display:inline-block;background:#EFF6FF;color:#3B82F6;font-size:.75rem;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:16px;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>📚 PRPCEM NoteBridge</h1>
    <p>Smart Notes Sharing Platform</p>
  </div>
  <div class="body">
    <div class="badge">🔐 Password Recovery</div>
    <div class="greeting">Hello, ${name}!</div>
    <div class="desc">
      We received a request to reset your <strong>${role}</strong> account password on NoteBridge.
      Here is your temporary password — use it to sign in, then change it immediately.
    </div>
    <div class="pwd-box">
      <div class="pwd-label">Your Temporary Password</div>
      <div class="pwd-value">${tempPassword}</div>
    </div>
    <div class="warning">
      ⚠️ <strong>Important:</strong> This temporary password is valid for <strong>24 hours</strong>.
      Please log in and change your password immediately after signing in.
      If you did not request this, please contact your admin.
    </div>
    <div style="margin-top:24px;text-align:center;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#6366F1);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:.95rem;">
        🔑 Sign In to NoteBridge
      </a>
    </div>
  </div>
  <div class="footer">
    © 2026 PRPCEM NoteBridge · Prof Ram Meghe College of Engineering & Management<br/>
    This is an automated email, please do not reply.
  </div>
</div>
</body>
</html>
`;

const welcomeTemplate = (name, role) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F4FF;margin:0;padding:0;}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}
  .header{background:linear-gradient(135deg,#10B981,#3B82F6);padding:40px 32px;text-align:center;}
  .header h1{color:white;margin:0;font-size:1.6rem;font-weight:800;}
  .body{padding:32px;}
  .footer{background:#F8FAFF;padding:16px 32px;text-align:center;font-size:.8rem;color:#94A3B8;border-top:1px solid #E2E8F0;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><h1>🎉 Welcome to NoteBridge!</h1></div>
  <div class="body">
    <p style="font-size:1.1rem;font-weight:600;color:#0F172A;">Hello, ${name}!</p>
    <p style="color:#475569;line-height:1.7;">Your <strong>${role}</strong> account has been created successfully on PRPCEM NoteBridge. Your account is now pending admin approval.</p>
    <p style="color:#475569;">You will receive another email once your account is approved.</p>
    <div style="margin-top:24px;text-align:center;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#6366F1);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;">🚀 Go to NoteBridge</a>
    </div>
  </div>
  <div class="footer">© 2026 PRPCEM NoteBridge</div>
</div>
</body>
</html>
`;

const approvalTemplate = (name) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F4FF;}.wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}.header{background:linear-gradient(135deg,#10B981,#059669);padding:36px;text-align:center;}.header h1{color:white;margin:0;font-size:1.5rem;font-weight:800;}.body{padding:32px;}.footer{background:#F8FAFF;padding:16px;text-align:center;font-size:.8rem;color:#94A3B8;border-top:1px solid #E2E8F0;}</style>
</head>
<body><div class="wrap">
  <div class="header"><h1>✅ Account Approved!</h1></div>
  <div class="body">
    <p style="font-size:1.05rem;font-weight:600;color:#0F172A;">Hello, ${name}!</p>
    <p style="color:#475569;line-height:1.7;">Great news! Your PRPCEM NoteBridge account has been <strong>approved by the admin</strong>. You can now log in and start using the platform.</p>
    <div style="margin-top:24px;text-align:center;"><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display:inline-block;background:linear-gradient(135deg,#10B981,#3B82F6);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;">🎓 Start Learning</a></div>
  </div>
  <div class="footer">© 2026 PRPCEM NoteBridge</div>
</div></body></html>
`;

const newNoteTemplate = (noteTitle, subject, teacherName, link) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>body{font-family:'Segoe UI',Arial,sans-serif;background:#F0F4FF;}.wrap{max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);}.header{background:linear-gradient(135deg,#3B82F6,#6366F1);padding:36px;text-align:center;}.header h1{color:white;margin:0;font-size:1.4rem;font-weight:800;}.body{padding:32px;}.footer{background:#F8FAFF;padding:16px;text-align:center;font-size:.8rem;color:#94A3B8;border-top:1px solid #E2E8F0;}</style>
</head>
<body><div class="wrap">
  <div class="header"><h1>📚 New Notes Uploaded!</h1></div>
  <div class="body">
    <p style="font-size:1.05rem;font-weight:600;color:#0F172A;">Hello Students,</p>
    <p style="color:#475569;line-height:1.7;"><strong>${teacherName}</strong> has just uploaded a new study material for <strong>${subject}</strong>.</p>
    <div style="background:#F0F4FF;border-radius:8px;padding:16px;margin:20px 0;">
      <div style="font-size:0.85rem;color:#64748B;text-transform:uppercase;font-weight:700;">Note Title</div>
      <div style="font-size:1.1rem;font-weight:700;color:#3B82F6;margin-top:4px;">${noteTitle}</div>
    </div>
    <div style="margin-top:24px;text-align:center;"><a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#6366F1);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;">👀 View Notes</a></div>
  </div>
  <div class="footer">© 2026 PRPCEM NoteBridge</div>
</div></body></html>
`;

module.exports = { sendEmail, forgotPasswordTemplate, welcomeTemplate, approvalTemplate, newNoteTemplate };
