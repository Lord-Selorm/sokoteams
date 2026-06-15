import { LayoutDashboard, FolderKanban, CheckSquare, MessageSquare, Users, Settings, BarChart3, Shield, Database, Search, Bell, Palette, Lock, Download, Trash2, GripVertical, Filter, SortAsc, Paperclip, Smile, AtSign, Pin, Star, Phone, Video, MoreHorizontal, UserPlus, Archive, Eye, EyeOff, Hash, CircleDot, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TutorialStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

const adminSteps: TutorialStep[] = [
  {
    icon: LayoutDashboard,
    title: 'Welcome to SokoTeams',
    description: 'Your team\'s full command center — project management, task tracking, real-time chat, analytics, and admin controls. This tour covers every feature in detail.',
  },
  {
    icon: LayoutDashboard,
    title: 'Admin Dashboard',
    description: 'Your home screen with stat cards (active projects, pending/done tasks, overdue items), quick action buttons (New Project, New Task, Invite Member, Manage Users), a Team Performance section showing each member\'s workload as colored bars, Recent Tasks list with priority badges, and an Upcoming Deadlines sidebar with due dates.',
  },
  {
    icon: FolderKanban,
    title: 'Projects — Create & Manage',
    description: 'Click "New Project" to create with name, description, status (Planning/Active/On Hold/Completed), and team members via searchable multi-select. Cards show progress bars (green/yellow/red). Switch between Grid and List view. Search and filter by status. Paginated for large lists.',
  },
  {
    icon: FolderKanban,
    title: 'Project Detail Page',
    description: 'Click any project card to open. Shows a blue gradient header with stats, quick status buttons, team members with online dots, and a task board. Tasks are displayed as cards you can drag between status columns (Todo → In Progress → Done). Add new tasks with the + button. No edit/delete on task cards — drag-and-drop only for status changes.',
  },
  {
    icon: CheckSquare,
    title: 'Tasks — Full CRUD & Kanban',
    description: 'Create tasks with title, description, project, assigned user, priority (Low/Medium/High/Critical), status, due date, and tags. Admins can create/edit/delete any task. Board view shows a kanban with drag-and-drop between columns. List view shows a sortable table. Search by title. Filter by status, priority, date. Paginated.',
  },
  {
    icon: CheckSquare,
    title: 'Task Details & Subtasks',
    description: 'Click a task to open the modal with tabs: Details (edit fields), Subtasks (add/toggle sub-items), Comments (threaded discussion), Attachments (upload files), and Dependencies (link tasks as "depends on" or "blocked by"). Track time logged on each task. Toggle recurring tasks (daily/weekly/biweekly/monthly).',
  },
  {
    icon: Archive,
    title: 'Archive & Restore',
    description: 'Archive tasks and projects to hide them from main views without deleting. Toggle between Active and Archived tabs on both TasksPage and ProjectsPage. Restore archived items anytime. Archived items are read-only — no editing.',
  },
  {
    icon: Users,
    title: 'Users & Roles',
    description: 'Admin-only page with two tabs: Directory (all users with role dropdowns — admin/user/guest) and Project Leads (users who lead projects). Assign roles inline — changes take effect immediately. Click any user avatar to view their public profile. Invite new members by email.',
  },
  {
    icon: UserPlus,
    title: 'Invite by Email',
    description: 'In Settings → Invite Team Members, enter an email address and role. SokoTeams sends a professional HTML invitation email with a registration link. View pending invites, revoke if needed. Invites are stored and tracked.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Detailed charts: Total Projects, Completed/Pending/Overdue tasks, Productivity bar chart (completed per month), Weekly Activity line chart (tasks created vs completed). Data pulls from your real SQLite database.',
  },
  {
    icon: MessageSquare,
    title: 'Channels — Create & Join',
    description: 'Click "+ New Channel" to create public (auto-join) or private (requires approval) channels. Choose a color and upload a custom avatar. Non-members see a "Request to Join" screen for private channels. Channel admins approve/deny requests in the members panel. Delete channels from the members panel (admin only).',
  },
  {
    icon: MessageSquare,
    title: 'Chat — Full Features',
    description: 'Messages with consecutive grouping (5-min window), date separators, hover actions (reply, edit, delete, pin, star, forward, react). Right-click for context menu. React with 6 quick emojis or open full picker (200+ emojis, GIFs, stickers). Search messages. View pinned/starred messages. Unread counts with badges in sidebar.',
  },
  {
    icon: AtSign,
    title: '@Mentions & Polls',
    description: 'Type @ in chat to mention users — dropdown appears, select to insert. Mentioned names render in blue. Create polls with multiple options — users vote, see percentages and vote counts. Polls can be closed by admins.',
  },
  {
    icon: Phone,
    title: 'Voice Notes & File Sharing',
    description: 'Record voice notes with the mic button (hold to record, release to send). Upload files (images, PDFs, etc.) via the paperclip button — up to 5 files, 10MB each. Image attachments show as clickable thumbnails with lightbox preview. Voice messages play inline with waveform.',
  },
  {
    icon: CircleDot,
    title: 'Typing & Read Receipts',
    description: 'When you type, others see animated dots with your name. Messages show read receipts: single gray checkmark = sent, double blue checkmarks = read. Hover over checkmarks to see how many users read it.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Messages',
    description: 'Click a user in the DM section to start a one-on-one conversation. DM header shows avatar, name, online status (green dot). Dropdown menu: Contact Info (modal with details), Search Messages, Mute Notifications, Disappearing Messages (24h/7d/30d auto-delete), Clear Chat, Block/Unblock User. Blocked users can\'t message you and don\'t appear in your DM sidebar.',
  },
  {
    icon: Shield,
    title: 'Block Users & Privacy',
    description: 'Block any user from DM dropdown → Block. They can\'t send you messages. You\'ll see a red "Blocked" banner in the chat. Unblock anytime. Blocked users list visible in Settings → Privacy. Admin cannot read your DMs.',
  },
  {
    icon: Settings,
    title: 'Settings — Full Control',
    description: 'Profile: Upload avatar (crop or camera), edit name, email, department. Appearance: Toggle dark mode. Notifications: Email/push/desktop toggles. Security: Change password with validation, enable/disable 2FA (TOTP). Privacy: Blocked users list with unblock. Data Export: Download all your data as JSON or CSV. Danger Zone: Delete account (with confirmation modal).',
  },
  {
    icon: Lock,
    title: 'Two-Factor Authentication',
    description: 'In Settings → Security, click "Enable 2FA". Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.). Enter the 6-digit code to verify. Recovery codes shown for backup. Disable anytime from the same section.',
  },
  {
    icon: Database,
    title: 'DB Management',
    description: 'Admin-only database explorer. Browse all tables (Users, Projects, Tasks, Channels, Messages, etc.) with tabs. Search within tables, expand rows to see all fields, inline edit, delete with confirmation modal. Pagination for large datasets. Color-coded table tabs.',
  },
  {
    icon: Bell,
    title: 'Notifications & Activity',
    description: 'Bell icon in topbar shows unread count badge. Click to see notifications — task assignments, mentions, channel invites. Mark all as read. Typing indicators show who\'s typing in each channel. Presence system tracks online/offline status with heartbeat.',
  },
  {
    icon: Settings,
    title: 'Keyboard Shortcut',
    description: 'Press Ctrl+K anywhere to open the Command Palette. Navigate to any page instantly: Dashboard, Projects, Tasks, Analytics, Settings, Users, Chat channels. Type to search. ESC to close.',
  },
  {
    icon: LayoutDashboard,
    title: 'Sidebar Navigation',
    description: 'Collapsible sections: Dashboard (home), Projects, Tasks (kanban), Users & Roles, Analytics, Chat (channels with colored avatars, unread badges), Direct Messages (online users first, blocked filtered out), Settings, DB Management. Sections remember expand/collapse state.',
  },
  {
    icon: LayoutDashboard,
    title: 'You\'re All Set!',
    description: 'Dark mode in Settings. Profile popup in topbar with avatar, status emoji, online indicator. Responsive design — works on mobile. Every feature is real: SQLite database, Express API, no mocks. Start collaborating!',
  },
];

const userSteps: TutorialStep[] = [
  {
    icon: LayoutDashboard,
    title: 'Welcome to SokoTeams',
    description: 'Your workspace for tracking tasks, chatting with your team, and staying productive. This tour covers everything you can do.',
  },
  {
    icon: LayoutDashboard,
    title: 'My Dashboard',
    description: 'Your personal home screen: Welcome banner with your name and status, stat cards (My Tasks, In Progress, Completed, Overdue), a "My Tasks" CTA button, your projects grid with progress bars, recent tasks list, upcoming deadlines sidebar, and quick links to Chat and Settings.',
  },
  {
    icon: CheckSquare,
    title: 'My Tasks',
    description: 'View tasks assigned to you. Click any task to open the details modal — update status (Todo/In Progress/Done/Blocked/Cancelled), add subtasks, leave comments, attach files, log time. Board view shows drag-and-drop kanban. List view shows sortable table. Search by title, filter by status/priority.',
  },
  {
    icon: FolderKanban,
    title: 'Projects',
    description: 'Browse projects you\'re a member of. Click any card to see project detail — description, team members with online dots, task board with drag-and-drop status changes, completion stats. You can view and update tasks but cannot create or delete projects (admin only).',
  },
  {
    icon: Archive,
    title: 'Archive Tabs',
    description: 'Both Tasks and Projects pages have Active/Archived tabs. Archived items are hidden from main views. You can view archived items but cannot restore them — only admins can archive/restore.',
  },
  {
    icon: MessageSquare,
    title: 'Channels',
    description: 'Browse and join channels. Public channels auto-join on click. Private channels require approval — you\'ll see a "Request to Join" screen. Once approved, send messages, react with emojis, share files, record voice notes, search messages, pin important ones.',
  },
  {
    icon: MessageSquare,
    title: 'Chat Features',
    description: 'Send messages with @mentions (type @ for user dropdown). Right-click messages for: Reply, Edit, Delete, Pin, Star, Forward, React. View pinned/starred messages in chat header. Search messages. Unread counts shown in sidebar. Typing indicators show who\'s typing.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Messages',
    description: 'Click any user in the DM sidebar for one-on-one chat. Header shows their avatar, name, and online status. Dropdown: Contact Info, Search Messages, Mute, Disappearing Messages (24h/7d/30d auto-delete), Clear Chat. You can also block users from this menu.',
  },
  {
    icon: Phone,
    title: 'Voice Notes & Files',
    description: 'Record voice messages with the mic button. Upload files via paperclip (images, PDFs, etc.). Image attachments show as thumbnails — click for full preview. Voice messages play inline.',
  },
  {
    icon: Lock,
    title: 'Settings',
    description: 'Profile: Upload avatar (crop or camera), edit name, email, department. Appearance: Toggle dark mode. Notifications: Control email/push/desktop alerts. Security: Change password, enable 2FA. Privacy: View/unblock blocked users. Data Export: Download your data as JSON or CSV. Danger Zone: Delete account.',
  },
  {
    icon: Settings,
    title: 'Keyboard Shortcut',
    description: 'Press Ctrl+K to open the Command Palette — navigate to any page instantly. Type to search pages. ESC to close.',
  },
  {
    icon: LayoutDashboard,
    title: 'Sidebar',
    description: 'Collapsible sections: Dashboard, Projects, Tasks, Analytics, Chat (channels with colored avatars and unread badges), Direct Messages (online users first), Settings. Sections remember expand/collapse state between sessions.',
  },
  {
    icon: LayoutDashboard,
    title: 'You\'re All Set!',
    description: 'Set your status emoji in the topbar. Toggle dark mode in Settings. Works on mobile. Everything is real — SQLite database, live chat, file uploads. Start collaborating!',
  },
];

const preLoginSteps: TutorialStep[] = [
  {
    icon: LayoutDashboard,
    title: 'Welcome to SokoTeams',
    description: 'A complete workspace for project management, real-time chat, and team collaboration. Let us show you what you can do.',
  },
  {
    icon: FolderKanban,
    title: 'Project Management',
    description: 'Create projects, assign team members, track progress with dynamic completion bars. Kanban boards with drag-and-drop let you move tasks between Todo, In Progress, and Done columns.',
  },
  {
    icon: CheckSquare,
    title: 'Task Tracking',
    description: 'Create tasks with priorities (Low to Critical), due dates, subtasks, comments, attachments, and time logging. Admins manage all tasks; users update their assigned work. Supports recurring schedules.',
  },
  {
    icon: MessageSquare,
    title: 'Real-Time Chat',
    description: 'Channels for team discussions, direct messages for private conversations. Send text, voice notes, files, and images. React with emojis, pin important messages, @mention teammates. Typing indicators and read receipts included.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Invite members by email. Assign roles (Admin, User, Guest). View who\'s online with real-time presence. Block users for privacy. Channels support public auto-join and private with approval.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Insights',
    description: 'Dashboard with stat cards, team performance charts, overdue tracking. Detailed analytics page with productivity trends and weekly activity breakdowns.',
  },
  {
    icon: Settings,
    title: 'Settings & Security',
    description: 'Customize your profile with avatar upload. Toggle dark mode. Enable two-factor authentication. Export your data as JSON or CSV. Full control over your account.',
  },
  {
    icon: Sparkles,
    title: 'Ready to Start?',
    description: 'Create your account or sign in to begin. The first user to register becomes the workspace Admin with full control. Subsequent users join as team members.',
  },
];

export function getTutorialSteps(isAdmin: boolean): TutorialStep[] {
  return isAdmin ? adminSteps : userSteps;
}

export function getPreLoginSteps(): TutorialStep[] {
  return preLoginSteps;
}
