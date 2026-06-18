import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Calendar, User, MoreVertical, Edit, Trash2, GripVertical } from 'lucide-react';
import type { Task } from '@/types';
import PriorityBadge from './PriorityBadge';
import TaskStatusBadge from './TaskStatusBadge';
import { formatDate, isOverdue, cn } from '@/lib/utils';

interface Props { task: Task; onEdit?: (task: Task) => void; onDelete?: (task: Task) => void; onStatusChange: (taskId: string, newStatus: Task['status']) => void; isDraggable?: boolean; }

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, isDraggable }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !isDraggable });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const overdue = isOverdue(task.dueDate) && task.status !== 'Done';

  return (
    <div ref={setNodeRef} style={style} className={cn('bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 relative group', isDragging && 'opacity-50', overdue && 'border-l-4 border-l-red-500')}>
      <div className="flex items-start gap-2">
        {isDraggable && (
          <button {...listeners} {...attributes} className="p-0.5 mt-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</h4>
            <div className="relative flex-shrink-0">
              {(onEdit || onDelete) && (
                <>
                  <button onClick={() => setShowMenu(!showMenu)} className="p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 opacity-100 md:opacity-0 md:group-hover:opacity-100"><MoreVertical className="w-3.5 h-3.5" /></button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-7 z-20 w-28 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-1">
                        {onEdit && <button onClick={() => { onEdit(task); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"><Edit className="w-3 h-3" /> Edit</button>}
                        {onDelete && <button onClick={() => { onDelete(task); setShowMenu(false); }} className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Delete</button>}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{task.description}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap"><PriorityBadge priority={task.priority} /><TaskStatusBadge status={task.status} /></div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className={cn('flex items-center gap-1', overdue && 'text-red-600 dark:text-red-400 font-medium')}><Calendar className="w-3 h-3" />{formatDate(task.dueDate)}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assignedUser.name}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <select value={task.status} onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])} className="w-full text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer">
              <option value="Todo">Todo</option><option value="InProgress">In Progress</option><option value="Done">Done</option><option value="Blocked">Blocked</option><option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
