# SokoTeams

Enterprise project management dashboard for teams with real-time chat, task management, and analytics.

## Tech Stack

**Frontend** (`/frontend`):
- React 19 + TypeScript + Vite
- Tailwind CSS
- Zustand (state management)
- TanStack React Query (data fetching/caching)
- React Router DOM 7 (routing)
- Recharts (charts)
- @dnd-kit (drag-and-drop)
- Headless UI (accessible components)
- Lucide Icons
- React Hook Form + Zod (forms/validation)

**Backend** (`/server`):
- Express.js + Node.js
- SQLite via sql.js (pure JavaScript, no native compilation)
- bcryptjs + JWT (authentication)
- Nodemailer (email)
- Multer (file uploads)
- TOTP-based 2FA (Node.js crypto)

**Testing**:
- Vitest + React Testing Library (unit)
- Playwright (E2E)

## Project Structure

```
sokoteams/
  frontend/           # React SPA (deploy to Vercel, Netlify, etc.)
    src/
    package.json
    vite.config.ts
  server/             # Express API (deploy to Render, Railway, etc.)
    index.js
    db.js
    package.json
    .env.example
  README.md
  .gitignore
```

## Installation

### Prerequisites
- Node.js 18+

### Frontend
```bash
cd frontend
npm install
npm run dev          # Vite dev server on port 5173
npm run build        # Production build to dist/
npm run test         # 14 unit tests
```

### Backend
```bash
cd server
cp .env.example .env   # Configure SMTP, JWT_SECRET, CORS_ORIGIN
npm install
node index.js          # Express on port 3005
```

### Default Account
- `admin` / `admin123` (admin role)

## Features

### Core
- Real authentication (bcrypt + JWT)
- Role-based permissions (admin/user system roles + project-level lead/member/guest)
- SQLite database with 25+ tables
- RESTful API with 80+ endpoints
- First registered user auto-promoted to admin

### Dashboard
- Admin dashboard: stat cards, quick actions, team performance, recent tasks, deadlines
- User dashboard: welcome banner, my tasks, my projects, upcoming deadlines

### Projects
- CRUD with search, filter, status tabs (active/archived)
- Project detail with task board, team members, milestones
- Drag-and-drop task status changes
- Archive/restore (admin only)
- Task dependencies

### Tasks
- Kanban board, table view, calendar, timeline, workload views
- Drag-and-drop (5 columns)
- Subtasks, time tracking, recurring tasks
- Search, filter by status/priority/date/assignee
- Pagination on list pages

### Chat
- Channel-based messaging (public/private)
- Direct messages with WhatsApp/Telegram-style UI
- Typing indicators, read receipts (single/double checks)
- Emoji reactions with tooltips
- Inline GIFs and stickers
- File sharing, voice notes
- Message pinning, starring, forwarding, editing, deleting
- Threaded replies
- Disappearing messages (24h/7d/30d)
- Block/unblock users
- Collapsible sidebar sections

### Channels
- Public and private channels
- Join/approve/deny flow (Telegram-style)
- Channel avatars (color-based or uploaded image)
- Channel descriptions

### Users & Roles
- Admin-only user management with inline role assignment
- Real online presence via heartbeat (60s interval, 5-min threshold)
- User profiles with avatar upload and crop
- Searchable users directory

### Settings
- Profile editing (avatar, name, email, department)
- Change password
- Two-factor authentication (TOTP)
- Privacy: blocked users, disappearing messages
- Data export (CSV/JSON)
- Audit log
- Notification settings
- Account deletion

### Admin Features
- Database explorer (table tabs, search, inline editing, pagination)
- User role assignment
- Task/project archive/restore
- Channel management
- Audit log

### Polish
- Pre-login tutorial (8 steps)
- Post-login tutorial (24 admin / 13 user steps)
- Animated login/register with UAV drone SVGs
- Command palette (Ctrl+K)
- Custom user status
- Notification sound (Web Audio API)
- Responsive design (mobile-first)
- Dark mode
- PWA support
- Offline indicator

## Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variable: `VITE_API_URL` = your backend URL (e.g. `https://sokoteams-api.onrender.com`)

### Backend (Render)
1. Connect GitHub repo to Render
2. Set root directory to `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Environment variables:
   - `NODE_ENV` = `production`
   - `PORT` = `3005`
   - `JWT_SECRET` = random hex string
   - `CORS_ORIGIN` = your Vercel URL
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional, for email)

### Alternative: StormerHost (Shared Hosting)
The `sql.js` backend works on shared hosting (no native compilation needed). Upload `server/` directory contents and configure Node.js.

## Architecture Decisions

**sql.js over better-sqlite3:** Pure JavaScript SQLite — no native C++ compilation required. Works on shared hosting (StormerHost, cPanel) and all cloud platforms.

**REST polling for chat:** 2s polling interval. Simpler than WebSocket setup, works through all proxies, sufficient for team-sized chat loads.

**Zustand over Redux:** Smaller bundle size, simpler API, built-in persist middleware.

**TanStack React Query:** Automatic cache invalidation, background refetching, optimistic updates.

**Single-server architecture:** Express handles all API + serves production frontend build in the same process for single-server deployments.

**Frontend/backend separation:** Codebase split into `frontend/` and `server/` for independent deployment (Vercel + Render).

## Default Account

| Username | Password | Role |
|----------|----------|------|
| admin    | admin123 | admin |

## License

Private — Soko Aerial
