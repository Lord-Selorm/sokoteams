import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, MoreHorizontal } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
}

export default function CalendarView({ tasks, onEditTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  const days = useMemo(() => {
    const days = [];
    const current = new Date(startDate);
    const endDate = new Date(lastDayOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [startDate, lastDayOfMonth]);

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      const dueDate = new Date(task.dueDate);
      return dueDate.toDateString() === date.toDateString();
    });
  };

  const navigateMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  const getTaskColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical': return 'border-l-red-500';
      case 'High': return 'border-l-orange-500';
      case 'Medium': return 'border-l-blue-500';
      case 'Low': return 'border-l-green-500';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <button
          onClick={() => setCurrentDate(new Date())}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          Today
        </button>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date) => {
            const dayTasks = getTasksForDay(date);
            return (
              <div
                key={date.toISOString()}
                className={cn(
                  'min-h-24 p-1 border border-gray-200 dark:border-gray-800',
                  !isCurrentMonth(date) && 'bg-gray-50 dark:bg-gray-900/50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'text-xs',
                      isToday(date) && 'w-6 h-6 flex items-center justify-center bg-purple-600 text-white rounded-full',
                      isCurrentMonth(date) ? 'text-gray-900 dark:text-gray-200' : 'text-gray-400'
                    )}
                  >
                    {date.getDate()}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{dayTasks.length}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onEditTask?.(task)}
                      className={cn(
                        'px-1.5 py-0.5 text-xs rounded border-l-2 cursor-pointer hover:opacity-80 transition-opacity',
                        getTaskColor(task.priority),
                        task.status === 'Done' && 'opacity-50 line-through'
                      )}
                    >
                      <span className="truncate block">{task.title}</span>
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 px-1.5">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
