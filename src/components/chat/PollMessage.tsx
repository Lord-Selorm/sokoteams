import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/utils';

export default function PollMessage({ poll }: { poll: any }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const votes: Record<string, string[]> = JSON.parse(poll.votes || '{}');
  const options: string[] = JSON.parse(poll.options || '[]');
  const totalVotes = Object.values(votes).reduce<number>((sum, arr) => sum + arr.length, 0);
  const myVote = Object.entries(votes).find(([_, arr]) => arr.includes(user?.id || ''));

  const handleVote = async (idx: number) => {
    if (poll.isClosed) return;
    await fetch(`${API_URL}/polls/${poll.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionIndex: idx }) });
    queryClient.invalidateQueries({ queryKey: ['polls', poll.channelId] });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700 max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{poll.question}</span>
      </div>
      <div className="space-y-1.5">
        {options.map((opt: string, idx: number) => {
          const count = (votes[idx] as string[] | undefined)?.length || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isSelected = myVote?.[0] === String(idx);
          return (
            <button key={idx} onClick={() => handleVote(idx)} disabled={poll.isClosed}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium relative overflow-hidden transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
              <div className="absolute inset-0 bg-blue-500/10" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between">
                <span>{opt}</span>
                <span className="text-gray-400">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <span className="text-[11px] text-gray-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        {poll.isClosed && <span className="text-[11px] text-red-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Closed</span>}
      </div>
    </div>
  );
}
