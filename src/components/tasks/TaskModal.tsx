import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Plus, MessageSquare, Paperclip, CheckSquare, Link as LinkIcon, Clock, RefreshCw } from 'lucide-react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers } from '@/api/users';
import { uploadFiles } from '@/api/uploads';
import { useAuthStore } from '@/store/authStore';
import type { Task, Priority, TaskStatus, User as UserType, Subtask, Attachment, Comment } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useProjects } from '@/hooks/useProjects';
import SearchableSelect from '@/components/common/SearchableSelect';
import SubtasksList from './SubtasksList';
import TaskAttachments from './TaskAttachments';
import TaskComments from './TaskComments';
import TaskDependencies from './TaskDependencies';
import { cn, API_URL } from '@/lib/utils';
function getAuthHeaders() { try { const raw = localStorage.getItem('auth-store'); if (raw) { const p = JSON.parse(raw); const t = p?.state?.token; if (t) return { Authorization: `Bearer ${t}` }; } } catch {} return {}; }

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  task?: Task;
  projectId?: string;
  isLoading?: boolean;
}

export default function TaskModal({ isOpen, onClose, onSubmit, task, projectId, isLoading }: TaskModalProps) {
  const { data: projectsData } = useProjects();
  const { data: usersData } = useQuery<UserType[]>({ queryKey: ['users'], queryFn: getUsers });
  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const users = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);
  const { user: currentUser } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Todo');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [projectName, setProjectName] = useState('');
  const [assignedName, setAssignedName] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'attachments' | 'comments' | 'dependencies'>('details');
  const [editData, setEditData] = useState<any>({});
  const queryClient = useQueryClient();
  const modalRef = useFocusTrap(isOpen, onClose);

  const selectedProject = projects?.find((p) => p.title === projectName);

  useEffect(() => {
    if (task && isOpen) {
      const p = projects?.find((pr) => pr.id === task.projectId);
      setTitle(task.title); setDescription(task.description); setPriority(task.priority);
      setStatus(task.status); setDueDate(task.dueDate); setProjectName(p?.title ?? '');
      setAssignedName(task.assignedUser?.name || '');
      setAssignedUserId(task.assignedUser?.id || '');
      setStartDate(task.startDate || '');
      setTags(task.tags || []);
      setSubtasks(task.subtasks || []);
      setAttachments(task.attachments || []);
      setComments(task.comments || []);
    } else if (!isOpen) {
      setTitle(''); setDescription(''); setPriority('Medium'); setStatus('Todo'); setDueDate('');
      setStartDate(''); setProjectName(''); setAssignedName(''); setAssignedUserId('');
      setTags([]); setSubtasks([]); setAttachments([]); setComments([]);
      setEditData({});
    }
  }, [task, isOpen, projects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!projectName.trim()) return;
    
    const matchedProject = projects?.find((p) => p.title === projectName);
    if (!matchedProject) return;
    
    const allUsers = [...users];
    let matchedUser = assignedUserId ? allUsers.find((u) => u.id === assignedUserId) : undefined;
    if (!matchedUser) matchedUser = allUsers.find((u) => u.name === assignedName);
    if (!matchedUser && task?.assignedUser?.id) matchedUser = allUsers.find((u) => u.id === task.assignedUser.id);
    
    if (!matchedUser) return;
    
    const assignedUser = { id: matchedUser.id, name: matchedUser.name, email: matchedUser.email, avatar: matchedUser.avatar, role: matchedUser.role };
    onSubmit({ 
      projectId: matchedProject.id, 
      title: title.trim(), 
      description, 
      priority, 
      status, 
      dueDate, 
      startDate,
      assignedUser,
      tags,
      subtasks,
      attachments,
      comments
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddSubtask = (title: string) => {
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      taskId: task?.id || '',
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSubtasks([...subtasks, newSubtask]);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    ));
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.filter(s => s.id !== subtaskId));
  };

  const handleAddAttachment = async (file: File) => {
    try {
      const fileList = new DataTransfer();
      fileList.items.add(file);
      const uploaded = await uploadFiles(fileList.files);
      if (uploaded.length > 0) {
        const f = uploaded[0];
        const newAttachment: Attachment = {
          id: f.id,
          taskId: task?.id || '',
          name: f.name,
          url: f.url,
          type: f.type.startsWith('image/') ? 'image' : 'document',
          size: f.size,
          uploadedBy: currentUser || { id: '', name: 'User', email: '', avatar: '', role: 'user' },
          createdAt: f.uploadedAt,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
  };

  const handleAddComment = (content: string) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      taskId: task?.id || '',
      content,
      author: users?.[0] || { id: '', name: 'User', email: '', avatar: '', role: 'user' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setComments([...comments, newComment]);
  };

  const handleAddReaction = (commentId: string, emoji: string) => {
    setComments(comments.map(c => {
      if (c.id === commentId) {
        const existingReaction = c.reactions?.find(r => r.emoji === emoji && r.userId === users?.[0]?.id);
        if (existingReaction) {
          return {
            ...c,
            reactions: c.reactions?.filter(r => r.id !== existingReaction.id)
          };
        }
        return {
          ...c,
          reactions: [
            ...(c.reactions || []),
            {
              id: crypto.randomUUID(),
              emoji,
              userId: users?.[0]?.id || '',
              createdAt: new Date().toISOString(),
            }
          ]
        };
      }
      return c;
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="task-modal-title" className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 id="task-modal-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>

        <TabGroup selectedIndex={['details', 'subtasks', 'attachments', 'comments', 'dependencies'].indexOf(activeTab)} onChange={(idx) => setActiveTab(['details', 'subtasks', 'attachments', 'comments', 'dependencies'][idx] as typeof activeTab)}>
          <TabList className="flex items-center gap-1 px-5 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            <Tab className={({ selected }) => cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors outline-none', selected ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <User className="w-4 h-4" />
              Details
            </Tab>
            <Tab className={({ selected }) => cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors outline-none', selected ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <CheckSquare className="w-4 h-4" />
              Subtasks
            </Tab>
            <Tab className={({ selected }) => cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors outline-none', selected ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <Paperclip className="w-4 h-4" />
              Attachments
            </Tab>
            <Tab className={({ selected }) => cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors outline-none', selected ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <MessageSquare className="w-4 h-4" />
              Comments
            </Tab>
            <Tab className={({ selected }) => cn('flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors outline-none', selected ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800')}>
              <LinkIcon className="w-4 h-4" />
              Dependencies
            </Tab>
          </TabList>

        <div className="flex-1 overflow-y-auto">
          <form id="task-form" onSubmit={handleSubmit} className="p-5 space-y-4">
            <TabPanels>
              <TabPanel>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input" placeholder="Task title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="Task description" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Project</label>
                    <SearchableSelect
                      options={(projects ?? []).map((p) => ({ value: p.id, label: p.title }))}
                      value={projectName}
                      onChange={setProjectName}
                      placeholder="Type a project name..."
                      emptyMessage="No matching projects"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned to</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                      <div className="pl-9">
                        <SearchableSelect
                          options={users.map((u) => ({ value: u.id, label: u.name }))}
                          value={assignedName}
                          onChange={setAssignedName}
                          onSelect={(opt) => setAssignedUserId(opt.value)}
                          placeholder="Type a member name..."
                          emptyMessage="No matching members"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="input">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="input">
                      <option value="Todo">Todo</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Done">Done</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Time Logged</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{task?.timeLogged || 0}h</span>
                      <button type="button" onClick={async () => {
                        const hours = prompt('Log hours:');
                        if (hours && !isNaN(parseFloat(hours))) {
                          await fetch(`${API_URL}/tasks/${task?.id}/time`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ hours: parseFloat(hours) }) });
                          queryClient.invalidateQueries({ queryKey: ['tasks'] });
                        }
                      }} className="text-xs text-blue-500 hover:text-blue-600">+ Log time</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-gray-400 uppercase">Recurring</label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditData({ ...editData, isRecurring: editData.isRecurring ? 0 : 1 })} className={`relative w-10 h-5 rounded-full transition-colors ${editData.isRecurring ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editData.isRecurring ? 'translate-x-5' : ''}`} />
                      </button>
                      {editData.isRecurring ? (
                        <select value={editData.recurringInterval || 'weekly'} onChange={e => setEditData({ ...editData, recurringInterval: e.target.value })} className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="input flex-1"
                      placeholder="Add a tag..."
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-purple-900 dark:hover:text-purple-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </TabPanel>

              <TabPanel>
                <SubtasksList
                  subtasks={subtasks}
                  taskId={task?.id || ''}
                  onAddSubtask={handleAddSubtask}
                  onToggleSubtask={handleToggleSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                />
              </TabPanel>

              <TabPanel>
                <TaskAttachments
                  attachments={attachments}
                  onAddAttachment={handleAddAttachment}
                  onDeleteAttachment={handleDeleteAttachment}
                />
              </TabPanel>

              <TabPanel>
                <TaskComments
                  comments={comments}
                  onAddComment={handleAddComment}
                  onAddReaction={handleAddReaction}
                />
              </TabPanel>

              <TabPanel>
                {task?.id ? (
                  <TaskDependencies taskId={task.id} />
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Save the task first to add dependencies</p>
                )}
              </TabPanel>
            </TabPanels>
          </form>
        </div>
        </TabGroup>

        <div className="flex gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>Cancel</button>
          <button type="submit" form="task-form" className="btn-primary flex-1" disabled={isLoading}>
            {isLoading ? (task ? 'Updating...' : 'Creating...') : (task ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}
