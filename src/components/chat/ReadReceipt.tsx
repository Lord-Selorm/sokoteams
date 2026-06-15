import { useQuery } from '@tanstack/react-query';
import { Check, CheckCheck } from 'lucide-react';
import { API_URL } from '@/lib/utils';

export default function ReadReceipt({ messageId }: { messageId: string }) {
  const { data } = useQuery<{ userId: string; readAt: string }[]>({
    queryKey: ['read-status', messageId],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/messages/${messageId}/read-status`);
      return r.ok ? r.json() : [];
    },
    staleTime: 30000,
  });

  const readCount = data?.length || 0;

  if (readCount === 0) {
    return <Check className="w-3 h-3 text-gray-400 inline-block" />;
  }
  return (
    <span className="inline-flex items-center gap-0.5" title={`Read by ${readCount} ${readCount === 1 ? 'person' : 'people'}`}>
      <CheckCheck className="w-3 h-3 text-blue-500 inline-block" />
    </span>
  );
}