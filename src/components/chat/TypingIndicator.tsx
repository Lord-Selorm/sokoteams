import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/utils';

export default function TypingIndicator({ channelId, currentUserId }: { channelId: string; currentUserId?: string }) {
  const { data } = useQuery<{ userId: string; userName: string }[]>({
    queryKey: ['typing', channelId],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/typing/${channelId}?excludeUserId=${currentUserId || ''}`);
      return r.ok ? r.json() : [];
    },
    refetchInterval: 2000,
    staleTime: 0,
  });

  if (!data || data.length === 0) return null;

  const names = data.map(u => u.userName);
  const text = names.length === 1 ? `${names[0]} is typing` : names.length === 2 ? `${names[0]} and ${names[1]} are typing` : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
      <span>{text}</span>
    </div>
  );
}