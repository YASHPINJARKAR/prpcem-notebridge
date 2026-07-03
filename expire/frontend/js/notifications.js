/* ============================================================
   PRPCEM NOTES – NoteBridge | Notifications JS
   Bell dropdown, badge counter, toast system
   ============================================================ */

(function () {
  const bell     = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  const badge    = document.getElementById('notif-badge');
  const markAllBtn = document.getElementById('notif-mark-all');
  const listContainer = document.getElementById('notif-list-container');
  
  const API_BASE = 'http://localhost:5000/api';
  let unreadCount = 0;

  if (!bell || !dropdown) return;

  function updateBadge() {
    if (!badge) return;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  function formatTimeAgo(dateString) {
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  }

  function getNotifIcon(type) {
    switch(type) {
      case 'new_note': return { icon: '📂', bg: 'var(--primary-light)' };
      case 'comment': return { icon: '💬', bg: 'var(--success-light)' };
      case 'system': return { icon: '⚙️', bg: 'var(--warning-light)' };
      case 'note_approved': return { icon: '✅', bg: 'var(--success-light)' };
      case 'user_approved': return { icon: '👤', bg: 'var(--success-light)' };
      default: return { icon: '🔔', bg: 'var(--accent-light)' };
    }
  }

  let knownIds = new Set();
  let initialFetchDone = false;

  async function fetchNotifications() {
    const token = sessionStorage.getItem('nb_token');
    if (!token || !listContainer) return;
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        data.data.forEach(n => {
          if (!n.isRead && !knownIds.has(n._id)) {
            if (initialFetchDone) {
              const style = getNotifIcon(n.type);
              showToast('info', '🔔 New Notification', n.title);
              if (bell) {
                bell.classList.add('animate-bellRing');
                setTimeout(() => bell.classList.remove('animate-bellRing'), 700);
              }
            }
            knownIds.add(n._id);
          }
        });
        initialFetchDone = true;

        unreadCount = data.unread;
        updateBadge();
        
        if (data.data.length === 0) {
          listContainer.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.9rem;">No notifications yet</div>';
          return;
        }

        listContainer.innerHTML = data.data.map(n => {
          const style = getNotifIcon(n.type);
          return `
            <div class="notif-item ${n.isRead ? '' : 'unread'}" data-id="${n._id}" style="cursor:pointer;">
              <div class="notif-icon" style="background:${style.bg};">${style.icon}</div>
              <div style="flex:1;">
                <div class="notif-text"><strong>${n.title}</strong></div>
                <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">${n.message}</div>
              </div>
              <div class="notif-time">${formatTimeAgo(n.createdAt)}</div>
            </div>
          `;
        }).join('');

        // Attach click listeners to mark individual read
        document.querySelectorAll('.notif-item').forEach(item => {
          item.addEventListener('click', async () => {
             const id = item.getAttribute('data-id');
             if (item.classList.contains('unread')) {
                item.classList.remove('unread');
                unreadCount = Math.max(0, unreadCount - 1);
                updateBadge();
                await fetch(`${API_BASE}/notifications/${id}/read`, {
                  method: 'PUT',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
             }
          });
        });
      }
    } catch (e) {
      console.error('Notification fetch error', e);
    }
  }

  // Fetch immediately
  fetchNotifications();
  // Poll every 10 seconds for real-time feel
  setInterval(fetchNotifications, 10000);

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
    bell.classList.toggle('animate-bellRing');
    setTimeout(() => bell.classList.remove('animate-bellRing'), 700);
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== bell) {
      dropdown.classList.remove('open');
    }
  });

  markAllBtn && markAllBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem('nb_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        document.querySelectorAll('.notif-item.unread').forEach(item => {
          item.classList.remove('unread');
        });
        unreadCount = 0;
        updateBadge();
        showToast('success', '✓ All notifications marked as read', '');
      }
    } catch(e) { console.error(e); }
  });

})();

/* ── Global Toast System ────────────────────────────────────── */
window.showToast = function (type, title, message, duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-notifSlide`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div>
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-msg">${message}</div>` : ''}
    </div>
    <button onclick="this.parentElement.remove()" style="margin-left:auto;color:var(--text-muted);font-size:1.1rem;cursor:pointer;background:none;border:none;">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(110%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 320);
  }, duration);
};

/* ── Modal Helpers ──────────────────────────────────────────── */
window.openModal = function (id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
};
window.closeModal = function (id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
};
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
});
