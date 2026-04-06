/* ============================================================
   PRPCEM NOTES – NoteBridge | Core App JS
   Sidebar toggle, tabs, search, filters, bookmarks, modals
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Sidebar Toggle (mobile) ──────────────────────────────── */
  const menuBtn  = document.getElementById('menu-toggle');
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');

  function openSidebar()  { sidebar?.classList.add('open'); overlay?.classList.add('show'); document.body.style.overflow = 'hidden'; }
  function closeSidebarFn() { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); document.body.style.overflow = ''; }

  menuBtn?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebarFn);

  /* ── Nav Item Activation ──────────────────────────────────── */
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const target = item.dataset.section;
      document.querySelectorAll('.section-panel').forEach(p => {
        p.style.display = p.id === target ? 'block' : 'none';
      });
      closeSidebarFn();
    });
  });

  /* ── Tab Switcher ─────────────────────────────────────────── */
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.tab-group');
      group?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.dataset.tab;
      document.querySelectorAll('[data-tab-panel]').forEach(p => {
        p.style.display = p.dataset.tabPanel === panel ? '' : 'none';
      });
    });
  });

  /* ── Bookmark Toggle ──────────────────────────────────────── */
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.classList.toggle('active');
      const isActive = btn.classList.contains('active');
      btn.setAttribute('title', isActive ? 'Remove Bookmark' : 'Bookmark');
      btn.style.color = isActive ? 'var(--warning)' : '';
      const name = btn.closest('.note-card')?.querySelector('.note-card-title')?.textContent || 'Note';
      showToast(isActive ? 'success' : 'info',
        isActive ? '⭐ Bookmarked!' : 'Bookmark removed',
        isActive ? `"${name}" added to bookmarks` : `"${name}" removed from bookmarks`
      );
    });
  });

  /* ── Live Search ──────────────────────────────────────────── */
  const searchInput = document.getElementById('main-search');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.note-card[data-searchable]').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? '' : 'none';
    });
  });

  /* ── Keyboard shortcut for search (Ctrl+K / /) ───────────── */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
      e.preventDefault();
      searchInput?.focus();
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  });

  /* ── Filter Chips ─────────────────────────────────────────── */
  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.filterGroup;
      document.querySelectorAll(`.filter-chip[data-filter-group="${group}"]`).forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = chip.dataset.filter;
      document.querySelectorAll('.note-card[data-category]').forEach(card => {
        card.style.display = (val === 'all' || card.dataset.category === val) ? '' : 'none';
      });
    });
  });

  /* ── Upload Zone Drag & Drop ──────────────────────────────── */
  const dropZone = document.getElementById('upload-zone');
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => {
      e.preventDefault(); dropZone.classList.add('drag-over');
    }));
    ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      if (ev === 'drop' && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    }));
    dropZone.addEventListener('click', () => document.getElementById('file-input')?.click());
    document.getElementById('file-input')?.addEventListener('change', e => handleFiles(e.target.files));
  }

  function handleFiles(files) {
    if (!files.length) return;
    const names = Array.from(files).map(f => f.name).join(', ');
    showToast('success', `📎 ${files.length} file(s) selected`, names.substring(0, 60));
    const preview = document.getElementById('upload-preview');
    if (preview) {
      preview.style.display = 'flex';
      preview.innerHTML = Array.from(files).map(f => `
        <div class="file-chip">
          <span>${getFileEmoji(f.name)}</span>
          <span class="truncate">${f.name}</span>
          <span style="color:var(--text-muted);font-size:0.72rem">${(f.size/1024).toFixed(0)}KB</span>
        </div>
      `).join('');
    }
  }

  function getFileEmoji(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = { pdf:'📄', ppt:'📊', pptx:'📊', doc:'📝', docx:'📝', jpg:'🖼', jpeg:'🖼', png:'🖼', zip:'🗜', mp4:'🎬', xlsx:'📊' };
    return map[ext] || '📎';
  }

  /* ── Animate Numbers (countUp) ────────────────────────────── */
  const counters = document.querySelectorAll('[data-count]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        animateCount(en.target);
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));

  function animateCount(el) {
    const end = parseInt(el.dataset.count);
    const dur = 1400;
    const start = performance.now();
    function update(now) {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * end).toLocaleString();
      if (t < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ── Reveal on Scroll ─────────────────────────────────────── */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) en.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

  /* ── Progress bars animate on load ───────────────────────── */
  setTimeout(() => {
    document.querySelectorAll('.fill[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 600);

  /* ── Page Link Transitions ────────────────────────────────── */
  document.querySelectorAll('a[href]:not([target])').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript')) return;
      // Smooth transition handled by browser
    });
  });

  console.log('%c🎓 PRPCEM NOTES – NoteBridge', 'font-size:1.4rem;font-weight:bold;color:#3B82F6;');
  console.log('%cUI loaded successfully ✅', 'color:#10B981;');
});
