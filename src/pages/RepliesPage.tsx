import { MessageSquare, Reply, Clock, User, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn, resolveAvatarUrl } from '@/lib/utils';

interface Reply {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  taskTitle: string;
  taskId: string;
  time: string;
  unread: boolean;
}

export default function RepliesPage() {
  const [replies, setReplies] = useState<Reply[]>([
    {
      id: '1',
      author: {
        name: 'Jane Smith',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      },
      content: 'I think we should prioritize the authentication module first. It\'s critical for the security of the application.',
      taskTitle: 'Implement authentication',
      taskId: '2',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: '2',
      author: {
        name: 'John Doe',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      },
      content: 'The database schema looks good. I\'ll start working on the migration scripts.',
      taskTitle: 'Design database schema',
      taskId: '3',
      time: '5 hours ago',
      unread: true,
    },
    {
      id: '3',
      author: {
        name: 'Bob Wilson',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      },
      content: 'Can we add a dark mode toggle? It would improve the UX for users who prefer dark themes.',
      taskTitle: 'Build task management UI',
      taskId: '4',
      time: '1 day ago',
      unread: false,
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredReplies = replies.filter(r => 
    filter === 'all' || (filter === 'unread' && r.unread)
  );

  const markAsRead = (id: string) => {
    setReplies(prev => prev.map(r => 
      r.id === id ? { ...r, unread: false } : r
    ));
  };

  const markAllAsRead = () => {
    setReplies(prev => prev.map(r => ({ ...r, unread: false })));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-purple-500 dark:text-purple-400" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-200">Replies</h1>
        </div>
        <button
          onClick={markAllAsRead}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          Mark all as read
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 text-sm rounded transition-colors',
            filter === 'all' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-3 py-1.5 text-sm rounded transition-colors',
            filter === 'unread' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          Unread
        </button>
      </div>

      <div className="space-y-3">
        {filteredReplies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No replies yet</p>
          </div>
        ) : (
          filteredReplies.map((reply) => (
            <div
              key={reply.id}
              onClick={() => markAsRead(reply.id)}
              className={cn(
                'bg-white dark:bg-gray-800 border rounded-lg p-4 cursor-pointer transition-colors',
                reply.unread 
                  ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10' 
                  : 'border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-start gap-3">
                <img
                    src={resolveAvatarUrl(reply.author.avatar)}
                  alt={reply.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-200">{reply.author.name}</span>
                      {reply.unread && (
                        <div className="w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{reply.time}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{reply.content}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-500">in</span>
                    <Link
                      to={`/tasks`}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      {reply.taskTitle}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
