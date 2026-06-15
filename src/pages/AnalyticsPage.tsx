import { useMemo } from 'react';
import { FolderKanban, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import ProductivityChart from '@/components/analytics/ProductivityChart';
import WeeklyActivityChart from '@/components/analytics/WeeklyActivityChart';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);
  const isLoading = projectsLoading || tasksLoading;

  const stats = useMemo(() => {
    if (!projects || !tasks) return null;
    const completed = tasks.filter((t) => t.status === 'Done').length;
    const pending = tasks.filter((t) => t.status !== 'Done').length;
    return {
      totalProjects: projects.length,
      completedTasks: completed,
      pendingTasks: pending,
      completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
    };
  }, [projects, tasks]);

  const productivityData = useMemo(() => {
    if (!projects || !tasks) return [];
    return projects.map((p) => ({
      name: p.title.length > 12 ? p.title.slice(0, 12) + '...' : p.title,
      completed: tasks.filter((t) => t.projectId === p.id && t.status === 'Done').length,
      pending: tasks.filter((t) => t.projectId === p.id && t.status !== 'Done').length,
    }));
  }, [projects, tasks]);

  const weeklyActivityData = useMemo(() => {
    if (!tasks) return [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    return days.map((day, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - ((today.getDay() + 6) % 7) + index);
      const dateStr = date.toISOString().split('T')[0];
      return { day, tasks: tasks.filter((t) => t.createdAt.split('T')[0] === dateStr).length };
    });
  }, [tasks]);

  const statCards = [
    { title: 'Total Projects', value: stats?.totalProjects ?? 0, icon: FolderKanban, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' },
    { title: 'Completed', value: stats?.completedTasks ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20' },
    { title: 'Pending', value: stats?.pendingTasks ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20' },
    { title: 'Completion Rate', value: `${stats?.completionRate ?? 0}%`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20' },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, i) => (
          <div key={stat.title} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('p-2 rounded-lg', stat.color)}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {isLoading ? '-' : stat.value}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <div className="card p-5 h-72 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-4" /><div className="h-56 bg-gray-200 dark:bg-gray-800 rounded" /></div>
            <div className="card p-5 h-72 animate-pulse"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-4" /><div className="h-56 bg-gray-200 dark:bg-gray-800 rounded" /></div>
          </>
        ) : (
          <>
            <ProductivityChart data={productivityData} />
            <WeeklyActivityChart data={weeklyActivityData} />
          </>
        )}
      </div>
    </div>
  );
}
