import { useState, useEffect, useMemo } from 'react';
import { CheckSquare, X, User, Calendar } from 'lucide-react';
import SearchableSelect from '@/components/common/SearchableSelect';
import { API_URL } from '@/lib/utils';

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) { const parsed = JSON.parse(raw); const token = parsed?.state?.token; if (token) return { Authorization: `Bearer ${token}` }; }
  } catch {}
  return {};
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

interface CreateTaskFromMessageProps {
  messageContent: string;
  channelId: string;
  workspaceId: string;
  onCancel: () => void;
  onTaskCreated: (task: any) => void;
}

export default function CreateTaskFromMessage({
  messageContent,
  channelId,
  workspaceId,
  onCancel,
  onTaskCreated,
}: CreateTaskFromMessageProps) {
  const [title, setTitle] = useState(messageContent.substring(0, 100));
  const [description, setDescription] = useState(messageContent);
  const [assignedUserId, setAssignedUserId] = useState('');
  const [assignedUserName, setAssignedUserName] = useState('');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/users`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const selectedUser = useMemo(() => users.find(u => u.id === assignedUserId), [users, assignedUserId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title,
          description,
          projectId: workspaceId === 'default-workspace' ? '1' : workspaceId,
          priority: 'Medium',
          status: 'Todo',
          dueDate: dueDate || new Date().toISOString().split('T')[0],
          assignedUser: selectedUser || { id: '1', name: 'Unassigned', email: '', avatar: '', role: 'user' as const },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
      if (response.ok) {
        const task = await response.json();
        onTaskCreated(task);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg w-full max-w-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Create Task from Message</h3>
        </div>
        <button onClick={onCancel} className="p-1 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter task title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Enter task description"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To</label>
            <SearchableSelect
              options={users.map((u) => ({ value: u.id, label: u.name }))}
              value={assignedUserName}
              onChange={(val) => {
                setAssignedUserName(val);
                const u = users.find((x) => x.name === val);
                setAssignedUserId(u?.id || '');
              }}
              placeholder="Type a name..."
              emptyMessage="No matching users"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Task'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}