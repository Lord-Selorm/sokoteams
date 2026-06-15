import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/api/users';
import {
  FolderKanban, Clock, CheckCircle2, AlertTriangle, ArrowRight, Plus,
  Users, ListTodo, TrendingUp, Calendar, BarChart3, Target, Zap, Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuthStore } from '@/store/authStore';
import type { User as UserType } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';

export default function DashboardPage() {
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const { user } = useAuthStore();
  const isLoading = projectsLoading || tasksLoading;
  const isAdmin = user?.role === 'admin';

  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);

  const myProjectIds = useMemo(() => {
    if (!user) return new Set<string>();
    return new Set(projects.filter(p => p.members?.some(m => m.user.id === user.id)).map(p => p.id));
  }, [projects, user]);

  const visibleProjects = isAdmin ? projects : projects.filter(p => myProjectIds.has(p.id));
  const visibleTasks = isAdmin ? tasks : tasks.filter(t => t.assignedUser.id === user?.id || myProjectIds.has(t.projectId));

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const stats = useMemo(() => ({
    totalProjects: visibleProjects.length,
    activeProjects: visibleProjects.filter(p => p.status === 'active').length,
    totalTasks: visibleTasks.length,
    completedTasks: visibleTasks.filter(t => t.status === 'Done').length,
    inProgressTasks: visibleTasks.filter(t => t.status === 'InProgress').length,
    todoTasks: visibleTasks.filter(t => t.status === 'Todo').length,
    tasksDueToday: visibleTasks.filter(t => t.dueDate === today && t.status !== 'Done').length,
    overdueTasks: visibleTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Done').length,
    completedThisWeek: visibleTasks.filter(t => t.status === 'Done' && t.updatedAt >= weekAgo).length,
    completedThisMonth: visibleTasks.filter(t => t.status === 'Done' && t.updatedAt >= monthAgo).length,
  }), [visibleProjects, visibleTasks, today, weekAgo, monthAgo]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 86400000);
    return visibleTasks
      .filter(t => t.status !== 'Done' && t.status !== 'Cancelled' && t.dueDate && new Date(t.dueDate) <= nextWeek)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 6);
  }, [visibleTasks]);

  const { data: allUsersData } = useQuery<UserType[]>({ queryKey: ['users'], queryFn: getUsers, enabled: isAdmin });
  const allUsers = useMemo(() => Array.isArray(allUsersData) ? allUsersData : [], [allUsersData]);

  const teamProgress = useMemo(() => {
    if (!isAdmin || allUsers.length === 0) return [];
    return allUsers.map(u => {
      const ut = tasks.filter(t => t.assignedUser.id === u.id);
      const done = ut.filter(t => t.status === 'Done').length;
      return {
        user: u,
        total: ut.length,
        done,
        inProgress: ut.filter(t => t.status === 'InProgress').length,
        overdue: ut.filter(t => t.status !== 'Done' && t.dueDate && t.dueDate < today).length,
        percentage: ut.length > 0 ? Math.round((done / ut.length) * 100) : 0,
      };
    }).filter(p => p.total > 0).sort((a, b) => b.percentage - a.percentage);
  }, [tasks, allUsers, isAdmin, today]);

  const myProjects = useMemo(() => {
    return visibleProjects
      .filter(p => p.members?.some(m => m.user.id === user?.id))
      .slice(0, 4);
  }, [visibleProjects, user]);

  const recentTasks = useMemo(() => {
    return [...visibleTasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [visibleTasks]);

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  if (isAdmin) return <AdminDashboard {...{ isLoading, stats, upcomingDeadlines, teamProgress, recentTasks, completionRate, visibleProjects }} />;
  return <UserDashboard {...{ isLoading, stats, upcomingDeadlines, myProjects, recentTasks, completionRate, user, today, tasks }} />;
}

function StatCard({ label, value, icon: Icon, color, href, subtitle }: {
  label: string; value: number | string; icon: any; color: string; href?: string; subtitle?: string;
}) {
  const Wrapper = href ? Link : 'div';
  return (
    <Wrapper {...(href ? { to: href } : {})} className={cn(
      "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5",
      href && "hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 cursor-pointer group"
    )}>
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon className="w-5 h-5" />
        </div>
        {href && <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />}
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </Wrapper>
  );
}

function QuickAction({ label, icon: Icon, href, color }: { label: string; icon: any; href: string; color: string; }) {
  return (
    <Link to={href} className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800",
      "bg-white dark:bg-gray-900 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 group"
    )}>
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{label}</span>
    </Link>
  );
}

