import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import BackgroundCanvas from '../components/BackgroundCanvas';
import Chatbot from '../components/Chatbot';
import api from '../services/api';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('sec-home'); // 'sec-home' | 'sec-notes' | 'sec-bookmarks' | 'sec-profile' | 'sec-subject-detail'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Notes data states
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [subjectNotes, setSubjectNotes] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState({ name: '', teacher: '' });
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState('all');

  // Preview Modal states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Profile fields (inputs)
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    rollNumber: '',
    enrolmentNo: '',
    branch: '',
    section: '',
    year: '',
    phone: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Notifications bell dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);

  // Setup profile inputs once user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        rollNumber: user.rollNumber || '',
        enrolmentNo: user.enrolmentNo || '',
        branch: user.branch || '',
        section: user.section || '',
        year: user.year || '',
        phone: user.phone || ''
      });
      loadNotifications();
    }
  }, [user]);

  // Load notes list on load
  useEffect(() => {
    loadNotes();
    loadBookmarks();
  }, []);

  const loadNotes = async (query = '') => {
    try {
      const res = await api.get(`/notes${query}`);
      if (res.data.success) {
        setNotes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load notes', err);
    }
  };

  const loadBookmarks = async () => {
    try {
      const res = await api.get('/bookmarks');
      if (res.data.success) {
        setBookmarks(res.data.data.map(b => b.note ? b.note._id : null));
      }
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await api.put('/notifications/read');
      loadNotifications();
      showToast('success', 'Marked read', 'All notifications marked as read.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookmarkToggle = async (noteId) => {
    const isBookmarked = bookmarks.includes(noteId);
    try {
      const res = await api.post(`/bookmarks/${noteId}`);
      if (res.data.success) {
        showToast(
          res.data.bookmarked ? 'success' : 'info',
          res.data.bookmarked ? '⭐ Bookmarked!' : 'Bookmark removed',
          ''
        );
        loadBookmarks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filterBySubject = async (sub, teacher) => {
    setActiveSection('sec-subject-detail');
    setSelectedSubject({ name: sub, teacher: teacher });
    setSubjectLoading(true);
    setSubjectNotes([]);

    try {
      const res = await api.get(`/notes?subject=${encodeURIComponent(sub)}`);
      if (res.data.success) {
        setSubjectNotes(res.data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error', 'Failed to load subject notes.');
    } finally {
      setSubjectLoading(false);
    }
  };

  // Preview logic
  const handlePreview = async (note) => {
    setPreviewNote(note);
    setPreviewUrl('');
    setPreviewLoading(true);
    setPreviewOpen(true);

    const fileType = (note.fileType || '').toUpperCase();
    const url = `${api.defaults.baseURL}/notes/${note._id}/preview`;

    try {
      // Increment view count
      api.post(`/notes/${note._id}/view`);

      if (fileType === 'IMAGE' || fileType === 'PDF') {
        const resp = await fetch(url, {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nb_token')}` }
        });
        if (resp.ok) {
          const blob = await resp.blob();
          const objUrl = URL.createObjectURL(blob);
          setPreviewUrl(objUrl);
        } else {
          setPreviewUrl('error');
        }
      }
    } catch (err) {
      console.error(err);
      setPreviewUrl('error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (note) => {
    showToast('info', 'Download started!', `Downloading "${note.title}"…`);
    try {
      const res = await fetch(`${api.defaults.baseURL}/notes/${note._id}/download`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('nb_token')}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        const cd = res.headers.get('Content-Disposition');
        const match = cd && cd.match(/filename="?([^"]+)"?/);
        a.download = match ? match[1] : note.title;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('success', 'Downloaded!', `"${note.title}" saved successfully.`);
        // Reload notes to update count
        loadNotes();
      } else {
        showToast('error', 'Download failed', 'File could not be downloaded.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Download error', 'An error occurred while downloading.');
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);

    const updatedData = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      rollNumber: profileData.rollNumber,
      enrolmentNo: profileData.enrolmentNo,
      branch: profileData.branch,
      section: profileData.section,
      year: profileData.year,
      phone: profileData.phone
    };

    try {
      const res = await api.put('/users/profile', updatedData);
      if (res.data.success) {
        showToast('success', 'Profile Updated', 'Your personal information has been saved successfully!');
        // Update auth state storage
        const newUser = { ...user, ...updatedData };
        sessionStorage.setItem('nb_user', JSON.stringify(newUser));
      } else {
        showToast('error', 'Update Failed', res.data.message || 'Could not update profile.');
      }
    } catch (err) {
      console.error(err);
      showToast('success', 'Profile Saved Locally', 'Changes saved successfully.');
      const newUser = { ...user, ...updatedData };
      sessionStorage.setItem('nb_user', JSON.stringify(newUser));
    } finally {
      setProfileSaving(false);
    }
  };

  // Helper values
  const userInitials = user ? ((user.firstName?.[0] || '') + (user.lastName?.[0] || '')).toUpperCase() : 'RS';
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Student';
  const userRole = user ? `${user.branch || 'CSE'} · ${user.year || '3rd Year'}` : 'CSE Department';

  // Greeting based on time
  const hour = new Date().getHours();
  let greetingText = 'Good evening';
  if (hour < 12) greetingText = 'Good morning';
  else if (hour < 17) greetingText = 'Good afternoon';

  const typeEmojis = { PDF: '📄', PPT: '📊', DOC: '📝', Image: '🖼️', ZIP: '🗜️' };
  const typeColors = { PDF: 'file-pdf', PPT: 'file-ppt', DOC: 'file-doc', Image: 'file-img', ZIP: 'file-zip' };

  // Section chip filter logic
  const handleChipClick = (val) => {
    setActiveChip(val);
  };

  const getFilteredNotes = () => {
    let filtered = [...notes];

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.subject && n.subject.toLowerCase().includes(q))
      );
    }

    // Chip filter — activeChip is now the full subject name string
    if (activeChip !== 'all') {
      filtered = filtered.filter(n =>
        n.subject && n.subject === activeChip
      );
    }

    return filtered;
  };

  const filteredNotes = getFilteredNotes();
  const bookmarkedNotes = notes.filter(n => bookmarks.includes(n._id));

  // Date formatting helper
  const formatDateStr = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
              <div className="sidebar-logo-sub">Student Portal</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section-label">Main Menu</div>
            <div
              className={`nav-item ${activeSection === 'sec-home' || activeSection === 'sec-subject-detail' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-home'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">🏠</span> Home
            </div>
            <div
              className={`nav-item ${activeSection === 'sec-notes' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-notes'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">📚</span> Browse Notes
            </div>
            <div
              className={`nav-item ${activeSection === 'sec-bookmarks' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-bookmarks'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">⭐</span> Bookmarks
            </div>

            <div className="nav-section-label">Account</div>
            <div
              className={`nav-item ${activeSection === 'sec-profile' ? 'active' : ''}`}
              onClick={() => { setActiveSection('sec-profile'); setSidebarOpen(false); }}
            >
              <span className="nav-icon">👤</span> My Profile
            </div>
            <div className="nav-item" onClick={handleSignOut}>
              <span className="nav-icon">🚪</span> Sign Out
            </div>
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user" onClick={() => setActiveSection('sec-profile')}>
              <div className="avatar-placeholder avatar-md" style={{ borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))' }}>
                {userInitials}
              </div>
              <div>
                <div className="user-name">{userName}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main-content">
          {/* Header */}
          <header className="navbar">
            <div className="navbar-left">
              <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>☰</button>
            </div>
            <div className="navbar-right">
              {/* Notification bell */}
              <div
                className="navbar-icon-btn"
                id="notif-bell"
                title="Notifications"
                onClick={() => setNotifOpen(!notifOpen)}
                style={{ position: 'relative' }}
              >
                🔔
                {notifs.filter(n => !n.isRead).length > 0 && (
                  <span className="notif-dot" id="notif-badge">
                    {notifs.filter(n => !n.isRead).length}
                  </span>
                )}

                {/* Dropdown */}
                {notifOpen && (
                  <div className="notif-dropdown open" id="notif-dropdown" style={{ top: '100%', right: 0 }} onClick={(e) => e.stopPropagation()}>
                    <div className="notif-header">
                      <span style={{ fontWeight: 700, fontSize: '.9rem' }}>Notifications</span>
                      <button className="btn btn-ghost btn-sm" id="notif-mark-all" onClick={markNotificationsRead}>
                        Mark all read
                      </button>
                    </div>
                    <div className="notif-list" id="notif-list-container">
                      {notifs.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifs.map(n => (
                          <div key={n._id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                            <div className="notif-icon" style={{ background: 'var(--primary-light)' }}>
                              {n.type === 'note_approved' ? '✅' : '📢'}
                            </div>
                            <div className="notif-text">
                              <strong>{n.title}</strong>
                              <div>{n.message}</div>
                            </div>
                            <div className="notif-time">{formatDateStr(n.createdAt)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                className="avatar-placeholder avatar-md"
                style={{ borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', cursor: 'pointer' }}
                onClick={() => setActiveSection('sec-profile')}
              >
                {userInitials}
              </div>
            </div>
          </header>

          <main className="page-body">
            {/* ── HOME SECTION ── */}
            {(activeSection === 'sec-home') && (
              <div id="sec-home">
                {/* Greeting */}
                <div className="page-header">
                  <div>
                    <div className="page-title">{greetingText}, {user?.firstName}! 👋</div>
                    <div className="page-subtitle">Your personalized NoteBridge dashboard</div>
                  </div>
                </div>

                {/* Subjects & Teachers Grid */}
                <div id="sec-subjects" style={{ marginBottom: '2rem' }}>
                  <div className="page-header">
                    <div>
                      <div className="page-title" style={{ fontSize: '1.25rem' }}>My Subjects & Teachers 📖</div>
                      <div className="page-subtitle">Your curriculum and assigned faculty</div>
                    </div>
                  </div>
                  <div className="grid grid-auto gap-4">
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(59,130,246,0.3)' }} onClick={() => filterBySubject('Node JS Lab - Practical', 'Prof. Samar Khan Mam')}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Node JS Lab - Practical</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Samar Khan Mam</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(16,185,129,0.3)' }} onClick={() => filterBySubject('R Programming Lab - Practical', 'Prof. Ankita Bhagat')}>
                      <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>R Programming Lab - Practical</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Ankita Bhagat</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(139,92,246,0.3)' }} onClick={() => filterBySubject('AI & DS Lab - Practical', 'Prof. Poonam Pawar')}>
                      <div style={{ fontWeight: 700, color: 'var(--purple)', marginBottom: '4px' }}>AI & DS Lab - Practical</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Poonam Pawar</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(245,158,11,0.3)' }} onClick={() => filterBySubject('Computer Network Lab - Practical', 'Prof. Pinky Dembla')}>
                      <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '4px' }}>Computer Network Lab - Practical</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Pinky Dembla</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(59,130,246,0.3)' }} onClick={() => filterBySubject('AI & DS - Theory', 'Dr. Ajay Gadicha')}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>AI & DS - Theory</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dr. Ajay Gadicha</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(16,185,129,0.3)' }} onClick={() => filterBySubject('Reasoning & Thinking (OE II) - Theory', 'Prof. Nikhil Belokar')}>
                      <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>Reasoning & Thinking (OE II) - Theory</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Nikhil Belokar</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(139,92,246,0.3)' }} onClick={() => filterBySubject('Computer Network - Theory', 'Prof. Poonam Pawar')}>
                      <div style={{ fontWeight: 700, color: 'var(--purple)', marginBottom: '4px' }}>Computer Network - Theory</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Poonam Pawar</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(245,158,11,0.3)' }} onClick={() => filterBySubject('Universal Human Values - Theory', 'Prof. Suvarna Virulkar')}>
                      <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '4px' }}>Universal Human Values - Theory</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Suvarna Virulkar</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(59,130,246,0.3)' }} onClick={() => filterBySubject('Operating System', 'Dr. Mohini Mohod')}>
                      <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>Operating System</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dr. Mohini Mohod</div>
                    </div>
                    <div className="stat-card hover-lift" style={{ cursor: 'pointer', background: 'var(--glass)', border: '1px solid rgba(16,185,129,0.3)' }} onClick={() => filterBySubject('MDM - IoT', 'Prof. Sneha Tingane')}>
                      <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>MDM - IoT</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prof. Sneha Tingane</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── BROWSE NOTES SECTION ── */}
            {activeSection === 'sec-notes' && (
              <div id="sec-notes">
                <div className="page-header">
                  <div>
                    <div className="page-title">Browse Notes 📚</div>
                    <div className="page-subtitle">Search and study shared notes</div>
                  </div>
                  {/* Search input in header */}
                  <div className="search-bar" style={{ maxWidth: '280px' }}>
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Search notes or subject…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Filter chips bar — dynamic, built from real note subjects */}
                <div className="filter-bar">
                  <div
                    className={`filter-chip ${activeChip === 'all' ? 'active' : ''}`}
                    onClick={() => handleChipClick('all')}
                  >
                    All
                  </div>
                  {[...new Set(notes.map(n => n.subject).filter(Boolean))].map(subject => (
                    <div
                      key={subject}
                      className={`filter-chip ${activeChip === subject ? 'active' : ''}`}
                      onClick={() => handleChipClick(subject)}
                    >
                      {subject}
                    </div>
                  ))}
                </div>

                {/* Notes Grid */}
                <div className="grid grid-auto gap-4" id="all-notes-grid">
                  {filteredNotes.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No notes found.</div>
                  ) : (
                    filteredNotes.map(n => {
                      const t = n.fileType || 'PDF';
                      const isNew = (Date.now() - new Date(n.createdAt).getTime()) < 86400000;
                      const teacherName = n.uploadedBy ? `${n.uploadedBy.firstName} ${n.uploadedBy.lastName}` : 'Admin';
                      const isBookmarked = bookmarks.includes(n._id);

                      return (
                        <div className="note-card hover-lift" id={`nc-${n._id}`} key={n._id}>
                          {isNew && <span className="badge badge-new" style={{ position: 'absolute', top: '12px', right: '12px' }}>🟢 New</span>}
                          <div className="note-card-icon" style={{ background: 'var(--primary-light)' }}>
                            {typeEmojis[t] || '📄'}
                          </div>
                          <div className="note-card-title">{n.title}</div>
                          <div className="note-card-sub">📖 {n.subject} · 👤 {teacherName}</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                            <span className={`file-type-badge ${typeColors[t] || 'file-pdf'}`}>{t}</span>
                            <span className="badge badge-gray">📅 {formatDateStr(n.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                            <span>👁 {n.views || 0} views</span>
                            <span>⬇ {n.downloads || 0} downloads</span>
                          </div>
                          <div className="note-card-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => handlePreview(n)}>👀 Preview</button>
                            <button className="btn btn-outline btn-sm" onClick={() => handleDownload(n)}>⬇ Download</button>
                            <button
                              className={`btn btn-icon btn-sm ${isBookmarked ? 'btn-bookmark-active' : ''}`}
                              onClick={() => handleBookmarkToggle(n._id)}
                              title="Bookmark"
                              style={{ color: isBookmarked ? 'var(--warning)' : '' }}
                            >
                              <span style={{ fontSize: '1.1rem' }}>⭐</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── BOOKMARKS SECTION ── */}
            {activeSection === 'sec-bookmarks' && (
              <div id="sec-bookmarks">
                <div className="page-header">
                  <div>
                    <div className="page-title">My Bookmarks ⭐</div>
                    <div className="page-subtitle">{bookmarkedNotes.length} saved notes</div>
                  </div>
                </div>
                <div className="grid grid-auto gap-4" id="bookmark-grid">
                  {bookmarkedNotes.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No bookmarked notes yet.</div>
                  ) : (
                    bookmarkedNotes.map(n => {
                      const t = n.fileType || 'PDF';
                      const teacherName = n.uploadedBy ? `${n.uploadedBy.firstName} ${n.uploadedBy.lastName}` : 'Admin';

                      return (
                        <div className="note-card hover-lift" id={`nc-${n._id}`} key={n._id}>
                          <div className="note-card-icon" style={{ background: 'var(--primary-light)' }}>
                            {typeEmojis[t] || '📄'}
                          </div>
                          <div className="note-card-title">{n.title}</div>
                          <div className="note-card-sub">📖 {n.subject} · 👤 {teacherName}</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                            <span className={`file-type-badge ${typeColors[t] || 'file-pdf'}`}>{t}</span>
                            <span className="badge badge-gray">📅 {formatDateStr(n.createdAt)}</span>
                          </div>
                          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                            <span>👁 {n.views || 0} views</span>
                            <span>⬇ {n.downloads || 0} downloads</span>
                          </div>
                          <div className="note-card-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => handlePreview(n)}>👀 Preview</button>
                            <button className="btn btn-outline btn-sm" onClick={() => handleDownload(n)}>⬇ Download</button>
                            <button
                              className="btn btn-icon btn-sm btn-bookmark-active"
                              onClick={() => handleBookmarkToggle(n._id)}
                              title="Bookmark"
                              style={{ color: 'var(--warning)' }}
                            >
                              <span style={{ fontSize: '1.1rem' }}>⭐</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── SUBJECT DETAIL SECTION ── */}
            {activeSection === 'sec-subject-detail' && (
              <div id="sec-subject-detail">
                <div className="page-header">
                  <div>
                    <div className="page-title" id="detail-subject-name">{selectedSubject.name}</div>
                    <div className="page-subtitle" id="detail-subject-teacher">
                      {selectedSubject.teacher ? `👩‍🏫 ${selectedSubject.teacher}` : ''}
                    </div>
                  </div>
                  <button className="btn btn-ghost" onClick={() => setActiveSection('sec-home')}>
                    ← Back to Subjects
                  </button>
                </div>

                <div className="card-solid">
                  <div className="card-header">
                    <strong>📂 Available Notes & Study Material</strong>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Note Name</th>
                          <th>Type</th>
                          <th>Upload Date</th>
                          <th>Faculty</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="subject-notes-table">
                        {subjectLoading ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              Loading notes...
                            </td>
                          </tr>
                        ) : subjectNotes.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              No notes available for this subject yet. Check back later!
                            </td>
                          </tr>
                        ) : (
                          subjectNotes.map(n => (
                            <tr key={n._id}>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</div>
                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {n.description ? n.description.slice(0, 60) + '...' : ''}
                                </div>
                              </td>
                              <td>
                                <span className={`file-type-badge ${typeColors[n.fileType] || 'file-pdf'}`}>
                                  {n.fileType || 'PDF'}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {formatDateStr(n.createdAt)}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.8rem' }}>
                                  {n.uploadedBy ? `${n.uploadedBy.firstName} ${n.uploadedBy.lastName}` : 'Admin'}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn btn-primary btn-sm" style={{ marginRight: '6px' }} onClick={() => handlePreview(n)}>👀 View</button>
                                <button className="btn btn-outline btn-sm" onClick={() => handleDownload(n)}>⬇ Download</button>
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

            {/* ── PROFILE SECTION ── */}
            {activeSection === 'sec-profile' && (
              <div id="sec-profile" style={{ padding: 0 }}>
                <div className="page-header">
                  <div>
                    <div className="page-title">My Profile 👤</div>
                    <div className="page-subtitle">Manage your personal information</div>
                  </div>
                </div>
                <div className="card-solid" style={{ maxWidth: '600px' }}>
                  <form className="card-body" onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div
                        className="avatar-placeholder avatar-md"
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg,var(--primary),var(--accent))',
                          color: 'white',
                          fontSize: '2rem',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700
                        }}
                      >
                        {userInitials}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => document.getElementById('avatar-upload').click()}
                        >
                          Upload New Image
                        </button>
                        <input
                          type="file"
                          id="avatar-upload"
                          style={{ display: 'none' }}
                          accept="image/*"
                          onChange={() => showToast('info', 'Image selected', 'Click Save Profile to upload.')}
                        />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                          Format: JPG, PNG. Max size: 2MB.
                        </div>
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        className="input"
                        value={`${profileData.firstName} ${profileData.lastName}`}
                        disabled
                      />
                    </div>
                    <div className="input-group">
                      <label>Email</label>
                      <input
                        type="email"
                        className="input"
                        value={profileData.email}
                        disabled
                      />
                    </div>
                    <div className="form-row2">
                      <div className="input-group">
                        <label>Roll Number</label>
                        <input
                          type="text"
                          className="input"
                          value={profileData.rollNumber}
                          disabled
                        />
                      </div>
                      <div className="input-group">
                        <label>Enrolment No</label>
                        <input
                          type="text"
                          className="input"
                          value={profileData.enrolmentNo}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="form-row2">
                      <div className="input-group">
                        <label>Branch</label>
                        <input
                          type="text"
                          className="input"
                          value={profileData.branch}
                          disabled
                        />
                      </div>
                      <div className="input-group">
                        <label>Section</label>
                        <input
                          type="text"
                          className="input"
                          value={profileData.section}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        className="input"
                        value={profileData.phone}
                        disabled
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={profileSaving}
                      >
                        {profileSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="modal-overlay open" id="modal-preview">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title" id="preview-title">
                {previewNote ? previewNote.title : 'Note Preview'}
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-primary btn-sm"
                  id="modal-download-btn"
                  onClick={() => handleDownload(previewNote)}
                >
                  ⬇ Download
                </button>
                <span className="modal-close" onClick={() => setPreviewOpen(false)}>✕</span>
              </div>
            </div>
            <div className="modal-body" style={{ padding: '1rem' }}>
              <div id="preview-container">
                {previewLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading preview...
                  </div>
                ) : previewUrl === 'error' ? (
                  <div className="preview-unsupported">
                    <div className="preview-icon">❌</div>
                    <div>Could not load preview. Please download the file to view it.</div>
                  </div>
                ) : (previewNote && (previewNote.fileType || '').toUpperCase() === 'IMAGE') ? (
                  <img src={previewUrl} className="preview-img" alt={previewNote.title} />
                ) : (previewNote && (previewNote.fileType || '').toUpperCase() === 'PDF') ? (
                  <object data={previewUrl} type="application/pdf" className="preview-embed">
                    <p style={{ padding: '1rem' }}>
                      PDF preview not supported in your browser.{' '}
                      <a href={previewUrl} target="_blank" rel="noreferrer">Open in new tab</a>
                    </p>
                  </object>
                ) : (
                  <div className="preview-unsupported">
                    <div className="preview-icon">
                      {previewNote && previewNote.fileType === 'PPT' ? '📊' : previewNote && previewNote.fileType === 'DOC' ? '📝' : '📦'}
                    </div>
                    <div><strong>{previewNote?.title}</strong></div>
                    <div>Direct preview not available for {previewNote?.fileType || 'this file type'}.</div>
                    <div style={{ marginTop: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleDownload(previewNote)}>
                        ⬇ Download to View
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                <span className="badge badge-success">✅ Final Verified Version</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Bubble */}
      <Chatbot botName="NoteBot" />
    </div>
  );
};

export default StudentDashboard;
