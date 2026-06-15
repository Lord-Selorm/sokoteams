import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '@/api/users';
import type { Project, ProjectStatus, User, ProjectMember } from '@/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/common/UserAvatar';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  project?: Project;
  isLoading?: boolean;
}

export default function ProjectModal({ isOpen, onClose, onSubmit, project, isLoading }: ProjectModalProps) {
  const { data: allUsersData } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers });
  const allUsers = useMemo(() => Array.isArray(allUsersData) ? allUsersData : [], [allUsersData]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [dueDate, setDueDate] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<ProjectMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const modalRef = useFocusTrap(isOpen, onClose);

  useEffect(() => {
    if (project) {
      setTitle(project.title); setDescription(project.description); setStatus(project.status);
      setDueDate(project.dueDate);
      setSelectedMembers(project.members || []);
    } else {
      setTitle(''); setDescription(''); setStatus('active'); setDueDate('');
      setSelectedMembers([]);
    }
  }, [project, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title, description, status, completionPercentage: 0, dueDate,
      members: selectedMembers,
      color: 'blue', workspaceId: 'default', ownerId: '1',
    });
  };

  const toggleProjectRole = (userId: string) => {
    setSelectedMembers(prev =>
      prev.map(m =>
        m.user.id === userId
          ? { ...m, projectRole: m.projectRole === 'lead' ? 'member' : 'lead' }
          : m
      )
    );
  };

  const toggleMember = (user: User) => {
    setSelectedMembers(prev =>
      prev.find(m => m.user.id === user.id)
        ? prev.filter(m => m.user.id !== user.id)
        : [...prev, { user, projectRole: 'member' }]
    );
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" className="bg-white dark:bg-gray-900 rounded-xl shadow-lg w-full max-w-lg mx-4 border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="input" placeholder="Project title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" placeholder="Project description" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="input">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
            </div>
          </div>

          {/* Member Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Members</label>
            <div className="relative">
              <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg cursor-text" onClick={() => setShowMemberDropdown(true)}>
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedMembers.map(m => (
                      <span key={m.user.id} className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        m.projectRole === 'lead'
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      )}>
                        {m.projectRole === 'lead' && <span className="text-[10px]">★</span>}
                        {m.user.name}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleMember(m.user); }} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                  onFocus={() => setShowMemberDropdown(true)}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 min-w-[80px]"
                  placeholder={selectedMembers.length === 0 ? 'Search and add members...' : ''}
                />
              </div>
              {showMemberDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">No users found</div>
                  ) : (
                    filteredUsers.map(u => {
                      const entry = selectedMembers.find(m => m.user.id === u.id);
                      const isMember = !!entry;
                      const isLead = entry?.projectRole === 'lead';
                      return (
                        <div key={u.id} className="flex items-center border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <button
                            type="button"
                            onClick={() => toggleMember(u)}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm flex-1 text-left"
                          >
                            <div className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                              isMember ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                            )}>
                              {isMember && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <UserAvatar user={u} size="xs" />
                            <div className="flex flex-col items-start">
                              <span className="text-gray-900 dark:text-gray-100">{u.name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{u.role}</span>
                            </div>
                          </button>
                          {isMember && (
                            <button
                              type="button"
                              onClick={() => toggleProjectRole(u.id)}
                              className={cn(
                                "px-3 py-1.5 mr-2 text-xs font-semibold rounded-lg transition-all border",
                                isLead
                                  ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400"
                              )}
                            >
                              {isLead ? '★ Lead' : 'Set Lead'}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                  <button type="button" onClick={() => setShowMemberDropdown(false)} className="w-full p-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-gray-200 dark:border-gray-700">Close</button>
                </div>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} ({selectedMembers.filter(m => m.projectRole === 'lead').length} lead{selectedMembers.filter(m => m.projectRole === 'lead').length !== 1 ? 's' : ''})</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
              {isLoading ? (project ? 'Updating...' : 'Creating...') : (project ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
