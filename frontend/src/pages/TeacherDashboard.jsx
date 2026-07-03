import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import BackgroundCanvas from '../components/BackgroundCanvas';
import Chatbot from '../components/Chatbot';
import api from '../services/api';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('sec-home'); // 'sec-home' | 'sec-upload' | 'sec-mynotes' | 'sec-analytics'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Notes data states
  const [myNotes, setMyNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload Form states
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [noteBranch, setNoteBranch] = useState('');
  const [noteYear, setNoteYear] = useState('');
  const [noteSection, setNoteSection] = useState('All');
  const [noteDesc, setNoteDesc] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // Chart instances ref to prevent duplicate initialization
  const barChartRef = useRef(null);
  const doughnutChartRef = useRef(null);

  useEffect(() => {
    loadMyNotes();
  }, []);

  const loadMyNotes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notes/teacher/my');
      if (res.data.success) {
        setMyNotes(res.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to load uploaded notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();

    if (!noteTitle || !noteSubject) {
      showToast('error', 'Missing fields', 'Please fill title and subject.');
      return;
    }
    if (!uploadFile) {
      showToast('error', 'No file', 'Please attach a file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', noteTitle);
    formData.append('subject', noteSubject);
    formData.append('description', noteDesc);
    formData.append('department', user?.department || 'CSE');
    if (noteBranch) formData.append('branch', noteBranch);
    if (noteYear) formData.append('year', noteYear);
    if (noteSection) formData.append('section', noteSection);
    formData.append('file', uploadFile);

    showToast('info', 'Uploading...', 'Please wait while note is being uploaded.');
    try {
      const res = await api.post('/notes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        const sectionLabel = (noteSection && noteSection !== 'All') ? `Section ${noteSection}` : 'All Sections';
        showToast('success', 'Notes Live! ✅', `"${noteTitle}" shared with ${sectionLabel}.`);
        
        // Reset form
        setNoteTitle('');
        setNoteSubject('');
        setNoteBranch('');
        setNoteYear('');
        setNoteSection('All');
        setNoteDesc('');
        setUploadFile(null);

        // Reload data and show list
        await loadMyNotes();
        setActiveSection('sec-mynotes');
      } else {
        showToast('error', 'Upload Failed', res.data.message || 'Error occurred.');
      }
    } catch (err) {
      showToast('error', 'Upload Error', err.response?.data?.message || 'Could not connect to server.');
      console.error(err);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const res = await api.delete(`/notes/${id}`);
      if (res.data.success) {
        showToast('success', 'Deleted', 'Note removed.');
        loadMyNotes();
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to delete note.');
    }
  };

  // Render analytics charts via window.Chart
  useEffect(() => {
    if (activeSection === 'sec-analytics' && window.Chart && myNotes.length > 0) {
      // Destroy existing charts
      if (barChartRef.current) barChartRef.current.destroy();
      if (doughnutChartRef.current) doughnutChartRef.current.destroy();

      // Chart 1: Top Notes by Views
      const topNotes = [...myNotes].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
      const labelsTop = topNotes.map(n => n.title.length > 15 ? n.title.substring(0, 15) + '...' : n.title);
      const dataViews = topNotes.map(n => n.views || 0);
      const dataDl = topNotes.map(n => n.downloads || 0);

      const cm = document.getElementById('chart-monthly');
      if (cm) {
        barChartRef.current = new window.Chart(cm, {
          type: 'bar',
          data: {
            labels: labelsTop.length ? labelsTop : ['No Data'],
            datasets: [
              { label: 'Views', data: dataViews, backgroundColor: 'rgba(59,130,246,.7)', borderRadius: 6 },
              { label: 'Downloads', data: dataDl, backgroundColor: 'rgba(99,102,241,.7)', borderRadius: 6 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { size: 11 } } } },
            scales: {
              y: { beginAtZero: true, ticks: { font: { size: 11 } } },
              x: { grid: { display: false }, ticks: { font: { size: 11 } } }
            }
          }
        });
      }

      // Chart 2: Views by Subject
      const subjMap = {};
      myNotes.forEach(n => {
        const s = n.subject || 'Unknown';
        if (!subjMap[s]) subjMap[s] = 0;
        subjMap[s] += (n.views || 0);
      });
      const labelsSubj = Object.keys(subjMap);
      const dataSubj = Object.values(subjMap);

      const cp = document.getElementById('chart-pie');
      if (cp) {
        doughnutChartRef.current = new window.Chart(cp, {
          type: 'doughnut',
          data: {
            labels: labelsSubj.length ? labelsSubj : ['No Data'],
            datasets: [{
              data: dataSubj.length ? dataSubj : [1],
              backgroundColor: ['#3B82F6', '#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'],
              borderWidth: 2,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } }
          }
        });
      }
    }

    return () => {
      if (barChartRef.current) barChartRef.current.destroy();
      if (doughnutChartRef.current) doughnutChartRef.current.destroy();
    };
  }, [activeSection, myNotes]);

  // View state helpers
  const teacherInitials = user ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() : 'PD';
  const teacherName = user ? `Prof. ${user.firstName} ${user.lastName}` : 'Teacher';
  const teacherDept = user ? `${user.department || 'CSE'} Department` : 'CSE Department';

  // Stats calculation
  const totalUploadsCount = myNotes.length;
  let totalViewsCount = 0;
  let totalDownloadsCount = 0;
  myNotes.forEach(n => {
    totalViewsCount += (n.views || 0);
    totalDownloadsCount += (n.downloads || 0);
  });

  const statusBadge = (s) => {
    if (s === 'approved') return <span className="badge badge-success">✅ Approved</span>;
    if (s === 'rejected') return <span className="badge badge-danger">❌ Rejected</span>;
    return <span className="badge badge-warning">⏳ Pending</span>;
  };

  const typeToClass = { PDF: 'file-pdf', PPT: 'file-ppt', DOC: 'file-doc', Image: 'file-img', ZIP: 'file-zip' };

  const formatDateStr = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
              <div className="sidebar-logo-sub">Teacher Portal</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section-label">Teacher Menu</div>
            <div 
              className={`nav-item ${activeSection === 'sec-home' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-home'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">🏠</span> Dashboard
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-upload' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-upload'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">📂</span> Upload Notes
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-mynotes' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-mynotes'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">📋</span> My Notes
            </div>
            <div 
              className={`nav-item ${activeSection === 'sec-analytics' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-analytics'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">📊</span> Analytics
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
                  background: 'linear-gradient(135deg,var(--accent),var(--purple))', 
                  fontSize: '.85rem', 
                  fontWeight: 700, 
                  color: 'white', 
                  width: '40px', 
                  height: '40px', 
                  display: 'grid', 
                  placeItems: 'center' 
                }}
              >
                {teacherInitials}
              </div>
              <div>
                <div className="user-name">{teacherName}</div>
                <div className="user-role">{teacherDept}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content body */}
        <div className="main-content">
          <header className="navbar">
            <div className="navbar-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
            </div>
            <div className="navbar-right">
              <button className="btn btn-gradient btn-sm" onClick={() => setActiveSection('sec-upload')}>
                + Upload Notes
              </button>
              <div 
                className="avatar-placeholder" 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg,var(--accent),var(--purple))', 
                  fontSize: '.85rem', 
                  fontWeight: 700, 
                  color: 'white', 
                  display: 'grid', 
                  placeItems: 'center', 
                  cursor: 'pointer' 
                }}
                onClick={() => setActiveSection('sec-mynotes')}
              >
                {teacherInitials}
              </div>
            </div>
          </header>

          <main className="page-body">
            {/* ── HOME SECTION ── */}
            {activeSection === 'sec-home' && (
              <div id="sec-home">
                <div className="page-header">
                  <div>
                    <div className="page-title">Welcome, {user?.firstName || 'Teacher'}! 👩‍🏫</div>
                    <div className="page-subtitle">Here's your teaching activity overview</div>
                  </div>
                  <button className="btn btn-gradient" onClick={() => setActiveSection('sec-upload')}>
                    + Upload New Notes
                  </button>
                </div>

                <div className="grid grid-3 gap-4" style={{ marginBottom: '2rem' }}>
                  <div className="stat-card blue animate-fadeInUp">
                    <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>📂</div>
                    <div className="stat-value" id="stat-uploads">{totalUploadsCount}</div>
                    <div className="stat-label">Total Uploads</div>
                  </div>
                  <div className="stat-card green animate-fadeInUp delay-100">
                    <div className="stat-icon" style={{ background: 'var(--success-light)' }}>👁</div>
                    <div className="stat-value" id="stat-views">{totalViewsCount}</div>
                    <div className="stat-label">Total Views</div>
                  </div>
                  <div className="stat-card yellow animate-fadeInUp delay-200">
                    <div className="stat-icon" style={{ background: 'var(--warning-light)' }}>⬇️</div>
                    <div className="stat-value" id="stat-downloads">{totalDownloadsCount}</div>
                    <div className="stat-label">Downloads</div>
                  </div>
                </div>

                {/* Recent Uploads Table */}
                <div className="card-solid">
                  <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>🕐 Recent Uploads</strong>
                    <button className="btn btn-ghost btn-sm" onClick={() => setActiveSection('sec-mynotes')}>
                      View All →
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Views</th>
                          <th>Downloads</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="recent-table">
                        {loading ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '1rem' }}>Loading notes...</td>
                          </tr>
                        ) : myNotes.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: 'center', padding: '1rem' }}>No notes uploaded yet.</td>
                          </tr>
                        ) : (
                          myNotes.slice(0, 4).map(n => (
                            <tr key={n._id}>
                              <td><span style={{ fontWeight: 600 }}>{n.title}</span></td>
                              <td><span className="badge badge-gray">{n.subject}</span></td>
                              <td>
                                <span className={`file-type-badge ${typeToClass[n.fileType] || 'file-pdf'}`}>
                                  {n.fileType || 'PDF'}
                                </span>
                              </td>
                              <td>{statusBadge(n.status)}</td>
                              <td>{formatDateStr(n.createdAt)}</td>
                              <td>{n.views || 0}</td>
                              <td>{n.downloads || 0}</td>
                              <td className="table-actions">
                                <button className="btn btn-outline btn-sm" onClick={() => showToast('info', 'View Mode', 'Note is live for students.')}>👁</button>
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

            {/* ── UPLOAD NOTES SECTION ── */}
            {activeSection === 'sec-upload' && (
              <div id="sec-upload">
                <div className="page-header">
                  <div>
                    <div className="page-title">Upload Notes 📂</div>
                    <div className="page-subtitle">Share knowledge with your students</div>
                  </div>
                </div>
                <div className="grid grid-2 gap-4" style={{ alignItems: 'start' }}>
                  <div className="card-solid">
                    <div className="card-header">
                      <strong>📎 Upload Files</strong>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div 
                        className="upload-zone" 
                        id="upload-zone"
                        onClick={() => document.getElementById('file-input').click()}
                      >
                        <div className="upload-zone-icon">☁️</div>
                        <div className="upload-zone-title">Click to select files</div>
                        <div className="upload-zone-sub">Supports PDF, PPT, DOC, Images, ZIP · Max 50MB per file</div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <span className="file-type-badge file-pdf">PDF</span>
                          <span className="file-type-badge file-ppt">PPT</span>
                          <span className="file-type-badge file-doc">DOC</span>
                          <span className="file-type-badge file-img">IMG</span>
                          <span className="file-type-badge file-zip">ZIP</span>
                        </div>
                        <input 
                          type="file" 
                          id="file-input" 
                          style={{ display: 'none' }} 
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.zip"
                          onChange={handleFileChange}
                          required
                        />
                      </div>
                      
                      {uploadFile && (
                        <div id="upload-preview" style={{ flexWrap: 'wrap', gap: '8px', display: 'flex' }}>
                          <span className="badge badge-primary">
                            📎 {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button className="btn btn-primary btn-lg w-full" onClick={handleUpload}>
                          🚀 Upload Notes
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="card-solid">
                    <div className="card-header">
                      <strong>📋 Note Details</strong>
                    </div>
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="input-group">
                        <label>Note Title *</label>
                        <input 
                          type="text" 
                          className="input" 
                          placeholder="e.g. Node JS - Unit 1 Practical" 
                          id="note-title"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="input-group">
                        <label>Subject *</label>
                        <select 
                          className="select" 
                          id="note-subject"
                          value={noteSubject}
                          onChange={(e) => setNoteSubject(e.target.value)}
                          required
                        >
                          <option value="">Select Subject</option>
                          <option>Node JS Lab - Practical</option>
                          <option>R Programming Lab - Practical</option>
                          <option>AI & DS Lab - Practical</option>
                          <option>Computer Network Lab - Practical</option>
                          <option>AI & DS - Theory</option>
                          <option>Reasoning & Thinking (OE II) - Theory</option>
                          <option>Computer Network - Theory</option>
                          <option>Universal Human Values - Theory</option>
                          <option>Operating System</option>
                          <option>MDM - IoT</option>
                        </select>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="input-group">
                          <label>Branch</label>
                          <select 
                            className="select" 
                            id="note-branch"
                            value={noteBranch}
                            onChange={(e) => setNoteBranch(e.target.value)}
                          >
                            <option value="">All Branches</option>
                            <option>AI&DS</option>
                            <option>CSE</option>
                            <option>AI&ML</option>
                            <option>E&TC</option>
                            <option>MECH</option>
                            <option>CIVIL</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Year/Sem</label>
                          <select 
                            className="select" 
                            id="note-year"
                            value={noteYear}
                            onChange={(e) => setNoteYear(e.target.value)}
                          >
                            <option value="">All Years</option>
                            <option>FE – Sem 1</option>
                            <option>FE – Sem 2</option>
                            <option>SE – Sem 3</option>
                            <option>SE – Sem 4</option>
                            <option>TE – Sem 5</option>
                            <option>TE – Sem 6</option>
                            <option>BE – Sem 7</option>
                            <option>BE – Sem 8</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="input-group">
                          <label>Section (Target) 🎯</label>
                          <select 
                            className="select" 
                            id="note-section"
                            value={noteSection}
                            onChange={(e) => setNoteSection(e.target.value)}
                          >
                            <option value="All">📢 All Sections</option>
                            <option value="B1">B1</option>
                            <option value="B2">B2</option>
                            <option value="B3">B3</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>ℹ️ Tip</label>
                          <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', padding: '.5rem', background: 'var(--gray-100)', borderRadius: 'var(--radius-md)', lineHeight: '1.4' }}>
                            Select a specific section to share only with B1, B2 etc. Choose <strong>All Sections</strong> to share with everyone.
                          </div>
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Description</label>
                        <textarea 
                          className="input" 
                          id="note-desc" 
                          rows="3" 
                          placeholder="Brief description of note content…"
                          value={noteDesc}
                          onChange={(e) => setNoteDesc(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MY NOTES SECTION ── */}
            {activeSection === 'sec-mynotes' && (
              <div id="sec-mynotes">
                <div className="page-header">
                  <div>
                    <div className="page-title">My Uploaded Notes 📋</div>
                  </div>
                  <button className="btn btn-gradient" onClick={() => setActiveSection('sec-upload')}>
                    + Upload New
                  </button>
                </div>
                <div className="card-solid">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Subject</th>
                          <th>Section</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Views</th>
                          <th>DL</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="my-notes-table">
                        {loading ? (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '1rem' }}>Loading notes...</td>
                          </tr>
                        ) : myNotes.length === 0 ? (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '1rem' }}>No notes uploaded yet.</td>
                          </tr>
                        ) : (
                          myNotes.map(n => (
                            <tr key={n._id}>
                              <td><span style={{ fontWeight: 600 }}>{n.title}</span></td>
                              <td><span className="badge badge-gray">{n.subject}</span></td>
                              <td>
                                {(!n.section || n.section === 'All') ? (
                                  <span className="badge badge-gray">📢 All</span>
                                ) : (
                                  <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                                    {n.section}
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className={`file-type-badge ${typeToClass[n.fileType] || 'file-pdf'}`}>
                                  {n.fileType || 'PDF'}
                                </span>
                              </td>
                              <td>{statusBadge(n.status)}</td>
                              <td>{formatDateStr(n.createdAt)}</td>
                              <td>{n.views || 0}</td>
                              <td>{n.downloads || 0}</td>
                              <td className="table-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => showToast('info', 'Preview', 'Opening...')}>👁</button>
                                <button className="btn btn-outline btn-sm" onClick={() => showToast('info', 'Note Status', `Visible to ${n.section || 'All'}`)}>✅</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNote(n._id)}>🗑</button>
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

            {/* ── ANALYTICS SECTION ── */}
            {activeSection === 'sec-analytics' && (
              <div id="sec-analytics">
                <div className="page-header">
                  <div>
                    <div className="page-title">Analytics Dashboard 📊</div>
                    <div className="page-subtitle">Track student engagement with your notes</div>
                  </div>
                </div>

                <div className="grid grid-3 gap-4" style={{ marginBottom: '2rem' }}>
                  <div className="stat-card blue">
                    <div className="stat-icon" style={{ background: 'var(--primary-light)' }}>📂</div>
                    <div className="stat-value" id="stat-an-uploads">{totalUploadsCount}</div>
                    <div className="stat-label">Total Uploads</div>
                  </div>
                  <div className="stat-card green">
                    <div className="stat-icon" style={{ background: 'var(--success-light)' }}>👁</div>
                    <div className="stat-value" id="stat-an-views">{totalViewsCount}</div>
                    <div className="stat-label">Total Views</div>
                  </div>
                  <div className="stat-card purple">
                    <div className="stat-icon" style={{ background: 'var(--warning-light)' }}>⬇️</div>
                    <div className="stat-value" id="stat-an-downloads">{totalDownloadsCount}</div>
                    <div className="stat-label">Total Downloads</div>
                  </div>
                </div>

                <div className="grid grid-2 gap-4" style={{ marginBottom: '2rem' }}>
                  <div className="card-solid">
                    <div className="card-header"><strong>📈 Top Notes by Views</strong></div>
                    <div className="card-body">
                      <div className="chart-wrap" style={{ height: '250px' }}>
                        <canvas id="chart-monthly"></canvas>
                      </div>
                    </div>
                  </div>
                  <div className="card-solid">
                    <div className="card-header"><strong>🍩 Views by Subject</strong></div>
                    <div className="card-body">
                      <div className="chart-wrap" style={{ height: '250px' }}>
                        <canvas id="chart-pie"></canvas>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-solid">
                  <div className="card-header"><strong>📋 Per-Note Engagement</strong></div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Note Title</th>
                          <th>Subject</th>
                          <th>Views</th>
                          <th>Downloads</th>
                          <th>Engagement</th>
                        </tr>
                      </thead>
                      <tbody id="analytics-table">
                        {myNotes.length === 0 ? (
                          <tr>
                            <td colSpan="5">No data yet.</td>
                          </tr>
                        ) : (
                          myNotes.map(n => {
                            const v = n.views || 0;
                            const d = n.downloads || 0;
                            const eng = Math.round((d / Math.max(v, 1)) * 100);

                            return (
                              <tr key={n._id}>
                                <td style={{ fontWeight: 600 }}>{n.title}</td>
                                <td><span className="badge badge-gray">{n.subject}</span></td>
                                <td>{v}</td>
                                <td>{d}</td>
                                <td>
                                  <div className="progress-bar" style={{ display: 'inline-block', width: '80px', verticalAlign: 'middle', marginRight: '8px' }}>
                                    <div className="fill fill-blue" style={{ width: `${eng}%` }}></div>
                                  </div>
                                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{eng}%</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <Chatbot botName="NoteBot" />
    </div>
  );
};

export default TeacherDashboard;
