import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import BackgroundCanvas from '../components/BackgroundCanvas';
import api from '../services/api';

const LoginPage = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [role, setRole] = useState('student'); // 'student' | 'teacher' | 'admin'
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Login inputs
  const [loginUid, setLoginUid] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regPass2, setRegPass2] = useState('');

  // Student specific register inputs
  const [regRoll, setRegRoll] = useState('');
  const [regEnrol, setRegEnrol] = useState('');
  const [regBranch, setRegBranch] = useState('AI&DS');
  const [regYear, setRegYear] = useState('1st Year');
  const [regSection, setRegSection] = useState('B1');

  // Forgot password inputs
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState({ show: false, success: false, text: '' });

  // Email verification/welcome box
  const [successBox, setSuccessBox] = useState({ show: false, email: '' });

  useEffect(() => {
    // URL role support
    const urlRole = searchParams.get('role');
    if (urlRole && ['student', 'teacher', 'admin'].includes(urlRole)) {
      handleRoleSwitch(urlRole);
    }
  }, [searchParams]);

  const handleRoleSwitch = (r) => {
    if (r === 'admin') {
      navigate('/admin/login');
      return;
    }
    setRole(r);
    setErrMsg('');
    setSuccessBox({ show: false, email: '' });
  };

  const handleModeSwitch = (m) => {
    setMode(m);
    setErrMsg('');
    setShowForgot(false);
    setSuccessBox({ show: false, email: '' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginUid || !loginPass) {
      setErrMsg('Please enter your credentials.');
      return;
    }
    setLoading(true);
    setErrMsg('');

    const payload = { password: loginPass, role: role };
    if (role === 'student') payload.rollNumber = loginUid;
    else payload.email = loginUid;

    try {
      const res = await api.post('/auth/login', payload);
      const { success, token, user, message } = res.data;

      if (!success) {
        setErrMsg(message || 'Invalid email/roll number or password.');
        setLoading(false);
        return;
      }

      showToast('success', 'Logged in successfully!', `Welcome, ${user.firstName}.`);
      login(user, token);

      setTimeout(() => {
        if (user.role === 'admin') navigate('/admin/dashboard');
        else if (user.role === 'teacher') navigate('/teacher/dashboard');
        else navigate('/student/dashboard');
      }, 500);
    } catch (err) {
      const data = err.response?.data;
      if (data && data.code === 'PENDING') {
        setErrMsg('⏳ Your account is pending admin approval. Please wait.');
      } else {
        setErrMsg(data?.message || 'Invalid email/roll number or password.');
      }
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regPass || !regEmail) {
      alert('Please fill Full Name and Password.');
      return;
    }
    if (regPass !== regPass2) {
      alert('Passwords do not match.');
      return;
    }
    if (regPass.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const parts = regName.trim().split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || ' ';

    const payload = {
      firstName,
      lastName,
      email: regEmail,
      password: regPass,
      phone: regPhone,
      role: role,
    };

    if (role === 'student') {
      payload.rollNumber = regRoll;
      payload.enrolmentNo = regEnrol;
      payload.branch = regBranch;
      payload.year = regYear;
      payload.section = regSection;
    }

    try {
      const res = await api.post('/auth/register', payload);
      const { success, user, token, message } = res.data;

      if (!success) {
        alert(message || 'Registration failed.');
        setLoading(false);
        return;
      }

      if (user.status === 'pending') {
        // Change UI to sign in and show the pending message
        setMode('login');
        setSuccessBox({ show: true, email: user.email });

        // Clear registration fields
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegPass('');
        setRegPass2('');
        setRegRoll('');
        setRegEnrol('');
      } else {
        showToast('success', 'Account created!', 'Welcome to NoteBridge.');
        login(user, token);
        navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot connect to server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      alert('Please enter your email.');
      return;
    }
    setForgotLoading(true);
    setForgotMsg({ show: true, success: false, text: '⏳ Sending…' });

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      if (res.data.success) {
        setForgotMsg({
          show: true,
          success: true,
          text: `✅ ${res.data.message || 'Temporary password sent!'}`
        });
      } else {
        setForgotMsg({
          show: true,
          success: false,
          text: `❌ ${res.data.message || 'Something went wrong.'}`
        });
      }
    } catch (err) {
      setForgotMsg({
        show: true,
        success: false,
        text: '❌ Cannot reach server. Is the backend running on port 5000?'
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', display: 'flex', flex: 1 }}>
      <BackgroundCanvas />

      <div className="page-content" style={{ width: '100%', flex: 1, display: 'flex' }}>
        <div className="login-wrap">
          {/* Left Branding Side */}
          <div className="login-left">
            <div className="lb1"></div>
            <div className="lb2"></div>
            <div className="login-left-content animate-fadeInLeft">
              <div className="brand-icon">
                <img src="/images/logo.png" alt="College Logo" />
              </div>
              <div className="brand-name">
                PRPCEM <span className="gradient-text">NoteBridge</span>
              </div>
              <p className="brand-tag">
                The smart notes sharing platform connecting teachers &amp; students at PRPCEM.
              </p>
            </div>
          </div>

          {/* Right Form Side */}
          <div className="login-right">
            <div className="form-wrap animate-fadeInRight">
              <p className="greeting" id="greeting">
                {mode === 'login' ? 'Welcome back 👋' : 'Join NoteBridge 🎓'}
              </p>
              <p className="subtext">
                {mode === 'login' ? 'Sign in to your NoteBridge account' : 'Create a student/teacher account'}
              </p>

              {/* Role Tabs */}
              <div className="role-tabs">
                <div
                  className={`role-tab student ${role === 'student' ? 'active' : ''}`}
                  onClick={() => handleRoleSwitch('student')}
                >
                  <span className="em">👨‍🎓</span>Student
                </div>
                <div
                  className={`role-tab teacher ${role === 'teacher' ? 'active' : ''}`}
                  onClick={() => handleRoleSwitch('teacher')}
                >
                  <span className="em">👩‍🏫</span>Teacher
                </div>
              </div>

              {/* Toggle Login/Register */}
              <div className="mode-toggle">
                <div
                  className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
                  id="btn-login"
                  onClick={() => handleModeSwitch('login')}
                >
                  Sign In
                </div>
                {role !== 'admin' && (
                  <div
                    className={`mode-btn ${mode === 'register' ? 'active' : ''}`}
                    id="btn-reg"
                    onClick={() => handleModeSwitch('register')}
                  >
                    Register
                  </div>
                )}
              </div>

              {/* Login Mode */}
              {mode === 'login' && (
                <form className="form-fields" onSubmit={handleLogin}>
                  <div className="input-group">
                    <label id="l-uid-label">
                      {role === 'student' ? 'Roll Number' : 'Email'}
                    </label>
                    <div className="input-icon-wrap">
                      <span className="input-icon" id="l-uid-icon">
                        {role === 'student' ? '🎓' : '✉️'}
                      </span>
                      <input
                        id="l-uid"
                        type={role === 'student' ? 'text' : 'email'}
                        className="input"
                        placeholder={role === 'student' ? 'AIDSU24001' : 'your@email.com'}
                        value={loginUid}
                        onChange={(e) => setLoginUid(e.target.value)}
                        required
                      />
                    </div>
                    <label>
                      Password{' '}
                      <a
                        href="#"
                        className="forgot-link"
                        onClick={(e) => { e.preventDefault(); setShowForgot(!showForgot); }}
                      >
                        Forgot?
                      </a>
                    </label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">🔒</span>
                      <input
                        id="l-pass"
                        type="password"
                        className="input"
                        placeholder="Enter password"
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    id="login-btn"
                    type="submit"
                    className="btn btn-primary w-full btn-lg"
                    style={{ marginTop: '4px' }}
                    disabled={loading}
                  >
                    {loading ? '⏳ Signing in…' : 'Sign In →'}
                  </button>

                  {errMsg && (
                    <div style={{
                      background: '#FEE2E2',
                      border: '1.5px solid #EF4444',
                      color: '#B91C1C',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '.83rem',
                      fontWeight: '600',
                      marginTop: '8px',
                      animation: 'fadeInUp .3s ease'
                    }}>
                      {errMsg}
                    </div>
                  )}

                  {/* Pending/Email Sent Box */}
                  {successBox.show && (
                    <div className="email-box show" id="email-box">
                      <span style={{ fontSize: '1.4rem' }}>📧</span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '.875rem' }}>
                          Welcome email sent!
                        </div>
                        <div style={{ fontSize: '.78rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                          Account created for <strong>{successBox.email}</strong>. Awaiting admin approval.
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* Register Mode */}
              {mode === 'register' && (
                <form className="form-fields" onSubmit={handleRegister} style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }}>
                  <div className="input-group">
                    <label>Full Name</label>
                    <input
                      id="r-fullname"
                      type="text"
                      className="input"
                      placeholder="Raghav Sharma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Email ID</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">✉️</span>
                      <input
                        id="r-email"
                        type="email"
                        className="input"
                        placeholder="name@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Phone No</label>
                    <div className="input-icon-wrap">
                      <span className="input-icon">📞</span>
                      <input
                        id="r-phone"
                        type="text"
                        className="input"
                        placeholder="Your mobile number"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {role === 'student' && (
                    <div id="student-only-fields">
                      <div className="form-row2">
                        <div className="input-group">
                          <label>Roll Number</label>
                          <input
                            id="r-roll"
                            type="text"
                            className="input"
                            placeholder="AIDSU24001"
                            value={regRoll}
                            onChange={(e) => setRegRoll(e.target.value)}
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label>Enrolment No</label>
                          <input
                            id="r-enrolment"
                            type="text"
                            className="input"
                            placeholder="24010222026"
                            value={regEnrol}
                            onChange={(e) => setRegEnrol(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-row2">
                        <div className="input-group">
                          <label>Branch</label>
                          <select
                            id="r-branch"
                            className="select"
                            value={regBranch}
                            onChange={(e) => setRegBranch(e.target.value)}
                          >
                            <option>AI&DS</option>
                            <option>CSE</option>
                            <option>AI&ML</option>
                            <option>EXTC</option>
                            <option>MECH</option>
                            <option>CIVIL</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Year</label>
                          <select
                            id="r-year"
                            className="select"
                            value={regYear}
                            onChange={(e) => setRegYear(e.target.value)}
                          >
                            <option>1st Year</option>
                            <option>2nd Year</option>
                            <option>3rd Year</option>
                            <option>4th Year</option>
                          </select>
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Section</label>
                        <select
                          id="r-section"
                          className="select"
                          value={regSection}
                          onChange={(e) => setRegSection(e.target.value)}
                        >
                          <option>B1</option>
                          <option>B2</option>
                          <option>B3</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="form-row2">
                    <div className="input-group">
                      <label>Password</label>
                      <div className="input-icon-wrap">
                        <span className="input-icon">🔒</span>
                        <input
                          id="r-pass"
                          type="password"
                          className="input"
                          placeholder="Min 6 chars"
                          value={regPass}
                          onChange={(e) => setRegPass(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Confirm Password</label>
                      <div className="input-icon-wrap">
                        <span className="input-icon">🔒</span>
                        <input
                          id="r-pass2"
                          type="password"
                          className="input"
                          placeholder="Confirm"
                          value={regPass2}
                          onChange={(e) => setRegPass2(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="reg-btn"
                    type="submit"
                    className="btn btn-gradient w-full btn-lg"
                    disabled={loading}
                  >
                    {loading ? '⏳ Creating account…' : 'Create Account →'}
                  </button>
                  <p className="terms">
                    By registering you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>
                  </p>
                </form>
              )}

              {/* Forgot Password Inline Panel */}
              {showForgot && (
                <div id="forgot-panel" style={{
                  display: 'block',
                  background: 'var(--primary-light)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  marginTop: '.75rem',
                  animation: 'fadeInUp .3s ease'
                }}>
                  <div style={{ fontWeight: 700, fontSize: '.875rem', color: 'var(--primary)', marginBottom: '6px' }}>
                    🔐 Forgot Password
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Enter your email — we'll send a temporary password to it instantly.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="forgot-email"
                      type="email"
                      className="input"
                      placeholder="your@email.com"
                      style={{ flex: 1, fontSize: '.83rem', padding: '9px 12px' }}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    <button
                      id="forgot-btn"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleForgotPasswordSubmit}
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? '⏳' : 'Send 📧'}
                    </button>
                  </div>
                  {forgotMsg.show && (
                    <div
                      id="forgot-msg"
                      style={{
                        fontSize: '.78rem',
                        marginTop: '8px',
                        display: 'block',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: forgotMsg.success ? 'var(--success-light)' : '#FEE2E2',
                        color: forgotMsg.success ? '#065F46' : '#B91C1C'
                      }}
                    >
                      {forgotMsg.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
