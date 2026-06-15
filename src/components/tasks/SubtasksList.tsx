import { useState } from 'react';
import { Plus, Check, Trash2, Calendar, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { Subtask } from '@/types';

interface SubtasksListProps {
  subtasks: Subtask[];
  taskId: string;
  onAddSubtask: (title: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
}

export default function SubtasksList({
  subtasks,
  taskId,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: SubtasksListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuthStore();

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      onAddSubtask(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Subtasks</h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {completedCount}/{totalCount}
          </span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
          <div
            className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Add subtask form */}
      {isAdding && (
        <form onSubmit={handleAddSubtask} className="mb-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add a subtask..."
              className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewSubtaskTitle('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Subtasks list */}
      <div className="space-y-2">
        {subtasks.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
            No subtasks yet
          </p>
        ) : (
          subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <button
                onClick={() => onToggleSubtask(subtask.id)}
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  subtask.completed
                    ? 'bg-purple-600 dark:bg-purple-400 border-purple-600 dark:border-purple-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400'
                )}
              >
                {subtask.completed && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm truncate',
                    subtask.completed
                      ? 'text-gray-500 dark:text-gray-400 line-through'
                      : 'text-gray-900 dark:text-gray-200'
                  )}
                >
                  {subtask.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {subtask.assignee && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {subtask.assignee.name}
                      </span>
                    </div>
                  )}
                  {subtask.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(subtask.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDeleteSubtask(subtask.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
