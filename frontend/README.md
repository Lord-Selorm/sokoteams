# SokoTeams — Frontend

React SPA for the SokoTeams project management dashboard.

## Tech Stack

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

## Setup

```bash
npm install
npm run dev          # Vite dev server on port 5173
```

The dev server proxies API requests to `http://localhost:3005` (set via `VITE_API_URL` in `.env`).

## Build

```bash
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

## Tests

```bash
npm run test         # 14 unit tests (Vitest)
npm run test:e2e     # 9 E2E tests (Playwright)
```

## Environment Variables

| Variable | Dev Default | Production |
|----------|-------------|------------|
| `VITE_API_URL` | `http://localhost:3005` | Set to backend URL |

## Project Structure

```
src/
  api/              # API client functions (axios)
  components/       # Reusable UI components
    analytics/      # Charts
    auth/           # Login/register helpers
    chat/           # ChatInterface, EmojiPicker, ThreadPanel, VoiceRecorder
    common/         # UserAvatar, Pagination, FormInput, etc.
    projects/       # ProjectCard, ProjectModal
    sidebar/        # ChannelBrowserModal, CreateChannelModal
    tasks/          # TaskModal, TaskCard, KanbanBoard
    tutorial/       # TutorialOverlay, PreLoginTutorial
  data/             # Static data (tutorial steps)
  hooks/            # Custom hooks (useProjects, useTasks, usePresence)
  layouts/          # Sidebar, Topbar, DashboardLayout
  lib/              # Utilities (API_BASE, resolveAvatarUrl, cn)
  pages/            # Route-level components
  routes/           # AppRouter
  services/         # Email, notification services
  store/            # Zustand stores (auth, ui, chat, tutorial)
  test/             # Unit tests
  types/            # TypeScript types
```

## Deployment

### Vercel
1. Connect GitHub repo
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Env var: `VITE_API_URL` = backend URL
