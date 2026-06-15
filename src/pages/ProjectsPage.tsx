import { useState, useMemo } from 'react';
import { Plus, Search, LayoutGrid, List, FolderKanban, CheckCircle2, Clock, AlertTriangle, Archive, RotateCcw } from 'lucide-react';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, useArchiveProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuthStore } from '@/store/authStore';
import type { Project } from '@/types';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectModal from '@/components/projects/ProjectModal';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import Pagination from '@/components/common/Pagination';
import { cn } from '@/lib/utils';

export default function ProjectsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: projectsData, isLoading } = useProjects(showArchived);
  const { data: tasksData } = useTasks();
  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);
  const { user: currentUser, isAdmin } = useAuthStore();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const archiveMutation = useArchiveProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 9;

  const projectsWithProgress = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const doneTasks = projectTasks.filter((t) => t.status === 'Done').length;
      const inProgressTasks = projectTasks.filter((t) => t.status === 'InProgress').length;
      const overdueTasks = projectTasks.filter(t => t.status !== 'Done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
      const completion = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
      return { ...project, completionPercentage: completion, totalTasks: projectTasks.length, doneTasks, inProgressTasks, overdueTasks };
    });
  }, [projects, tasks]);

  const filteredProjects = useMemo(() => {
    return projectsWithProgress.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projectsWithProgress, search, statusFilter]);

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    onHold: projects.filter(p => p.status === 'on-hold').length,
  }), [projects]);

  const canEditOrDelete = (project: Project) => isAdmin() || project.members?.some(m => m.user.id === currentUser?.id && m.projectRole === 'lead');

  const openCreateModal = () => { setEditingProject(undefined); setIsModalOpen(true); };
  const openEditModal = (project: Project) => { setEditingProject(project); setIsModalOpen(true); };
  const openDeleteDialog = (project: Project) => { setDeletingProject(project); setIsDeleteOpen(true); };

  const handleCreate = async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    await createMutation.mutateAsync(data);
    setIsModalOpen(false);
  };

  const handleUpdate = async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingProject) return;
    await updateMutation.mutateAsync({ id: editingProject.id, data });
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    await deleteMutation.mutateAsync(deletingProject.id);
    setIsDeleteOpen(false);
    setDeletingProject(null);
  };

  const handleArchive = async (project: Project) => {
    await archiveMutation.mutateAsync(project.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and track your team projects</p>
          </div>
          <div className="flex items-center gap-1 ml-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            <button onClick={() => setShowArchived(false)} className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-colors', !showArchived ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200')}>Active</button>
            <button onClick={() => setShowArchived(true)} className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5', showArchived ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200')}><Archive className="w-3.5 h-3.5" /> Archived</button>
          </div>
        </div>
        {isAdmin() && !showArchived && (
          <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: stats.total, icon: FolderKanban, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
          { label: 'Active', value: stats.active, icon: Clock, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
          { label: 'On Hold', value: stats.onHold, icon: AlertTriangle, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
      <div className="flex items-center gap-3 flex-wrap gap-2">
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

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on-hold">On Hold</option>
        </select>
        <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <button onClick={() => setView('grid')} className={cn("p-2.5 transition-colors", view === 'grid' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={cn("p-2.5 transition-colors", view === 'list' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
          <FolderKanban className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {search || statusFilter !== 'all' ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : isAdmin() ? 'Create your first project to get started' : 'No projects available yet'}
          </p>
          {isAdmin() && !search && statusFilter === 'all' && (
            <button onClick={openCreateModal} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
              Create Project
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={canEditOrDelete(project) && !showArchived ? openEditModal : undefined}
              onDelete={canEditOrDelete(project) ? openDeleteDialog : undefined}
              onArchive={canEditOrDelete(project) ? handleArchive : undefined}
              showArchived={showArchived}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          {paginatedProjects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={canEditOrDelete(project) && !showArchived ? openEditModal : undefined}
              onDelete={canEditOrDelete(project) ? openDeleteDialog : undefined}
              onArchive={canEditOrDelete(project) ? handleArchive : undefined}
              showArchived={showArchived}
              listMode
              isLast={i === paginatedProjects.length - 1}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredProjects.length} pageSize={PAGE_SIZE} />

      <ProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={editingProject ? handleUpdate : handleCreate} project={editingProject} isLoading={createMutation.isPending || updateMutation.isPending} />
      <DeleteProjectDialog isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setDeletingProject(null); }} onConfirm={handleDelete} title="Project" itemName={deletingProject?.title ?? ''} isLoading={deleteMutation.isPending} />
    </div>
  );
}
