import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers } from '@/api/users';
import { Users, Shield, Crown, User, ChevronDown, Check, X, Settings } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import UserAvatar from '@/components/common/UserAvatar';
import Pagination from '@/components/common/Pagination';
import { useAuthStore } from '@/store/authStore';
import { useProjects } from '@/hooks/useProjects';
import { PROJECTS_KEY } from '@/hooks/useProjects';
import type { User as UserType, Project } from '@/types';
import { API_URL } from '@/lib/utils';

type Tab = 'directory' | 'leads';

const ROLE_OPTIONS: { value: UserType['role']; label: string; color: string; bg: string }[] = [
  { value: 'admin', label: 'Admin', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
  { value: 'user', label: 'User', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  { value: 'guest', label: 'Guest', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' },
];

export default function UsersPage() {
  const { data: usersData, isLoading } = useQuery<UserType[]>({ queryKey: ['users'], queryFn: getUsers });
  const users = useMemo(() => Array.isArray(usersData) ? usersData : [], [usersData]);
  const { data: projectsData } = useProjects();
  const projects = useMemo(() => Array.isArray(projectsData) ? projectsData : [], [projectsData]);
  const { user: currentUser, isAdmin, token } = useAuthStore();
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('directory');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginatedUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleRoleChange(userId: string, newRole: UserType['role']) {
    if (!isAdmin()) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (err) {
      console.error('Failed to change role:', err);
    } finally {
      setSaving(false);
      setEditingRole(null);
    }
  }

  function canManageLeads(project: Project) {
    return isAdmin() || project.members?.some(m => m.user.id === currentUser?.id && m.projectRole === 'lead');
  }

  async function toggleProjectRole(projectId: string, userId: string, members: Project['members']) {
    const newMembers = members.map(m =>
      m.user.id === userId
        ? { ...m, projectRole: (m.projectRole === 'lead' ? 'member' : 'lead') as 'member' | 'lead' }
        : m
    );
    setSaving(true);
    try {
      await fetch(`${API_URL}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ members: newMembers }),
      });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    } catch {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    } finally {
      setSaving(false);
    }
  }

  const getRoleConfig = (role: string) => ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[1];

  return (
    <div>
      <PageHeader title="Users & Roles" subtitle="Manage workspace users, roles, and project leads" />

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab('directory')}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${tab === 'directory' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        >
          Directory
        </button>
        {isAdmin() && (
          <button
            onClick={() => setTab('leads')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${tab === 'leads' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            Project Leads
          </button>
        )}
      </div>

      {/* Directory Tab */}
      {tab === 'directory' && (
        isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">User</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedUsers.map((u) => {
                    const roleCfg = getRoleConfig(u.role);
                    const isEditing = editingRole === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={u} size="md" showOnline />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                              {u.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                  <Crown className="w-2.5 h-2.5" /> Admin
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{u.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{u.department || '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {isAdmin() ? (
                            <div className="relative">
                              {isEditing ? (
                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 z-10">
                                  {ROLE_OPTIONS.map(r => (
                                    <button
                                      key={r.value}
                                      onClick={() => handleRoleChange(u.id, r.value)}
                                      disabled={saving}
                                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        r.value === u.role
                                          ? `${r.bg} ${r.color} border`
                                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                      } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {r.value === 'admin' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                      {r.label}
                                      {r.value === u.role && <Check className="w-3 h-3" />}
                                    </button>
                                  ))}
                                  <button onClick={() => setEditingRole(null)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingRole(u.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all hover:shadow-sm ${roleCfg.bg} ${roleCfg.color}`}
                                >
                                  {u.role === 'admin' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                  {u.role}
                                  <ChevronDown className="w-3 h-3 opacity-50" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${roleCfg.bg} ${roleCfg.color}`}>
                              {u.role === 'admin' ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              {u.role}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            )}
            <div className="px-4 pb-4">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={users.length} pageSize={PAGE_SIZE} />
            </div>
          </div>
        )
      )}

      {/* Project Leads Tab */}
      {tab === 'leads' && isAdmin() && (
        <div className="space-y-4">
          {projects.filter(canManageLeads).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No projects to manage</p>
            </div>
          ) : (
            projects.filter(canManageLeads).map(project => (
              <div key={project.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{project.title}</h2>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {project.members.map(m => {
                    const isLead = m.projectRole === 'lead';
                    return (
                      <div key={m.user.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={m.user} size="sm" />
                          <div>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{m.user.name}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{m.user.role}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleProjectRole(project.id, m.user.id, project.members)}
                          disabled={saving}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            isLead
                              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {isLead ? '★ Lead' : 'Member'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
