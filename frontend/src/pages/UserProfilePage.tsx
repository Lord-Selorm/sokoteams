import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserAvatar from '@/components/common/UserAvatar';
import { API_URL } from '@/lib/utils';

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { data: user } = useQuery<any>({ queryKey: ['user-profile', userId], queryFn: async () => { const r = await fetch(`${API_URL}/users/${userId}`); return r.ok ? r.json() : null; } });
  const { data: tasks } = useQuery<any[]>({ queryKey: ['user-tasks', userId], queryFn: async () => { const r = await fetch(`${API_URL}/tasks`); if (!r.ok) return []; const all = await r.json(); return all.filter((t: any) => t.assignedUserId === userId); } });

  if (!user) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex items-center h-14 gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Profile</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
          <UserAvatar user={user} size="xl" showOnline />
          <h2 className="mt-3 text-xl font-semibold text-gray-900 dark:text-gray-100">{user.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
          {user.status && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.statusEmoji} {user.status}</p>}
          <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 capitalize">{user.role}</span>
          {user.department && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{user.department}</p>}
        </div>
        {tasks && tasks.length > 0 && (
          <div className="mt-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Assigned Tasks ({tasks.length})</h3>
            <div className="space-y-2">
              {tasks.slice(0, 10).map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t.title}</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${t.status === 'Done' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