function DeadlineItem({ task }: { task: any }) {
  const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000);
  const isToday = daysLeft === 0;
  const isTomorrow = daysLeft === 1;
  const isOverdue = daysLeft < 0;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className={cn(
        "w-2 h-2 rounded-full flex-shrink-0",
        isOverdue ? "bg-red-500" : isToday ? "bg-amber-500" : isTomorrow ? "bg-orange-400" : "bg-blue-400"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{task.assignedUser.name}</p>
      </div>
      <span className={cn(
        "text-xs font-medium px-2 py-0.5 rounded-full",
        isOverdue ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
        isToday ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
        "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
      )}>
        {isOverdue ? `${Math.abs(daysLeft)}d overdue` : isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `${daysLeft}d`}
      </span>
    </div>
  );
}

function SectionHeader({ title, href, icon: Icon }: { title: string; href?: string; icon?: any; }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">{title}</h2>
      </div>
      {href && (
        <Link to={href} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function AdminDashboard({ isLoading, stats, upcomingDeadlines, teamProgress, recentTasks, completionRate, visibleProjects }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overview of your entire workspace</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.totalProjects} icon={FolderKanban} color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" href="/projects" subtitle={`${stats.activeProjects} active`} />
        <StatCard label="Total Tasks" value={stats.totalTasks} icon={ListTodo} color="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" href="/tasks" subtitle={`${stats.inProgressTasks} in progress`} />
        <StatCard label="Completed" value={stats.completedTasks} icon={CheckCircle2} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" href="/tasks" subtitle={`${completionRate}% rate`} />
        <StatCard label="Overdue" value={stats.overdueTasks} icon={AlertTriangle} color={stats.overdueTasks > 0 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"} href="/tasks" subtitle={stats.overdueTasks > 0 ? "Needs attention" : "All clear"} />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <QuickAction label="New Project" icon={Plus} href="/projects" color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
        <QuickAction label="New Task" icon={Plus} href="/tasks" color="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400" />
        <QuickAction label="Manage Users" icon={Users} href="/users" color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
        <QuickAction label="Analytics" icon={BarChart3} href="/analytics" color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="Team Performance" icon={TrendingUp} href="/analytics" />
            <div className="space-y-3">
              {teamProgress.slice(0, 5).map(({ user: u, total, done, inProgress, overdue, percentage }: any) => (
                <div key={u.id} className="flex items-center gap-3">
                   <UserAvatar user={u} size="sm" showOnline />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        percentage >= 80 ? "bg-emerald-500" : percentage >= 50 ? "bg-blue-500" : percentage >= 30 ? "bg-amber-500" : "bg-red-400"
                      )} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[11px] text-gray-400">{done}/{total} done</span>
                      {inProgress > 0 && <span className="text-[11px] text-blue-400">{inProgress} active</span>}
                      {overdue > 0 && <span className="text-[11px] text-red-400">{overdue} overdue</span>}
                    </div>
                  </div>
                </div>
              ))}
              {teamProgress.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No team data yet</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="Recent Tasks" href="/tasks" icon={Clock} />
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tasks yet</p>
            ) : (
              <div className="space-y-1">
                {recentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      task.status === 'Done' ? "bg-emerald-500" :
                      task.status === 'InProgress' ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{task.assignedUser.name}</p>
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full",
                      task.status === 'Done' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                      task.status === 'InProgress' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    )}>
                      {task.status === 'InProgress' ? 'Active' : task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="Upcoming Deadlines" icon={Calendar} />
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No upcoming deadlines</p>
            ) : (
              <div>
                {upcomingDeadlines.map((task: any) => <DeadlineItem key={task.id} task={task} />)}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="Quick Stats" icon={Target} />
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{completionRate}%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">Done This Week</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{stats.completedThisWeek}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">Due Today</span>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{stats.tasksDueToday}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Todo Queue</span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{stats.todoTasks}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
            <h3 className="text-sm font-semibold mb-1">Workspace Health</h3>
            <p className="text-3xl font-bold mb-1">{completionRate}%</p>
            <p className="text-xs text-blue-200">Overall task completion rate</p>
            <div className="mt-3 w-full bg-blue-500/30 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserDashboard({ isLoading, stats, upcomingDeadlines, myProjects, recentTasks, completionRate, user, today, tasks }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Here's what you have on your plate today</p>
        </div>
        <Link to="/my-tasks" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
          <ListTodo className="w-4 h-4" />
          My Tasks
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="My Tasks" value={stats.totalTasks} icon={ListTodo} color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" href="/tasks" subtitle={`${stats.inProgressTasks} active`} />
        <StatCard label="Completed" value={stats.completedTasks} icon={CheckCircle2} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" subtitle={`${completionRate}% rate`} />
        <StatCard label="Due Today" value={stats.tasksDueToday} icon={Clock} color={stats.tasksDueToday > 0 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"} />
        <StatCard label="Overdue" value={stats.overdueTasks} icon={AlertTriangle} color={stats.overdueTasks > 0 ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {myProjects.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <SectionHeader title="My Projects" href="/projects" icon={FolderKanban} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myProjects.map((project: any) => {
                  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
                  const done = projectTasks.filter((t: any) => t.status === 'Done').length;
                  const pct = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0;
                  return (
                    <Link key={project.id} to={`/projects/${project.id}`} className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">{project.title}</h3>
                        <span className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                          project.status === 'active' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                          project.status === 'completed' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                          "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        )}>{project.status}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-2">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{done}/{projectTasks.length} tasks · {pct}%</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="My Recent Tasks" href="/tasks" icon={Clock} />
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-10">
                <ListTodo className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No tasks assigned to you yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      task.status === 'Done' ? "bg-emerald-500" :
                      task.status === 'InProgress' ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{task.title}</p>
                      {task.dueDate && (
                        <p className={cn(
                          "text-xs",
                          task.dueDate < today && task.status !== 'Done' ? "text-red-400" : "text-gray-400 dark:text-gray-500"
                        )}>Due {formatDate(task.dueDate)}</p>
                      )}
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full",
                      task.status === 'Done' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                      task.status === 'InProgress' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                      "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    )}>
                      {task.status === 'InProgress' ? 'Active' : task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="Upcoming Deadlines" icon={Calendar} />
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No upcoming deadlines</p>
            ) : (
              <div>
                {upcomingDeadlines.map((task: any) => <DeadlineItem key={task.id} task={task} />)}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <SectionHeader title="My Progress" icon={Target} />
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{completionRate}%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">Active Tasks</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{stats.inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">Due Today</span>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{stats.tasksDueToday}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">In Queue</span>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{stats.todoTasks}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl p-5 text-white">
            <h3 className="text-sm font-semibold mb-1">Your Progress</h3>
            <p className="text-3xl font-bold mb-1">{completionRate}%</p>
            <p className="text-xs text-violet-200">Task completion rate</p>
            <div className="mt-3 w-full bg-violet-500/30 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/tasks" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1">
                <ListTodo className="w-4 h-4" /> View All Tasks
              </Link>
              <Link to="/projects" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1">
                <FolderKanban className="w-4 h-4" /> My Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
