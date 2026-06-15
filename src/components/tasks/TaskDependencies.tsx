import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Unlink, AlertTriangle, CheckCircle } from 'lucide-react';
import { API_URL } from '@/lib/utils';

function getAuthHeaders() {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) { const p = JSON.parse(raw); const t = p?.state?.token; if (t) return { Authorization: `Bearer ${t}` }; }
  } catch {} return {};
}

export default function TaskDependencies({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [depTaskId, setDepTaskId] = useState('');

  const { data } = useQuery<{ dependsOn: { dependsOnId: string; title: string; status: string }[]; blockedBy: { blockedTaskId: string; title: string; status: string }[] }>({
    queryKey: ['task-deps', taskId],
    queryFn: async () => { const r = await fetch(`${API_URL}/tasks/${taskId}/dependencies`); return r.ok ? r.json() : { dependsOn: [], blockedBy: [] }; },
  });

  const addDep = async () => {
    if (!depTaskId) return;
    await fetch(`${API_URL}/tasks/${taskId}/dependencies`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ dependsOnId: depTaskId }) });
    setDepTaskId('');
    queryClient.invalidateQueries({ queryKey: ['task-deps', taskId] });
  };

  const removeDep = async (depId: string) => {
    await fetch(`${API_URL}/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE', headers: getAuthHeaders() });
    queryClient.invalidateQueries({ queryKey: ['task-deps', taskId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input value={depTaskId} onChange={e => setDepTaskId(e.target.value)} placeholder="Task ID to depend on..."
          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <button onClick={addDep} className="px-2.5 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Link className="w-3.5 h-3.5" />
        </button>
      </div>
      {data?.dependsOn?.length ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase">Depends On</p>
          {data.dependsOn.map(d => (
            <div key={d.dependsOnId} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                {d.status === 'Done' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                <span className="text-xs text-gray-700 dark:text-gray-300">{d.title}</span>
              </div>
              <button onClick={() => removeDep(d.dependsOnId)} className="p-1 text-gray-400 hover:text-red-500"><Unlink className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      ) : null}
      {data?.blockedBy?.length ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase">Blocks</p>
          {data.blockedBy.map(d => (
            <div key={d.blockedTaskId} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-gray-700 dark:text-gray-300">{d.title}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
