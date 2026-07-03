# PRPCEM NOTES – NoteBridge UI/UX Implementation Plan

A premium, startup-level notes sharing platform for PRPCEM college with animated backgrounds, glassmorphism design, and three dedicated portals.

---

## Design System

| Token | Value |
|-------|-------|
| Primary | `#3B82F6` (soft blue) |
| Accent | `#6366F1` (indigo) |
| Background | `#F8FAFF` (near-white) |
| Glass | `rgba(255,255,255,0.6)` with `backdrop-filter: blur(16px)` |
| Font | Inter (Google Fonts) |
| Radius | `16px` cards, `12px` inputs |
| Animation | CSS keyframes + JS Canvas (dotted interactive background) |

---

## File Structure

```
PRPCEM NodeJS/
├── index.html              # Landing Page
├── login.html              # Login / Register with role selection
├── student/
│   └── dashboard.html      # Student Dashboard
├── teacher/
│   └── dashboard.html      # Teacher Dashboard
├── admin/
│   └── dashboard.html      # Admin Dashboard
├── css/
│   ├── global.css          # Design tokens, reset, typography
│   ├── components.css      # Reusable: cards, buttons, modals, sidebar
│   └── animations.css      # Keyframes, transitions, loading states
└── js/
    ├── background.js       # Interactive dotted particle background (canvas)
    ├── chatbot.js          # Floating chatbot widget
    ├── notifications.js    # Notification bell + popup
    └── app.js              # Core interactions (tabs, modals, filters)
```

---

## Pages & Features

### 1. `index.html` — Landing Page
- Interactive animated dotted/particle canvas background (like Antigravity website)
- Glassmorphism hero section with tagline
- Feature highlights (6 icon cards)
- CTA buttons: "Login as Student", "Login as Teacher", "Admin"
- Smooth scroll animations (Intersection Observer)
- Stats bar (total notes, teachers, students, subjects)

### 2. `login.html` — Auth Page
- Role selector tabs (Student / Teacher / Admin) with pill animation
- Login form + Register form (toggle)
- Email notification confirmation UI (toast)
- Animated form card with glassmorphism

### 3. `student/dashboard.html`
- **Sidebar**: Home, My Notes, Bookmarks, Notifications, Doubts, Settings
- **Top Navbar**: Search bar, bell icon, profile avatar
- **Smart Search Bar**: Live filter as you type
- **Filter System**: Dropdowns for Subject, Teacher, Date range, File Type
- **"Latest Notes Today"** highlighted section (green badge)
- **Notes Grid**: Cards with subject, teacher, date, file type icon, preview/download/bookmark buttons
- **File Preview Modal**: Inline PDF/image viewer
- **Bookmarks Panel**: Saved notes list
- **Comments/Doubts**: Threaded discussion per note
- **Notification Popup**: Bell with unread badge + dropdown list
- **Chatbot**: Floating bottom-right widget

### 4. `teacher/dashboard.html`
- **Sidebar**: Dashboard, Upload Notes, My Notes, Analytics, Schedule, Settings
- **Upload Panel**: Drag & drop zone, subject/section/branch selectors, file type icons, schedule date-time picker
- **My Notes Table**: Uploaded notes list with edit/delete/version history
- **Analytics Dashboard**: View/download count cards + simple bar charts (pure CSS)
- **Version Control**: Modal showing note update history
- **Scheduled Notes**: Calendar-style upcoming release list

### 5. `admin/dashboard.html`
- **Sidebar**: Overview, Users, Notes, Reports, Settings
- **Overview Cards**: Total users, notes, pending approvals, storage used
- **User Management**: Table with Approve/Reject buttons, role badges
- **Notes Management**: Table with status, teacher name, actions
- **System Analytics**: Stats with progress bars

---

## Proposed Changes

### [NEW] `css/global.css`
Design tokens, CSS variables, reset, typography, glassmorphism utilities.

### [NEW] `css/components.css`
Sidebar, navbar, cards, buttons, modals, filters, forms, notification panel, chatbot.

### [NEW] `css/animations.css`
All keyframe animations: float, pulse, fadeIn, slideIn, shimmer (skeleton loader), blob motion.

### [NEW] `js/background.js`
Canvas-based interactive dotted background:
- Dots arranged in grid pattern
- Mouse-reactive: dots near cursor glow/repel
- Smooth animation loop (requestAnimationFrame)
- Respects light theme (soft blue dots)

### [NEW] `js/app.js`
Tab switching, modal open/close, filter interactions, bookmark toggle, notification mark-read.

### [NEW] `js/chatbot.js`
Floating chatbot button, slide-up chat window, mock message responses.

### [NEW] `js/notifications.js`
Bell badge counter, dropdown popup, mark-all-read animation.

---

## Open Questions

> [!IMPORTANT]
> **Role-based routing**: This is a pure HTML/CSS/JS build (no backend). Should I add mock data in JS to simulate real data, or keep it as pure UI wireframes?

> [!NOTE]
> **Chart library**: For Analytics, I plan to use pure CSS bar charts to keep it zero-dependency. Alternatively I can embed Chart.js (CDN) for richer charts. Which do you prefer?

---

## Verification Plan

### Visual Review
- Open each page in browser and verify responsive behavior
- Confirm canvas background is interactive (mouse hover)
- Test modal open/close, tab switching, chatbot toggle
- Verify glassmorphism renders correctly on Chrome/Edge

### Responsive Check
- Desktop (1440px), Laptop (1024px), Tablet (768px), Mobile (375px)

