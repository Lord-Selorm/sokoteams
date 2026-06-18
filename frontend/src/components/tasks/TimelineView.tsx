import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, MoreHorizontal } from 'lucide-react';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';

interface TimelineViewProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
}

export default function TimelineView({ tasks, onEditTask }: TimelineViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDays, setViewDays] = useState(30);

  const startDate = new Date(currentDate);
  startDate.setDate(startDate.getDate() - 7);

  const endDate = new Date(currentDate);
  endDate.setDate(endDate.getDate() + viewDays - 7);

  const days = useMemo(() => {
    const days = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const getTaskPosition = (task: Task) => {
    const taskStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate);
    const taskEnd = new Date(task.dueDate);
    
    const startOffset = Math.max(0, (taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.max(1, (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24) + 1);
    
    return { startOffset, duration };
  };

  const getTaskColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-blue-500';
      case 'Low': return 'bg-green-500';
    }
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-7)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <button
            onClick={() => navigateDate(7)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewDays}
            onChange={(e) => setViewDays(Number(e.target.value))}
            className="px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100"
          >
            <option value={14}>2 Weeks</option>
            <option value={30}>1 Month</option>
            <option value={90}>3 Months</option>
          </select>
          <button className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Date headers */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <div className="w-64 flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Task</span>
            </div>
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'w-12 flex-shrink-0 px-1 py-2 text-center border-r border-gray-200 dark:border-gray-800',
                  day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50 dark:bg-gray-900' : ''
                )}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">{day.getDate()}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>
            ))}
          </div>

          {/* Task rows */}
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {tasks.map((task) => {
              const { startOffset, duration } = getTaskPosition(task);
              return (
                <div key={task.id} className="flex hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-3 h-3 rounded', getTaskColor(task.priority))} />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {task.assignedUser.name}
                    </div>
                  </div>
                  <div className="flex-1 relative h-14">
                    <div
                      className={cn(
                        'absolute top-3 h-8 rounded-md cursor-pointer hover:opacity-90 transition-opacity',
                        getTaskColor(task.priority)
                      )}
                      style={{
                        left: `${startOffset * 48}px`,
                        width: `${duration * 48}px`,
                      }}
                      onClick={() => onEditTask?.(task)}
                    >
                      <div className="px-2 py-1 text-xs text-white truncate">
                        {task.title}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-xs text-gray-600 dark:text-gray-400">Priority:</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">High</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}
