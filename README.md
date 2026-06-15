# SokoTeams

Enterprise project management dashboard for teams with real-time chat, task management, and analytics.

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS
- Zustand (state management)
- TanStack React Query (data fetching/caching)
- React Router DOM 7 (routing)
- Recharts (charts)
- @dnd-kit (drag-and-drop)
- Headless UI (accessible components)
- Lucide Icons
- React Hook Form + Zod (forms/validation)

**Backend:**
- Express.js + Node.js
- SQLite via better-sqlite3
- bcryptjs + JWT (authentication)
- Nodemailer (email)
- Multer (file uploads)

**Testing:**
- Vitest + React Testing Library (unit)
- Playwright (E2E)

## Installation

```bash
# Install dependencies
npm install

# Start API server (port 3005)
node server/index.js

# Start dev server (port 3000)
npm run dev

# Run unit tests
npm run test

# Run E2E tests (requires servers running)
npm run test:e2e

# Build for production
npx vite build
```

**Default accounts:**
- `admin` / `admin123` (admin)
- `john` / `john123` (user)
- `jane` / `jane123` (user)
- `bob` / `bob123` (user)

## Features Implemented

### Core
- Real authentication (bcrypt + JWT)
- Role-based permissions (admin/user system roles + project-level lead/member/guest)
- SQLite database with 8 tables (users, projects, project_members, tasks, subtasks, channels, messages, reactions, comments)
- RESTful API with 28+ endpoints

### Dashboard & Analytics
- Overview cards (projects, tasks, completion rate)
- Productivity chart (bar chart by project)
- Weekly activity chart (line chart by day)

### Projects
- CRUD operations with project modals
- Project detail page with kanban board
- Member management with roles (lead/member)
- Status tracking (active/completed/on-hold/archived)

### Tasks
- Drag-and-drop kanban board (5 columns)
- Table view with sorting
- Calendar and timeline views
- Workload view
- Search, filter by status/priority/date
- Debounced search
- Subtasks
- File uploads with drag-and-drop
- Comments and reactions

### Chat
- Channel-based messaging
- Direct messages
- Threaded replies
- Emoji reactions
- REST polling (2s interval)

### Settings & Admin
- Dark mode toggle (persisted in localStorage)
- Role management (admin only)
- Database viewer (admin)
- Automation rules
- Email notifications (Nodemailer SMTP)

### Bonus Features
- Unit testing (14 tests, Vitest)
- E2E testing (9 tests, Playwright)
- PWA support (manifest.json + service worker)
- Offline indicator
- Keyboard shortcuts
- Focus trapping and ARIA attributes

## Architecture Decisions

**Single server architecture:** Express on port 3005 handles all API endpoints (auth, CRUD, email, uploads). Eliminates cross-origin issues and simplifies deployment.

**SQLite over json-server:** Chosen for relational queries, data integrity, and production readiness. Self-contained with zero setup.

**Zustand over Redux:** Smaller bundle size, simpler API, built-in persist middleware for localStorage.

**TanStack React Query:** Automatic cache invalidation, background refetching, optimistic updates. Reduces boilerplate for async state.

**REST polling over Socket.IO:** Chat uses 2s polling interval. Simpler than WebSocket setup, works through proxies, sufficient for team-sized chat loads.

**Headless UI for critical components:** Dialog, Menu, and Tab use Headless UI for proper focus management, keyboard navigation, and ARIA semantics.

**Lazy loading:** All page components are lazy-loaded with React.lazy for code splitting.

## Tradeoffs

| Decision | Pros | Cons |
|---|---|---|
| SQLite | Zero config, portable, relational | No concurrent writes, limited for high scale |
| REST polling for chat | Simple, reliable, proxy-friendly | Higher latency than WebSocket, unnecessary bandwidth |
| Zustand over Redux | Less boilerplate, smaller bundle | Less middleware ecosystem, less enterprise tooling |
| No Radix UI globally | Smaller bundle, more control | Less consistency, more custom component work |
| Headless UI selectively | Best of both worlds | Mixed component patterns |

## Future Improvements

- WebSocket for real-time chat (replace polling)
- File upload previews (image thumbnails)
- Task dependencies and Gantt charts
- Drag-and-drop task reordering within columns
- Export reports to PDF/CSV
- Multi-workspace support
- Two-factor authentication
- Internationalization (i18n)
- Performance monitoring (Sentry)
- CI/CD pipeline (GitHub Actions)
- PostgreSQL migration for production scale
