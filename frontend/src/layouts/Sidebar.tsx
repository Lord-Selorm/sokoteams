import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  Lock,
  LogOut,
  ChevronRight,
  Plus,
  Search,
  Database,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { cn, API_URL } from '@/lib/utils';
import { useState, useEffect } from 'react';
import CreateChannelModal from '@/components/sidebar/CreateChannelModal';
import ChannelBrowserModal from '@/components/sidebar/ChannelBrowserModal';
import UserAvatar from '@/components/common/UserAvatar';

interface Channel {
  id: string;
  name: string;
  type: string;
  avatar: string;
  workspaceId: string;
}

interface AppUser {
  id: string;
  name: string;
  avatar: string;
}

function getStoredExpand(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(`sidebar-expand-${key}`);
    if (v !== null) return v === 'true';
  } catch {}
  return fallback;
}

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { user, logout, isAdmin } = useAuthStore();
  const { unreadCounts, fetchUnreadCounts } = useSocketStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showBrowseChannels, setShowBrowseChannels] = useState(false);

  const rawToken = localStorage.getItem('auth-store');
  const authToken = rawToken ? (() => { try { return JSON.parse(rawToken)?.state?.token || ''; } catch { return ''; } })() : '';
  const { data: blockedData } = useQuery<{ id: string }[]>({
    queryKey: ['blocked-users'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/users/blocked`, { headers: { Authorization: `Bearer ${authToken}` } });
      return r.ok ? r.json() : [];
    },
    staleTime: 0,
  });
  const blockedUserIds = new Set(blockedData?.map(u => u.id) || []);

  const [expandChannels, setExpandChannels] = useState(() => getStoredExpand('channels', true));
  const [expandDMs, setExpandDMs] = useState(() => getStoredExpand('dms', true));
  const [expandAdminChannels, setExpandAdminChannels] = useState(() => getStoredExpand('admin-channels', true));
  const [expandAdminDMs, setExpandAdminDMs] = useState(() => getStoredExpand('admin-dms', true));

  const toggleExpand = (key: string, setter: (v: boolean) => void) => (next: boolean) => {
    setter(next);
    try { localStorage.setItem(`sidebar-expand-${key}`, String(next)); } catch {}
  };

  function getDmChannelId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `dm-${sorted[0]}-${sorted[1]}`;
  }

  useEffect(() => {
    fetch(`${API_URL}/channels`).then(r => r.ok && r.json()).then(d => { if (d) setChannels(d); }).catch(() => {});
    fetch(`${API_URL}/users`).then(r => r.ok && r.json()).then(d => { if (d) setAppUsers(d.filter((u: AppUser) => u.id !== user?.id)); }).catch(() => {});
    fetch(`${API_URL}/tasks`).then(r => r.ok && r.json()).then(d => { if (Array.isArray(d)) setTaskCount(d.length); }).catch(() => {});
  }, [user?.id, user?.avatar, user?.name]);

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(() => fetchUnreadCounts(), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  const handleChannelCreated = async (channel: { name: string; type: string; description: string }) => {
    try {
      const raw = localStorage.getItem('auth-store');
      const token = raw ? JSON.parse(raw)?.state?.token : '';
      const res = await fetch(`${API_URL}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: channel.name.toLowerCase(), name: channel.name, type: channel.type, description: channel.description, workspaceId: '1' }),
      });
      if (res.ok) {
        const newChannel = await res.json();
        setChannels(prev => [...prev, newChannel]);
        navigate(`/channels/${channel.name.toLowerCase()}`);
        setShowCreateChannel(false);
      }
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  const getInitials = (name: string) => name?.substring(0, 2).toUpperCase() || '?';

  const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];

  const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const totalUnreadDMs = appUsers.reduce((sum, u) => {
    const dmId = user?.id ? getDmChannelId(user.id, u.id) : '';
    return sum + (unreadCounts[dmId] || 0);
  }, 0);

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed md:relative z-40 flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-200',
          sidebarOpen ? 'w-60 translate-x-0' : '-translate-x-full md:w-16 md:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-end h-10 px-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-2 overflow-y-auto" aria-label="Main navigation">
          {isAdmin() ? (
            /* ─── ADMIN PANEL ─── */
            <div className="space-y-0.5">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Management</p>
              </div>
              <AdminNavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <AdminNavItem to="/projects" icon={FolderKanban} label="Projects" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <AdminNavItem to="/tasks" icon={CheckSquare} label="All Tasks" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} badge={taskCount} />
              <AdminNavItem to="/users" icon={Users} label="Users" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

              <div className="mt-4 px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Analytics</p>
              </div>
              <AdminNavItem to="/analytics" icon={BarChart3} label="Analytics" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

              {/* Admin Channels - Collapsible */}
              <SidebarSection
                label="Channels"
                expanded={expandAdminChannels}
                onToggle={() => toggleExpand('admin-channels', setExpandAdminChannels)(!expandAdminChannels)}
                sidebarOpen={sidebarOpen}
                count={channels.length}
                action={
                  <div className="flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setShowBrowseChannels(true); }}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true); }}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              >
                {channels.map((ch) => (
                  <UserNavItem key={ch.id} to={`/channels/${ch.id}`} label={ch.name} locked={ch.type === 'private'} channelAvatar={ch.avatar || undefined} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                ))}
              </SidebarSection>

              {/* Admin Direct Messages - Collapsible */}
              <SidebarSection
                label="Direct Messages"
                expanded={expandAdminDMs}
                onToggle={() => toggleExpand('admin-dms', setExpandAdminDMs)(!expandAdminDMs)}
                sidebarOpen={sidebarOpen}
                badge={totalUnreadDMs > 0 ? totalUnreadDMs : undefined}
              >
                {appUsers.filter(u => !blockedUserIds.has(u.id)).map((u) => {
                  const dmId = user?.id ? getDmChannelId(user.id, u.id) : '';
                  const unread = unreadCounts[dmId] || 0;
                  return (
                    <UserNavItem
                      key={u.id}
                      to={`/dm/${u.id}`}
                      badge={unread}
                      icon={() => <UserAvatar user={u} size="xs" showOnline />}
                      label={u.name}
                      sidebarOpen={sidebarOpen}
                      setSidebarOpen={setSidebarOpen}
                    />
                  );
                })}
              </SidebarSection>

              <div className="mt-4 px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">System</p>
              </div>
              <AdminNavItem to="/admin/db" icon={Database} label="DB Management" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <AdminNavItem to="/settings" icon={Settings} label="Settings" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            </div>
          ) : (
            /* ─── USER WORKSPACE ─── */
            <div className="space-y-0.5">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Workspace</p>
              </div>
              <AdminNavItem to="/dashboard" icon={LayoutDashboard} label="My Dashboard" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <AdminNavItem to="/projects" icon={FolderKanban} label="Projects" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <AdminNavItem to="/tasks" icon={CheckSquare} label="My Tasks" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} badge={taskCount} />
              <AdminNavItem to="/analytics" icon={BarChart3} label="Analytics" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              <AdminNavItem to="/settings" icon={Settings} label="Settings" sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

              {/* Channels - Collapsible */}
              <SidebarSection
                label="Channels"
                expanded={expandChannels}
                onToggle={() => toggleExpand('channels', setExpandChannels)(!expandChannels)}
                sidebarOpen={sidebarOpen}
                count={channels.length}
                action={
                  <div className="flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); setShowBrowseChannels(true); }}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowCreateChannel(true); }}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              >
                {channels.map((ch) => (
                  <UserNavItem key={ch.id} to={`/channels/${ch.id}`} label={ch.name} locked={ch.type === 'private'} channelAvatar={ch.avatar || undefined} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                ))}
              </SidebarSection>

              {/* Direct Messages - Collapsible */}
              <SidebarSection
                label="Direct Messages"
                expanded={expandDMs}
                onToggle={() => toggleExpand('dms', setExpandDMs)(!expandDMs)}
                sidebarOpen={sidebarOpen}
                badge={totalUnreadDMs > 0 ? totalUnreadDMs : undefined}
              >
                {appUsers.filter(u => !blockedUserIds.has(u.id)).map((u) => {
                  const dmId = user?.id ? getDmChannelId(user.id, u.id) : '';
                  const unread = unreadCounts[dmId] || 0;
                  return (
                    <UserNavItem
                      key={u.id}
                      to={`/dm/${u.id}`}
                      badge={unread}
                      icon={() => <UserAvatar user={u} size="xs" showOnline />}
                      label={u.name}
                      sidebarOpen={sidebarOpen}
                      setSidebarOpen={setSidebarOpen}
                    />
                  );
                })}
                <UserNavItem to="/dm/self" icon={() => <UserAvatar user={user} size="xs" />} label={`${user?.name} (you)`} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
              </SidebarSection>
            </div>
          )}
        </nav>

        {/* Bottom: User Profile */}
        <div className="px-2 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className={cn('flex items-center justify-between', !sidebarOpen && 'md:justify-center')}>
            {sidebarOpen && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <NavLink to="/settings" className="flex items-center gap-2 flex-1 min-w-0">
                  <UserAvatar user={user} size="sm" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">{isAdmin() ? 'Admin' : 'Online'}</span>
                  </div>
                </NavLink>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showCreateChannel && (
          <CreateChannelModal
            isOpen={showCreateChannel}
            onClose={() => setShowCreateChannel(false)}
            onChannelCreated={handleChannelCreated}
          />
        )}
        {showBrowseChannels && (
          <ChannelBrowserModal
            isOpen={showBrowseChannels}
            onClose={() => setShowBrowseChannels(false)}
            onChannelJoined={(channelId) => {
              setShowBrowseChannels(false);
              navigate(`/channels/${channelId}`);
            }}
          />
        )}
      </aside>
    </>
  );
}

