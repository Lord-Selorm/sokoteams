import { Bell, CheckCheck, Trash2, Clock, CheckCircle2, AlertTriangle, UserPlus, ArrowLeft } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const typeIcons = {
  task_assigned: UserPlus,
  task_completed: CheckCircle2,
  task_overdue: AlertTriangle,
  task_updated: Clock,
};

const typeColors = {
  task_assigned: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-blue-200 dark:ring-blue-800',
  task_completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-emerald-200 dark:ring-emerald-800',
  task_overdue: 'text-red-500 bg-red-50 dark:bg-red-950/40 ring-red-200 dark:ring-red-800',
  task_updated: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-amber-200 dark:ring-amber-800',
};

const typeLabels: Record<string, string> = {
  task_assigned: 'Assignment',
  task_completed: 'Completion',
  task_overdue: 'Overdue',
  task_updated: 'Update',
};

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {notifications.filter((n) => !n.read).length} unread
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notifications.filter((n) => !n.read).length > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">No notifications</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You're all caught up!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type];
            return (
              <button
                key={n.id}
                onClick={() => markAsRead(n.id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all',
                  n.read
                    ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    : 'bg-primary-50/40 dark:bg-primary-950/20 border-primary-200 dark:border-primary-900/50 shadow-sm'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-2 rounded-xl ring-2 flex-shrink-0', typeColors[n.type])}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.title}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 text-[10px] font-medium rounded',
                        typeColors[n.type].split(' ').slice(2, 3).join(' '),
                        'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                      )}>
                        {typeLabels[n.type] || n.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 mt-2 bg-primary-500 rounded-full flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
