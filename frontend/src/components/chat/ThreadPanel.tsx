import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, MessageSquare, Reply } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import type { ChatMessage, User } from '@/types';
import { getUsers } from '@/api/users';
import UserAvatar from '@/components/common/UserAvatar';

interface ThreadPanelProps {
  parentMessage: ChatMessage;
  onClose: () => void;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ThreadPanel({ parentMessage, onClose }: ThreadPanelProps) {
  const [input, setInput] = useState('');
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const { fetchThreadMessages, addThreadReply } = useSocketStore();
  const { user } = useAuthStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: usersData } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers, staleTime: 60000, refetchOnWindowFocus: true });
  const avatarMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (user?.id && user.avatar) {
      map[user.id] = user.avatar;
      map[user.name] = user.avatar;
    }
    if (Array.isArray(usersData)) {
      for (const u of usersData) {
        if (u.avatar) map[u.id] = u.avatar;
        map[u.name] = u.avatar;
      }
    }
    return map;
  }, [usersData, user]);
  const getAvatar = (msg: ChatMessage) => avatarMap[msg.userId] || avatarMap[msg.userName] || msg.userAvatar || '';

  useEffect(() => {
    if (parentMessage) fetchThreadMessages(parentMessage.id).then(setReplies);
  }, [parentMessage?.id, fetchThreadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [replies]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    await addThreadReply(parentMessage.id, input.trim(), user.id, user.name, user.avatar);
    setInput('');
    const updated = await fetchThreadMessages(parentMessage.id);
    setReplies(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 md:relative md:z-auto md:w-80 md:xl:w-96 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Thread</span>
            <span className="text-[11px] text-gray-400 ml-2">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
          </div>
        </div>
        <button onClick={onClose} className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Parent Message */}
        <div className="flex gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <UserAvatar user={{ id: parentMessage.userId, name: parentMessage.userName, avatar: getAvatar(parentMessage) }} size="sm" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{parentMessage.userName}</span>
              <span className="text-[11px] text-gray-400">{formatTime(parentMessage.createdAt)}</span>
            </div>
            <p className="text-[13px] text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">{parentMessage.content}</p>
          </div>
        </div>

        {/* Replies */}
        {replies.map((reply) => (
          <div key={reply.id} className="flex gap-3 group">
            <UserAvatar user={{ id: reply.userId, name: reply.userName, avatar: getAvatar(reply) }} size="sm" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100">{reply.userName}</span>
                <span className="text-[10px] text-gray-400">{formatTime(reply.createdAt)}</span>
              </div>
              <p className="text-[13px] text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed">{reply.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Reply in thread..."
            className="flex-1 bg-transparent text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none py-1" />
          <button onClick={handleSend} disabled={!input.trim()}
            className={`p-2 rounded-lg transition-all ${input.trim() ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-400'}`}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
