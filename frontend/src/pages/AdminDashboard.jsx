import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import BackgroundCanvas from '../components/BackgroundCanvas';
import Chatbot from '../components/Chatbot';
import api from '../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('sec-overview'); // 'sec-overview' | 'sec-users' | 'sec-notes' | 'sec-approvals' | 'sec-settings'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Approvals tab switcher
  const [approvalsTab, setApprovalsTab] = useState('students'); // 'students' | 'teachers' | 'notes'

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const p1 = api.get('/admin/users');
      const p2 = api.get('/notes');
      const [resUsers, resNotes] = await Promise.all([p1, p2]);
      
      if (resUsers.data.success) {
        setUsers(resUsers.data.data);
      }
      if (resNotes.data.success) {
        setNotes(resNotes.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to load system dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleApproveUser = async (id, name) => {
    try {
      const res = await api.put(`/admin/users/${id}/approve`);
      if (res.data.success) {
        showToast('success', 'User Approved', `${name} can now login.`);
        loadAdminData();
      } else {
        showToast('error', 'Error', res.data.message || 'Approval failed');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to approve user.');
    }
  };

  const handleRejectUser = async (id, name) => {
    try {
      const res = await api.put(`/admin/users/${id}/reject`);
      if (res.data.success) {
        showToast('error', 'User Suspended/Rejected', `${name} was rejected.`);
        loadAdminData();
      } else {
        showToast('error', 'Error', res.data.message || 'Suspension failed');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to update user status.');
    }
  };

  const handleApproveNote = async (id, title) => {
    try {
      const res = await api.put(`/admin/notes/${id}/approve`);
      if (res.data.success) {
        showToast('success', 'Note Approved', `"${title}" is public.`);
        loadAdminData();
      } else {
        showToast('error', 'Error', res.data.message || 'Approval failed');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to approve note.');
    }
  };

  const handleRejectNote = async (id) => {
    try {
      const res = await api.put(`/admin/notes/${id}/reject`, { reason: "Does not meet content guidelines." });
      if (res.data.success) {
        showToast('error', 'Note Rejected', `Note was rejected.`);
        loadAdminData();
      } else {
        showToast('error', 'Error', res.data.message || 'Rejection failed');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to reject note.');
    }
  };

  // Stats
  const totalStudentsTeachers = users.filter(u => u.role === 'student' || u.role === 'teacher').length;
  const totalNotesCount = notes.length;
  const pendingUsersList = users.filter(u => u.status === 'pending');
  const pendingNotesList = notes.filter(n => n.status === 'pending');
  const totalPendingActions = pendingUsersList.length + pendingNotesList.length;

  const pendingStudents = pendingUsersList.filter(u => u.role === 'student');
  const pendingTeachers = pendingUsersList.filter(u => u.role === 'teacher');

  // formatting
  const formatDateStr = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const roleBadge = (r) => {
    const rn = r.toLowerCase();
    if (rn === 'teacher') return <span className="badge badge-accent">👩‍🏫 Teacher</span>;
    if (rn === 'admin') return <span className="badge badge-success">🛠 Admin</span>;
    return <span className="badge badge-primary">👨‍🎓 Student</span>;
  };

  const statusBadge = (s) => {
    if (s === 'active') return <span className="badge badge-success">🟢 Active</span>;
    if (s === 'pending') return <span className="badge badge-warning">⏳ Pending</span>;
    return <span className="badge badge-danger">🔴 Banned</span>;
  };

  const noteStatusBadge = (s) => {
    if (s === 'approved') return <span className="badge badge-success">✅ Approved</span>;
    if (s === 'pending') return <span className="badge badge-warning">⏳ Pending</span>;
    return <span className="badge badge-danger">❌ Rejected</span>;
  };

  const initials = user ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() : 'AD';
  const name = user ? `${user.firstName} ${user.lastName}` : 'Admin';

  const avatarColors = [
    'linear-gradient(135deg,#3B82F6,#6366F1)',
    'linear-gradient(135deg,#10B981,#06B6D4)',
    'linear-gradient(135deg,#8B5CF6,#6366F1)',
    'linear-gradient(135deg,#F59E0B,#EF4444)',
    'linear-gradient(135deg,#EC4899,#8B5CF6)'
  ];

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      <BackgroundCanvas />
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div className="page-content dashboard-wrapper">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
          <div className="sidebar-logo">
            <img src="/images/logo.png" className="sidebar-logo-img" alt="Logo" />
            <div>
              <div className="sidebar-logo-text">NoteBridge</div>
              <div className="sidebar-logo-sub">Admin Portal</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section-label">Admin Menu</div>
            <div 
              className={`nav-item ${activeSection === 'sec-overview' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-overview'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">🏠</span> Overview
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-users' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-users'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">👥</span> User Management
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-notes' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-notes'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">📂</span> Notes Management
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-approvals' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-approvals'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">✅</span> Approvals
              {totalPendingActions > 0 && (
                <span className="nav-badge" id="sidebar-approvals-badge">{totalPendingActions}</span>
              )}
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-settings' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-settings'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">⚙️</span> Settings
            </div>

            <div className="nav-section-label">Account</div>
            <div className="nav-item" onClick={handleSignOut}>
              <span className="nav-icon">🚪</span> Sign Out
            </div>
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div 
                className="avatar-placeholder avatar-md" 
                style={{ 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg,var(--success),#059669)', 
                  fontSize: '.85rem', 
                  fontWeight: 700, 
                  color: 'white', 
                  width: '40px', 
                  height: '40px', 
                  display: 'grid', 
                  placeItems: 'center' 
                }}
              >
                {initials}
              </div>
              <div>
                <div className="user-name">{name}</div>
                <div className="user-role">System Administrator</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Body */}
        <div className="main-content">
          <header className="navbar">
            <div className="navbar-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
            </div>
            <div className="navbar-right">
              <span className="badge badge-success" style={{ fontSize: '.8rem', padding: '6px 14px' }}>
                🟢 System Online
              </span>
              <div 
                className="avatar-placeholder" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg,var(--success),#059669)', 
                  fontSize: '.85rem', 
                  fontWeight: 750, 
                  color: 'white', 
                  display: 'grid', 
                  placeItems: 'center', 
                  cursor: 'pointer' 
                }}
                onClick={() => setActiveSection('sec-settings')}
              >
                {initials}
              </div>
            </div>
          </header>

          <main className="page-body">
            {/* ── OVERVIEW SECTION ── */}
            {activeSection === 'sec-overview' && (
              <div id="sec-overview">
                <div className="page-header">
                  <div>
                    <div className="page-title">Admin Overview 🛠️</div>
                    <div className="page-subtitle">PRPCEM NoteBridge System Dashboard</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-gradient btn-sm" 
                      id="header-approvals-btn"
                      onClick={() => setActiveSection('sec-approvals')}
                    >
                      ✅ Pending Approvals ({totalPendingActions})
                    </button>
                  </div>
                </div>

                <div className="grid grid-3 gap-4" style={{ marginBottom: '2rem' }}>
                  <div className="stat-card blue animate-fadeInUp">
                    <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>👥</div>
                    <div className="stat-value" id="total-users-sum">{totalStudentsTeachers}</div>
                    <div className="stat-label">Total Users</div>
                    <div className="stat-change up">Students & Teachers</div>
                  </div>
                  <div className="stat-card green animate-fadeInUp delay-100">
                    <div className="stat-icon" style={{ background: 'var(--success-light)' }}>📂</div>
                    <div className="stat-value" id="total-notes-sum">{totalNotesCount}</div>
                    <div className="stat-label">Total Notes</div>
                    <div className="stat-change up">All uploaded notes</div>
                  </div>
                  <div className="stat-card red animate-fadeInUp delay-200">
                    <div className="stat-icon" style={{ background: 'var(--danger-light)' }}>⏳</div>
                    <div className="stat-value" id="total-pending-sum">{totalPendingActions}</div>
                    <div className="stat-label">Pending Approvals</div>
                    <div className="stat-change down">Needs action</div>
                  </div>
                </div>

                {/* Quick Approvals Queue list */}
                <div className="card-solid">
                  <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', justifyContent: 'space-between' }}>
                    <strong>⏳ Pending Approvals Queue</strong>
                    <button className="btn btn-ghost btn-sm" onClick={() => setActiveSection('sec-approvals')}>
                      View All →
                    </button>
                  </div>
                  <div style={{ padding: '1rem' }} id="quick-approvals">
                    {pendingUsersList.length === 0 && pendingNotesList.length === 0 ? (
                      <p style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>No pending approvals.</p>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {pendingUsersList.slice(0, 2).map((u, i) => (
                            <div className="approval-card" id={`qau-${u._id}`} key={u._id}>
                              <div 
                                style={{ 
                                  width: '38px', 
                                  height: '38px', 
                                  borderRadius: '50%', 
                                  background: avatarColors[i % avatarColors.length], 
                                  display: 'grid', 
                                  placeItems: 'center', 
                                  fontWeight: 700, 
                                  color: 'white', 
                                  fontSize: '.8rem', 
                                  flexShrink: 0 
                                }}
                              >
                                {((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase()}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{u.firstName} {u.lastName}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{u.role} · {u.department || 'N/A'}</div>
                              </div>
                              <button className="btn btn-success btn-sm" onClick={() => handleApproveUser(u._id, u.firstName)}>✅</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleRejectUser(u._id, u.firstName)}>❌</button>
                            </div>
                          ))}

                          {pendingUsersList.length < 2 && pendingNotesList.slice(0, 2 - pendingUsersList.length).map((n) => (
                            <div className="approval-card" id={`qan-${n._id}`} key={n._id}>
                              <span style={{ fontSize: '1.5rem', marginRight: '6px' }}>📄</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '.875rem' }} className="truncate">{n.title}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Note · {n.subject}</div>
                              </div>
                              <button className="btn btn-success btn-sm" onClick={() => handleApproveNote(n._id, n.title)}>✅</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleRejectNote(n._id)}>❌</button>
                            </div>
                          ))}
                        </div>
                        <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', paddingTop: '.5rem', margin: 0 }}>
                          + {Math.max(0, totalPendingActions - 2)} more pending{' '}
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); setActiveSection('sec-approvals'); }} 
                            style={{ color: 'var(--primary)', fontWeight: 600 }}
                          >
                            View all →
                          </a>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── USER MANAGEMENT SECTION ── */}
            {activeSection === 'sec-users' && (
              <div id="sec-users">
                <div className="page-header">
                  <div>
                    <div className="page-title">User Management 👥</div>
                  </div>
                </div>
                <div className="card-solid" style={{ marginBottom: '1.5rem' }}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Department</th>
                          <th>Joined</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="users-table">
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>No users found.</td>
                          </tr>
                        ) : (
                          users.map((u, i) => (
                            <tr key={u._id}>
                              <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div 
                                  className="user-row-avatar" 
                                  style={{ 
                                    background: avatarColors[i % avatarColors.length], 
                                    width: '34px', 
                                    height: '34px', 
                                    borderRadius: '50%', 
                                    display: 'grid', 
                                    placeItems: 'center', 
                                    fontSize: '.75rem', 
                                    fontWeight: 700, 
                                    color: 'white', 
                                    flexShrink: 0 
                                  }}
                                >
                                  {((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 605 }}>{u.firstName} {u.lastName}</span>
                              </td>
                              <td style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{u.email}</td>
                              <td>{roleBadge(u.role)}</td>
                              <td><span className="badge badge-gray">{u.department || u.branch || 'N/A'}</span></td>
                              <td style={{ fontSize: '.8rem' }}>{formatDateStr(u.createdAt)}</td>
                              <td>{statusBadge(u.status)}</td>
                              <td className="table-actions">
                                {u.status === 'pending' ? (
                                  <>
                                    <button className="btn btn-success btn-sm" style={{ marginRight: '4px' }} onClick={() => handleApproveUser(u._id, u.firstName)}>✅ Approve</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleRejectUser(u._id, u.firstName)}>❌ Ban</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="btn btn-ghost btn-sm" onClick={() => showToast('info', 'Viewing', `${u.firstName} ${u.lastName}`)}>👁</button>
                                    {u.role !== 'admin' && (
                                      <button className="btn btn-danger btn-sm" onClick={() => handleRejectUser(u._id, u.firstName)}>🚫</button>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── NOTES MANAGEMENT SECTION ── */}
            {activeSection === 'sec-notes' && (
              <div id="sec-notes">
                <div className="page-header">
                  <div>
                    <div className="page-title">Notes Management 📂</div>
                  </div>
                </div>
                <div className="card-solid">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Teacher</th>
                          <th>Subject</th>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Views</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="admin-notes-table">
                        {notes.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '1rem' }}>No notes found.</td>
                          </tr>
                        ) : (
                          notes.map(n => (
                            <tr key={n._id}>
                              <td style={{ fontWeight: 605 }}>{n.title}</td>
                              <td>{n.uploadedBy ? `${n.uploadedBy.firstName} ${n.uploadedBy.lastName}` : 'Admin'}</td>
                              <td><span className="badge badge-gray">{n.subject}</span></td>
                              <td><span className="file-type-badge file-pdf">{n.fileType || 'PDF'}</span></td>
                              <td>{formatDateStr(n.createdAt)}</td>
                              <td>{n.views || 0}</td>
                              <td>{noteStatusBadge(n.status)}</td>
                              <td className="table-actions">
                                {n.status === 'pending' ? (
                                  <>
                                    <button className="btn btn-success btn-sm" style={{ marginRight: '4px' }} onClick={() => handleApproveNote(n._id, n.title)}>✅</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleRejectNote(n._id)}>❌</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="btn btn-ghost btn-sm" onClick={() => showToast('info', 'Preview', 'Opening file...')}>👁</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleRejectNote(n._id)}>🗑</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── APPROVALS SECTION ── */}
            {activeSection === 'sec-approvals' && (
              <div id="sec-approvals">
                <div className="page-header">
                  <div>
                    <div className="page-title">Pending Approvals Queue ✅</div>
                    <div className="page-subtitle" id="approvals-page-subtitle">
                      {totalPendingActions} items awaiting review
                    </div>
                  </div>
                </div>

                <div className="tab-group" style={{ maxWidth: '480px', marginBottom: '1.5rem' }}>
                  <div 
                    className={`tab-btn ${approvalsTab === 'students' ? 'active' : ''}`}
                    onClick={() => setApprovalsTab('students')}
                  >
                    👨‍🎓 Students ({pendingStudents.length})
                  </div>
                  <div 
                    className={`tab-btn ${approvalsTab === 'teachers' ? 'active' : ''}`}
                    onClick={() => setApprovalsTab('teachers')}
                  >
                    👩‍🏫 Teachers ({pendingTeachers.length})
                  </div>
                  <div 
                    className={`tab-btn ${approvalsTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setApprovalsTab('notes')}
                  >
                    📄 Uploaded Files ({pendingNotesList.length})
                  </div>
                </div>

                {/* Approvals Lists */}
                {approvalsTab === 'students' && (
                  <div id="approval-students-list" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {pendingStudents.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No pending students.</p>
                    ) : (
                      pendingStudents.map((u, i) => (
                        <div className="approval-card" id={`au-${u._id}`} key={u._id}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColors[i % avatarColors.length], display: 'grid', placeItems: 'center', fontWeight: '700', color: 'white', fontSize: '.875rem', flexShrink: 0 }}>
                            {((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{u.email} · {u.branch || 'N/A'} · {u.section || 'N/A'}</div>
                          </div>
                          {roleBadge(u.role)}
                          <button className="btn btn-success btn-sm" onClick={() => handleApproveUser(u._id, u.firstName)}>✅ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectUser(u._id, u.firstName)}>❌ Reject</button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {approvalsTab === 'teachers' && (
                  <div id="approval-teachers-list" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {pendingTeachers.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No pending teachers.</p>
                    ) : (
                      pendingTeachers.map((u, i) => (
                        <div className="approval-card" id={`au-${u._id}`} key={u._id}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: avatarColors[(i + 2) % avatarColors.length], display: 'grid', placeItems: 'center', fontWeight: '700', color: 'white', fontSize: '.875rem', flexShrink: 0 }}>
                            {((u.firstName?.[0] || '') + (u.lastName?.[0] || '')).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{u.email} · {u.department || 'N/A'}</div>
                          </div>
                          {roleBadge(u.role)}
                          <button className="btn btn-success btn-sm" onClick={() => handleApproveUser(u._id, u.firstName)}>✅ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectUser(u._id, u.firstName)}>❌ Reject</button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {approvalsTab === 'notes' && (
                  <div id="approval-notes-list" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                    {pendingNotesList.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No pending note uploads.</p>
                    ) : (
                      pendingNotesList.map((n) => (
                        <div className="approval-card" id={`an-${n._id}`} key={n._id}>
                          <span style={{ fontSize: '1.75rem' }}>📄</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{n.title}</div>
                            <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                              {n.uploadedBy ? `${n.uploadedBy.firstName} ${n.uploadedBy.lastName}` : 'Admin'} · {n.subject} · {n.fileType || 'PDF'}
                            </div>
                          </div>
                          <button className="btn btn-success btn-sm" onClick={() => handleApproveNote(n._id, n.title)}>✅ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectNote(n._id)}>❌ Reject</button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── SETTINGS SECTION ── */}
            {activeSection === 'sec-settings' && (
              <div id="sec-settings">
                <div className="page-header">
                  <div>
                    <div className="page-title">System Settings ⚙️</div>
                    <div className="page-subtitle">Configure platform behavior</div>
                  </div>
                </div>
                <div className="grid grid-2 gap-4">
                  <div className="card-solid">
                    <div className="card-header"><strong>🔐 Authentication</strong></div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="input-group">
                        <label>Allowed Email Domain</label>
                        <input type="text" className="input" defaultValue="All emails allowed" readOnly style={{ color: 'var(--success)', fontWeight: 600 }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '.875rem', fontWeight: 500 }}>Require Email Verification</span>
                        <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '.875rem', fontWeight: 500 }}>Auto-approve Teachers</span>
                        <input type="checkbox" style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => showToast('success', 'Settings saved!', '')}>Save Changes</button>
                    </div>
                  </div>
                  <div className="card-solid">
                    <div className="card-header"><strong>📂 Storage & Upload</strong></div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="input-group">
                        <label>Max File Size (MB)</label>
                        <input type="number" className="input" defaultValue="50" />
                      </div>
                      <div className="input-group">
                        <label>Allowed File Types</label>
                        <input type="text" className="input" defaultValue="pdf, ppt, pptx, doc, docx, jpg, png, zip" />
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => showToast('success', 'Settings saved!', '')}>Save Changes</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Chatbot botName="AdminBot" />
    </div>
  );
};

export default AdminDashboard;
