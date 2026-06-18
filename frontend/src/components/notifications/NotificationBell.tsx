import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, X, Clock, CheckCircle2, AlertTriangle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '@/store/notificationStore';
import { cn } from '@/lib/utils';

const typeIcons = {
  task_assigned: UserPlus,
  task_completed: CheckCircle2,
  task_overdue: AlertTriangle,
  task_updated: Clock,
};

const typeColors = {
  task_assigned: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
  task_completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  task_overdue: 'text-red-500 bg-red-50 dark:bg-red-950/40',
  task_updated: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, getUnreadCount } = useNotificationStore();
  const unread = getUnreadCount();
  const recent = notifications.slice(0, 8);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 relative transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
              </div>
            ) : (
              recent.map((n) => {
                const Icon = typeIcons[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => { markAsRead(n.id); }}
                    className={cn(
                      'w-full px-4 py-3 text-left flex items-start gap-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-50 dark:border-gray-800/50',
                      !n.read && 'bg-primary-50/30 dark:bg-primary-950/20'
                    )}
                  >
                    <div className={cn('p-1.5 rounded-lg flex-shrink-0', typeColors[n.type])}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 mt-1.5 bg-primary-500 rounded-full flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => { setIsOpen(false); navigate('/notifications'); }}
                className="w-full py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
