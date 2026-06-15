import { useState, useMemo, useEffect } from 'react';
import { Plus, Filter, X, ChevronDown, Users, Archive, RotateCcw, Trash2, CheckSquare as CheckSquareIcon, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useArchiveTask } from '@/hooks/useTasks';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useProjects } from '@/hooks/useProjects';
import { getUsers } from '@/api/users';
import { notifyTaskAssigned, notifyTaskCompleted, notifyTaskOverdue } from '@/services/notificationService';
import type { Task, TaskStatus, Priority, User as UserType } from '@/types';
import TaskModal from '@/components/tasks/TaskModal';
import KanbanBoard from '@/components/tasks/KanbanBoard';
import TaskTable from '@/components/tasks/TaskTable';
import TimelineView from '@/components/tasks/TimelineView';
import CalendarView from '@/components/tasks/CalendarView';
import WorkloadView from '@/components/workload/WorkloadView';
import DeleteProjectDialog from '@/components/projects/DeleteProjectDialog';
import Pagination from '@/components/common/Pagination';
import { cn, API_URL } from '@/lib/utils';

type ViewMode = 'list' | 'board' | 'calendar' | 'timeline' | 'table' | 'workload';

export default function TasksPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: tasksData, isLoading, error } = useTasks(showArchived);
  const tasks = useMemo(() => Array.isArray(tasksData) ? tasksData : [], [tasksData]);
  const { data: projectsData } = useProjects();
  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const { data: usersData } = useQuery<UserType[]>({ queryKey: ['users'], queryFn: getUsers });
  const users = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();
  const archiveMutation = useArchiveTask();
  const { user, isAdmin } = useAuthStore();
  const adminUsers = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState('status');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(localSearch, 300);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter, priorityFilter, dueDateFrom, dueDateTo, showArchived]);

  useEffect(() => {
    if (!tasks.length || !adminUsers.length) return;
    const now = new Date().toISOString().split('T')[0];
    const overdue = tasks.filter((t) => t.status !== 'Done' && t.status !== 'Cancelled' && t.dueDate && t.dueDate < now);
    const notified = new Set(JSON.parse(localStorage.getItem('overdue-notified') || '[]'));
    const newOverdue = overdue.filter((t) => !notified.has(t.id));
    if (newOverdue.length === 0) return;
    for (const t of newOverdue) {
      notified.add(t.id);
      const projectTitle = projects.find((p) => p.id === t.projectId)?.title ?? 'Unknown';
      notifyTaskOverdue(t, projectTitle, adminUsers);
    }
    localStorage.setItem('overdue-notified', JSON.stringify([...notified]));
  }, [tasks, projects, adminUsers]);

  const openCreateModal = () => { setEditingTask(undefined); setIsModalOpen(true); };
  const openEditModal = (task: Task) => { setEditingTask(task); setIsModalOpen(true); };
  const openDeleteDialog = (task: Task) => { setDeletingTask(task); setIsDeleteOpen(true); };

  const handleCreate = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const created = await createMutation.mutateAsync(data);
      setIsModalOpen(false);
      const projectTitle = projects.find((p) => p.id === created.projectId)?.title ?? 'Unknown';
      if (created.assignedUser?.id && created.assignedUser.id !== '0') {
        notifyTaskAssigned(created, projectTitle, created.assignedUser);
      }
      if (created.status === 'Done') {
        if (user) notifyTaskCompleted(created, projectTitle, user, adminUsers);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleUpdate = async (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingTask) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: editingTask.id, data });
      setIsModalOpen(false);
      setEditingTask(undefined);
      const projectTitle = projects.find((p) => p.id === updated.projectId)?.title ?? 'Unknown';
      const assigneeChanged = updated.assignedUser?.id !== editingTask.assignedUser?.id;
      if (assigneeChanged && updated.assignedUser?.id && updated.assignedUser.id !== '0') {
        notifyTaskAssigned(updated, projectTitle, updated.assignedUser);
      }
      if (updated.status === 'Done' && editingTask.status !== 'Done') {
        if (user) notifyTaskCompleted(updated, projectTitle, user, adminUsers);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      const updated = await updateMutation.mutateAsync({ id: taskId, data: { status: newStatus } });
      const projectTitle = projects.find((p) => p.id === updated.projectId)?.title ?? 'Unknown';
      if (updated.status === 'Done' && task.status !== 'Done') {
        if (user) notifyTaskCompleted(updated, projectTitle, user, adminUsers);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async () => {
    if (!deletingTask) return;
    try {
      await deleteMutation.mutateAsync(deletingTask.id);
      setIsDeleteOpen(false);
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleArchive = async (task: Task) => {
    try {
      await archiveMutation.mutateAsync(task.id);
    } catch (err) {
      console.error('Failed to archive task:', err);
    }
  };

  const filteredSortedTasks = useMemo(() => {
    let filtered = [...tasks];
    
    // Filter tasks based on user role
    // Admins see all tasks, regular users see only their assigned tasks
    if (!isAdmin()) {
      filtered = filtered.filter((t) => t.assignedUser.id === user?.id);
    }
    
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (statusFilter) filtered = filtered.filter((t) => t.status === statusFilter);
    if (priorityFilter) filtered = filtered.filter((t) => t.priority === priorityFilter);
    if (dueDateFrom) filtered = filtered.filter((t) => t.dueDate && t.dueDate >= dueDateFrom);
    if (dueDateTo) filtered = filtered.filter((t) => t.dueDate && t.dueDate <= dueDateTo);
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
        case 'priority': return ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 0) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 0);
        case 'status': return ({ Todo: 0, InProgress: 1, Done: 2 }[a.status] ?? 0) - ({ Todo: 0, InProgress: 1, Done: 2 }[b.status] ?? 0);
        case 'title': return a.title.localeCompare(b.title);
        default: return 0;
      }
    });
  }, [tasks, debouncedSearch, statusFilter, priorityFilter, dueDateFrom, dueDateTo, sortBy, user, isAdmin]);

  const totalPages = Math.ceil(filteredSortedTasks.length / PAGE_SIZE);
  const paginatedTasks = filteredSortedTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllTasks = () => {
    if (selectedTaskIds.size === paginatedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(paginatedTasks.map(t => t.id)));
    }
  };

  const handleBatchAction = async (action: 'delete' | 'archive' | 'status' | 'priority', value?: string) => {
    const ids = Array.from(selectedTaskIds);
    if (ids.length === 0) return;
    try {
      const token = (() => { try { const raw = localStorage.getItem('auth-store'); return raw ? JSON.parse(raw)?.state?.token : ''; } catch { return ''; } })();
      await fetch(`${API_URL}/tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids, action, value }),
      });
      setSelectedTaskIds(new Set());
      window.location.reload();
    } catch (err) {
      console.error('Batch action failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Project Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Team Space</span>
          <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">/</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-200">{isAdmin() ? 'All Tasks' : 'My Tasks'}</span>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>

      {/* View Options and Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => { setShowArchived(false); }}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', !showArchived ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            Active
          </button>
          <button
            onClick={() => { setShowArchived(true); setViewMode('list'); }}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5', showArchived ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            <Archive className="w-3.5 h-3.5" /> Archived
          </button>
          {!showArchived && (<>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button
            onClick={() => setViewMode('list')}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', viewMode === 'board' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', viewMode === 'calendar' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', viewMode === 'timeline' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            Table
          </button>
          <button
            onClick={() => setViewMode('workload')}
            className={cn('px-3 py-1.5 text-sm font-medium rounded transition-colors', viewMode === 'workload' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}
          >
            <Users className="w-4 h-4" />
          </button>
          </>)}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button className={cn('px-2 py-1 text-xs rounded transition-colors', showSubtasks ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')} onClick={() => setShowSubtasks(!showSubtasks)}>
              Subtasks
            </button>
          </div>
        </div>
      </div>

      {/* Filter/Customization Bar */}
      <div className={cn('flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 transition-all', showFilterBar ? 'flex-wrap' : 'hidden')}>
        <div className="relative flex-1 min-w-0 flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="">All Status</option>
          <option value="Todo">Todo</option>
          <option value="InProgress">In Progress</option>
          <option value="Done">Done</option>
          <option value="Blocked">Blocked</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <input
          type="date"
          value={dueDateFrom}
          onChange={(e) => setDueDateFrom(e.target.value)}
          placeholder="From"
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        <input
          type="date"
          value={dueDateTo}
          onChange={(e) => setDueDateTo(e.target.value)}
          placeholder="To"
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        >
          <option value="dueDate">Sort: Due Date</option>
          <option value="priority">Sort: Priority</option>
          <option value="status">Sort: Status</option>
          <option value="title">Sort: Title</option>
        </select>
        {(localSearch || statusFilter || priorityFilter || dueDateFrom || dueDateTo) && (
          <button
            onClick={() => { setLocalSearch(''); setStatusFilter(''); setPriorityFilter(''); setDueDateFrom(''); setDueDateTo(''); }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
        <div className="flex-1" />
        {isAdmin() && (
          <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Always visible filter toggle */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={() => setShowFilterBar(!showFilterBar)} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors', showFilterBar ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}>
          <Filter className="w-4 h-4" />
          Filter
          {showFilterBar && <X className="w-3 h-3" />}
        </button>
        {isAdmin() && (
          <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Batch Action Bar */}
      {selectedTaskIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedTaskIds.size} selected</span>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => handleBatchAction('status', 'Done')} className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1">
              <CheckSquareIcon className="w-3 h-3" /> Mark Done
            </button>
            <button onClick={() => handleBatchAction('archive')} className="px-3 py-1.5 text-xs font-medium bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-1">
              <Archive className="w-3 h-3" /> Archive
            </button>
            <select onChange={(e) => { if (e.target.value) handleBatchAction('priority', e.target.value); e.target.value = ''; }} className="px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
              <option value="">Set Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <button onClick={() => { if (confirm(`Delete ${selectedTaskIds.size} tasks?`)) handleBatchAction('delete'); }} className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button onClick={() => setSelectedTaskIds(new Set())} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Task List Content */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-12 text-center">
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">Error loading tasks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error instanceof Error ? error.message : 'Failed to load tasks'}
            </p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {[1,2,3,4,5].map((i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />)}
            </div>
          </div>
        ) : filteredSortedTasks.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-200 mb-1">No tasks found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {debouncedSearch || statusFilter || priorityFilter || dueDateFrom || dueDateTo ? 'Try adjusting your filters' : isAdmin() ? 'Create your first task' : 'No tasks assigned to you yet'}
            </p>
            {isAdmin() && (
              <button onClick={openCreateModal} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
                Create Task
              </button>
            )}
          </div>
        ) : viewMode === 'board' ? (
          <KanbanBoard tasks={filteredSortedTasks} onEdit={isAdmin() ? openEditModal : undefined} onDelete={isAdmin() ? openDeleteDialog : undefined} onStatusChange={handleStatusChange} />
        ) : viewMode === 'timeline' ? (
          <TimelineView tasks={filteredSortedTasks} onEditTask={isAdmin() ? openEditModal : undefined} />
        ) : viewMode === 'calendar' ? (
          <CalendarView tasks={filteredSortedTasks} onEditTask={isAdmin() ? openEditModal : undefined} />
        ) : viewMode === 'workload' ? (
          <WorkloadView tasks={filteredSortedTasks} />
        ) : (
          <div className="bg-white dark:bg-gray-900">
            <TaskTable tasks={paginatedTasks} onEdit={isAdmin() && !showArchived ? openEditModal : undefined} onDelete={isAdmin() ? openDeleteDialog : undefined} onArchive={isAdmin() ? handleArchive : undefined} onStatusChange={handleStatusChange} showArchived={showArchived} />
            <div className="px-4 pb-4">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredSortedTasks.length} pageSize={PAGE_SIZE} />
            </div>
          </div>
        )}
      </div>

      <TaskModal key={editingTask?.id ?? 'create'} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={editingTask ? handleUpdate : handleCreate} task={editingTask} isLoading={createMutation.isPending || updateMutation.isPending} />
      <DeleteProjectDialog isOpen={isDeleteOpen} onClose={() => { setIsDeleteOpen(false); setDeletingTask(null); }} onConfirm={handleDelete} title="Task" itemName={deletingTask?.title ?? ''} isLoading={deleteMutation.isPending} />
    </div>
  );
}
