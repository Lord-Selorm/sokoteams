import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, CheckCircle2, Clock, AlertTriangle, ListTodo, BarChart3, Target, Trash2 } from 'lucide-react';
import { useProjects, useUpdateProject } from '@/hooks/useProjects';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useMemo, useState } from 'react';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import type { Task, ProjectStatus } from '@/types';
import StatusBadge from '@/components/projects/StatusBadge';
import UserAvatar from '@/components/common/UserAvatar';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: projectsData } = useProjects();
  const { data: tasksData } = useTasks();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const updateProjectMutation = useUpdateProject();
  const { user: currentUser, isAdmin } = useAuthStore();
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);

  const project = projects.find((p) => p.id === id);
  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === id), [tasks, id]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      total: projectTasks.length,
      done: projectTasks.filter(t => t.status === 'Done').length,
      inProgress: projectTasks.filter(t => t.status === 'InProgress').length,
      todo: projectTasks.filter(t => t.status === 'Todo').length,
      overdue: projectTasks.filter(t => t.status !== 'Done' && t.dueDate && t.dueDate < today).length,
    };
  }, [projectTasks]);

  const completion = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const progressColor = completion >= 80 ? 'bg-emerald-500' : completion >= 50 ? 'bg-blue-500' : completion >= 25 ? 'bg-amber-500' : 'bg-red-400';

  const canEdit = isAdmin() || project?.members?.some(m => m.user.id === currentUser?.id && m.projectRole === 'lead');

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateMutation.mutate({ id: taskId, data: { status: newStatus } });
  };

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    await deleteMutation.mutateAsync(deletingTask.id);
    setIsDeleteOpen(false);
    setDeletingTask(null);
  };

  const handleQuickStatus = async (status: ProjectStatus) => {
    if (!project) return;
    await updateProjectMutation.mutateAsync({ id: project.id, data: { status } });
  };

  if (!project) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Project not found</h3>
        <Link to="/projects" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <Link to="/projects" className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{project.title}</h1>
              <p className="text-sm text-blue-100 mt-0.5">{project.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-11">
            <StatusBadge status={project.status} />
            <span className="text-sm text-blue-100">{completion}% complete</span>
            {project.dueDate && (
              <span className="text-sm text-blue-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Due {formatDate(project.dueDate)}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">Overall Progress</span>
                <span className="font-semibold text-gray-900 dark:text-white">{completion}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                <div className={cn("h-2.5 rounded-full transition-all duration-500", progressColor)} style={{ width: `${completion}%` }} />
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 mr-1">Quick status:</span>
                {(['active', 'completed', 'on-hold'] as ProjectStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleQuickStatus(s)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                      project.status === s
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    )}
                  >
                    {s === 'on-hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, icon: ListTodo, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
          { label: 'To Do', value: stats.todo, icon: Target, color: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: stats.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-xl", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Task Board</h2>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-gray-400" /> Todo ({stats.todo})
                </span>
                <span className="flex items-center gap-1.5 text-blue-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Active ({stats.inProgress})
                </span>
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done ({stats.done})
                </span>
              </div>
            </div>
            {projectTasks.length > 0 ? (
              <KanbanBoard tasks={projectTasks} onStatusChange={handleStatusChange} />
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ListTodo className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No tasks yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create tasks to start tracking progress</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Start Date</span>
                <span className="font-medium text-gray-900 dark:text-white">{project.startDate ? formatDate(project.startDate) : 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                <span className="font-medium text-gray-900 dark:text-white">{project.dueDate ? formatDate(project.dueDate) : 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Completion</span>
                <span className="font-semibold text-gray-900 dark:text-white">{completion}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Team ({project.members?.length ?? 0})</h3>
            <div className="space-y-3">
              {project.members?.map(m => {
                const memberTasks = projectTasks.filter(t => t.assignedUser?.id === m.user.id);
                const memberDone = memberTasks.filter(t => t.status === 'Done').length;
                const memberPct = memberTasks.length > 0 ? Math.round((memberDone / memberTasks.length) * 100) : 0;
                return (
                  <div key={m.user.id} className="flex items-center gap-3">
                    <UserAvatar user={m.user} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.user.name}</p>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{memberPct}%</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1">
                          <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${memberPct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{memberDone}/{memberTasks.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!project.members || project.members.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-2">No members</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeleteProjectDialog isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setDeletingTask(null); }} onConfirm={handleConfirmDelete} title="Task" itemName={deletingTask?.title ?? ''} isLoading={deleteMutation.isPending} />
    </div>
  );
}
