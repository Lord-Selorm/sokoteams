import { useMemo, useState } from 'react';
import { BarChart3, PieChart, TrendingUp, Download, Calendar, Filter, Users, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { cn, resolveAvatarUrl } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import type { TaskStatus, Priority } from '@/types';

export default function ReportsPage() {
  const { data: projectsData } = useProjects();
  const { data: tasksData } = useTasks();
  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedProject, setSelectedProject] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let filtered = [...tasks];
    
    if (selectedProject !== 'all') {
      filtered = filtered.filter(t => t.projectId === selectedProject);
    }
    
    if (dateRange !== 'all') {
      const now = new Date();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => new Date(t.createdAt) >= cutoff);
    }
    
    return filtered;
  }, [tasks, selectedProject, dateRange]);

  const taskStats = useMemo(() => {
    if (!filteredTasks.length) return null;
    
    const byStatus: Record<TaskStatus, number> = {
      Todo: 0,
      InProgress: 0,
      Done: 0,
      Blocked: 0,
      Cancelled: 0,
    };
    
    const byPriority: Record<Priority, number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };
    
    filteredTasks.forEach(task => {
      byStatus[task.status]++;
      byPriority[task.priority]++;
    });
    
    const completionRate = (byStatus.Done / filteredTasks.length) * 100;
    const overdueCount = filteredTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'
    ).length;
    
    return { byStatus, byPriority, completionRate, overdueCount };
  }, [filteredTasks]);

  const projectStats = useMemo(() => {
    if (!projects || !tasks) return [];
    
    return projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const completed = projectTasks.filter(t => t.status === 'Done').length;
      const inProgress = projectTasks.filter(t => t.status === 'InProgress').length;
      const overdue = projectTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done'
      ).length;
      
      return {
        project,
        total: projectTasks.length,
        completed,
        inProgress,
        overdue,
        completionRate: projectTasks.length > 0 ? (completed / projectTasks.length) * 100 : 0,
      };
    }).filter(p => p.total > 0);
  }, [projects, tasks]);

  const teamPerformance = useMemo(() => {
    if (!tasks) return [];
    
    const userMap = new Map();
    
    tasks.forEach(task => {
      const userId = task.assignedUser.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user: task.assignedUser,
          total: 0,
          completed: 0,
          overdue: 0,
        });
      }
      
      const entry = userMap.get(userId);
      entry.total++;
      if (task.status === 'Done') entry.completed++;
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done') {
        entry.overdue++;
      }
    });
    
    return Array.from(userMap.values())
      .map(entry => ({
        ...entry,
        completionRate: entry.total > 0 ? (entry.completed / entry.total) * 100 : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [tasks]);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Done': return 'bg-emerald-500';
      case 'InProgress': return 'bg-blue-500';
      case 'Todo': return 'bg-gray-400';
      case 'Blocked': return 'bg-red-500';
      case 'Cancelled': return 'bg-gray-300';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500';
      case 'High': return 'bg-orange-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Track your team's performance and project progress."
      >
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Projects</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredTasks.length}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Tasks</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {taskStats?.completionRate.toFixed(0) || 0}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion Rate</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {taskStats?.byStatus.InProgress || 0}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">In Progress</p>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {taskStats?.overdueCount || 0}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Overdue Tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Task Status Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Task Status Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-6">
            {taskStats ? (
              <div className="space-y-4">
                {Object.entries(taskStats.byStatus).map(([status, count]) => (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                        {status === 'InProgress' ? 'In Progress' : status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all duration-300', getStatusColor(status as TaskStatus))}
                        style={{ width: `${(count / filteredTasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Priority Distribution</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="p-6">
            {taskStats ? (
              <div className="space-y-4">
                {Object.entries(taskStats.byPriority).map(([priority, count]) => (
                  <div key={priority}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{priority}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn('h-2 rounded-full transition-all duration-300', getPriorityColor(priority as Priority))}
                        style={{ width: `${(count / filteredTasks.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Project Progress */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Progress</h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="p-6">
          {projectStats.length > 0 ? (
            <div className="space-y-4">
              {projectStats.map(({ project, total, completed, inProgress, overdue, completionRate }) => (
                <div key={project.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200">{project.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {completed} of {total} tasks completed
                      </p>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {completionRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div
                      className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-gray-600 dark:text-gray-400">Completed: {completed}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">In Progress: {inProgress}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-gray-600 dark:text-gray-400">Overdue: {overdue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No project data available</p>
          )}
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Performance</h3>
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div className="p-6">
          {teamPerformance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="pb-3">Team Member</th>
                    <th className="pb-3 text-center">Total Tasks</th>
                    <th className="pb-3 text-center">Completed</th>
                    <th className="pb-3 text-center">Overdue</th>
                    <th className="pb-3 text-center">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {teamPerformance.map(({ user, total, completed, overdue, completionRate }) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveAvatarUrl(user.avatar)}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center text-sm text-gray-600 dark:text-gray-400">{total}</td>
                      <td className="py-3 text-center text-sm text-emerald-600 dark:text-emerald-400">{completed}</td>
                      <td className="py-3 text-center text-sm text-red-600 dark:text-red-400">{overdue}</td>
                      <td className="py-3 text-center">
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium rounded',
                          completionRate >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
                          completionRate >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                          'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        )}>
                          {completionRate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No team data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
