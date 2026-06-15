import { useMemo } from 'react';
import { User, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import type { Task, WorkloadEntry } from '@/types';
import { cn, resolveAvatarUrl } from '@/lib/utils';

interface WorkloadViewProps {
  tasks: Task[];
}

export default function WorkloadView({ tasks }: WorkloadViewProps) {
  const workloadData = useMemo(() => {
    const userMap = new Map<string, WorkloadEntry>();

    tasks.forEach(task => {
      const userId = task.assignedUser.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          user: task.assignedUser,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          estimatedHours: 0,
          actualHours: 0,
        });
      }

      const entry = userMap.get(userId)!;
      entry.totalTasks++;
      entry.estimatedHours += task.estimatedHours || 0;
      entry.actualHours += task.actualHours || 0;

      if (task.status === 'Done') {
        entry.completedTasks++;
      } else if (task.status === 'InProgress') {
        entry.inProgressTasks++;
      }

      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done') {
        entry.overdueTasks++;
      }
    });

    return Array.from(userMap.values());
  }, [tasks]);

  const totalTasks = workloadData.reduce((sum, entry) => sum + entry.totalTasks, 0);
  const totalCompleted = workloadData.reduce((sum, entry) => sum + entry.completedTasks, 0);
  const overallCompletionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  const getWorkloadLevel = (entry: WorkloadEntry) => {
    const ratio = entry.inProgressTasks / Math.max(entry.totalTasks, 1);
    if (ratio > 0.7) return { level: 'High', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' };
    if (ratio > 0.4) return { level: 'Medium', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' };
    return { level: 'Low', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' };
  };

  return (
    <div className="p-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Team Members</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-200">{workloadData.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-200">{totalCompleted}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-200">
            {workloadData.reduce((sum, entry) => sum + entry.inProgressTasks, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Overdue</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-200">
            {workloadData.reduce((sum, entry) => sum + entry.overdueTasks, 0)}
          </p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-200">Overall Completion Rate</span>
          </div>
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-200">
            {overallCompletionRate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallCompletionRate}%` }}
          />
        </div>
      </div>

      {/* Team workload table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Team Workload</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400">Team Member</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Total</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Completed</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">In Progress</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Overdue</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Workload</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {workloadData.map((entry) => {
              const workload = getWorkloadLevel(entry);
              const progress = entry.totalTasks > 0 ? (entry.completedTasks / entry.totalTasks) * 100 : 0;
              return (
                <tr key={entry.userId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveAvatarUrl(entry.user.avatar)}
                        alt={entry.user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{entry.user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{entry.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-gray-200">{entry.totalTasks}</td>
                  <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">{entry.completedTasks}</td>
                  <td className="px-4 py-3 text-center text-sm text-blue-600 dark:text-blue-400">{entry.inProgressTasks}</td>
                  <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">{entry.overdueTasks}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('px-2 py-1 text-xs rounded', workload.color)}>
                      {workload.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
