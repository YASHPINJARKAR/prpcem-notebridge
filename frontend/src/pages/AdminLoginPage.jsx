import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackgroundCanvas from '../components/BackgroundCanvas';
import api from '../services/api';

const AdminLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrMsg('Please enter your credentials.');
      return;
    }
    setLoading(true);
    setErrMsg('');

    const payload = { email, password, role: 'admin' };

    try {
      const res = await api.post('/auth/login', payload);
      const { success, token, user, message } = res.data;

      if (!success) {
        setErrMsg(message || 'Invalid email or password.');
        setLoading(false);
        return;
      }
      if (user.role !== 'admin') {
        setErrMsg('Access Denied: Only administrators can log in here.');
        setLoading(false);
        return;
      }

      login(user, token);
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 500);
    } catch (err) {
      setErrMsg(err.response?.data?.message || '❌ Cannot connect to server. Make sure backend is running on port 5000.');
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      <BackgroundCanvas />

      <div className="page-content" style={{ width: '100%', display: 'flex' }}>
        <div className="login-wrap">
          {/* Left (Branding) */}
          <div className="login-left" style={{ background: 'linear-gradient(145deg,#F0FDF4,#ECFDF5,#F0FDFA)' }}>
            <div className="lb1" style={{ background: 'rgba(16,185,129,.15)' }}></div>
            <div className="lb2" style={{ background: 'rgba(5,150,105,.12)' }}></div>
            <div className="login-left-content animate-fadeInLeft">
              <div className="brand-icon">
                <img src="/images/logo.png" alt="College Logo" />
              </div>
              <div className="brand-name">
                PRPCEM{' '}
                <span 
                  className="gradient-text" 
                  style={{ 
                    background: 'linear-gradient(135deg, var(--success), #059669)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent' 
                  }}
                >
                  NoteBridge
                </span>
              </div>
              <p className="brand-tag">
                Admin Portal – Control panel and platform management tools for PRPCEM NoteBridge.
              </p>
            </div>
          </div>

          {/* Right (Form) */}
          <div className="login-right">
            <div className="form-wrap animate-fadeInRight">
              <p className="greeting" id="greeting">Admin Portal 🛠️</p>
              <p className="subtext">Sign in to manage the NoteBridge platform</p>

              {/* Login Form */}
              <form id="f-login" className="form-fields" onSubmit={handleLogin}>
                <div className="input-group">
                  <label id="l-uid-label">Admin Email</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon" id="l-uid-icon">✉️</span>
                    <input 
                      id="l-uid" 
                      type="email" 
                      className="input" 
                      placeholder="admin@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <label>Password</label>
                  <div className="input-icon-wrap">
                    <span className="input-icon">🔒</span>
                    <input 
                      id="l-pass" 
                      type="password" 
                      className="input" 
                      placeholder="Enter admin password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  id="login-btn" 
                  type="submit"
                  className="btn btn-success w-full btn-lg" 
                  style={{ 
                    marginTop: '10px', 
                    background: 'linear-gradient(135deg, var(--success), #059669)', 
                    border: 'none' 
                  }}
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
              </form>

              <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '.8rem' }}>
                <a href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                  ← Back to Main Portal
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