/* ─── Collapsible Sidebar Section ─── */
function SidebarSection({ label, expanded, onToggle, sidebarOpen, children, count, badge, action }: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  sidebarOpen: boolean;
  children: React.ReactNode;
  count?: number;
  badge?: number;
  action?: React.ReactNode;
}) {
  if (!sidebarOpen) {
    return (
      <div className="mt-4 px-3 py-2">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">{label.charAt(0)}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group cursor-pointer"
      >
        <ChevronRight className={cn('w-3 h-3 text-gray-400 transition-transform duration-200', expanded && 'rotate-90')} />
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex-1 text-left">{label}</p>
        {count !== undefined && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">{count}</span>
        )}
        {badge !== undefined && (
          <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center mr-1">{badge}</span>
        )}
        {action}
      </div>
      <div className={cn(
        'overflow-hidden transition-all duration-200',
        expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="py-0.5 pl-2">
          {children}
        </div>
      </div>
    </div>
  );
}

/* Admin nav item helper */
function AdminNavItem({ to, icon: Icon, label, sidebarOpen, setSidebarOpen, badge }: {
  to: string; icon: React.ComponentType<{ className?: string }>; label: string; sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; badge?: number;
}) {
  return (
    <NavLink
      to={to}
      onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150',
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        )
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className={cn('whitespace-nowrap', !sidebarOpen && 'md:hidden')}>{label}</span>
      {badge !== undefined && (
        <span className="ml-auto bg-red-500 text-white text-xs px-1.5 rounded-full min-w-[18px] text-center">{badge}</span>
      )}
    </NavLink>
  );
}

/* User nav item helper (channels/DMs are smaller) */
function UserNavItem({ to, icon: Icon, label, badge, sidebarOpen, setSidebarOpen, locked, channelAvatar }: {
  to: string; icon?: React.ElementType; label: string; badge?: number; sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; locked?: boolean; channelAvatar?: string;
}) {
  return (
    <NavLink
      to={to}
      onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors duration-150',
          isActive
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        )
      }
    >
      {channelAvatar ? (
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: channelAvatar }}>
          {label.charAt(0).toUpperCase()}
        </div>
      ) : Icon ? <Icon /> : null}
      <span className={cn('whitespace-nowrap flex-1', !sidebarOpen && 'md:hidden')}>{label}</span>
      {locked && sidebarOpen && <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs px-1.5 rounded-full min-w-[18px] text-center">{badge}</span>
      )}
    </NavLink>
  );
}
