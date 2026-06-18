import { Calendar, User, Edit, Trash2, Archive, RotateCcw } from 'lucide-react';
import type { Task } from '@/types';
import PriorityBadge from './PriorityBadge';
import TaskStatusBadge from './TaskStatusBadge';
import { formatDate, isOverdue, cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';

interface Props { tasks: Task[]; onEdit?: (task: Task) => void; onDelete?: (task: Task) => void; onArchive?: (task: Task) => void; onStatusChange: (taskId: string, newStatus: Task['status']) => void; showArchived?: boolean; }

export default function TaskTable({ tasks, onEdit, onDelete, onArchive, onStatusChange, showArchived }: Props) {
  if (tasks.length === 0) return <div className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">No tasks match your filters</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Name</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assignee</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due date</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            {(onEdit || onDelete) && (
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {tasks.map((task) => {
            const overdue = isOverdue(task.dueDate) && task.status !== 'Done';
            return (
              <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{task.description}</p>}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={task.assignedUser} size="sm" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{task.assignedUser?.name || 'Unassigned'}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span className={cn('text-sm flex items-center gap-1', overdue ? 'text-red-500 font-medium' : 'text-gray-500 dark:text-gray-400')}>
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(task.dueDate)}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="py-2.5 px-3">
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
                    className="text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Todo">Todo</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Done">Done</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
                {(onEdit || onDelete || onArchive) && (
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && !showArchived && (
                        <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit task">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {onArchive && (
                        <button onClick={() => onArchive(task)} className={cn('p-1.5 rounded-lg transition-colors', showArchived ? 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' : 'text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20')} title={showArchived ? 'Restore from archive' : 'Archive task'}>
                          {showArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(task)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete task">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
