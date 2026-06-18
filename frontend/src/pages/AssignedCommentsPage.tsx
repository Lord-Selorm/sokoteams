import { MessageCircle, Clock, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn, resolveAvatarUrl } from '@/lib/utils';

interface AssignedComment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  taskTitle: string;
  taskId: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved';
  time: string;
}

export default function AssignedCommentsPage() {
  const [comments, setComments] = useState<AssignedComment[]>([
    {
      id: '1',
      author: {
        name: 'Jane Smith',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      },
      content: 'Please review the API endpoint changes. We need to ensure backward compatibility.',
      taskTitle: 'Implement authentication',
      taskId: '2',
      priority: 'high',
      status: 'pending',
      time: '2 hours ago',
    },
    {
      id: '2',
      author: {
        name: 'John Doe',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      },
      content: 'Can you clarify the requirements for the user profile section?',
      taskTitle: 'Design database schema',
      taskId: '3',
      priority: 'medium',
      status: 'pending',
      time: '5 hours ago',
    },
    {
      id: '3',
      author: {
        name: 'Bob Wilson',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      },
      content: 'The color scheme needs adjustment for better accessibility.',
      taskTitle: 'Build task management UI',
      taskId: '4',
      priority: 'low',
      status: 'resolved',
      time: '1 day ago',
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const filteredComments = comments.filter(c => 
    filter === 'all' || c.status === filter
  );

  const resolveComment = (id: string) => {
    setComments(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'resolved' as const } : c
    ));
  };

  const getPriorityColor = (priority: AssignedComment['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
      case 'medium': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
      case 'low': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
    }
  };

  const getStatusBadge = (status: AssignedComment['status']) => {
    switch (status) {
      case 'pending': return (
        <span className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
          Pending
        </span>
      );
      case 'resolved': return (
        <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          Resolved
        </span>
      );
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-purple-500 dark:text-purple-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-200">Assigned Comments</h1>
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
          onClick={() => setFilter('pending')}
          className={cn(
            'px-3 py-1.5 text-sm rounded transition-colors',
            filter === 'pending' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={cn(
            'px-3 py-1.5 text-sm rounded transition-colors',
            filter === 'resolved' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          Resolved
        </button>
      </div>

      <div className="space-y-3">
        {filteredComments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No assigned comments</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'bg-white dark:bg-gray-800 border rounded-lg p-4 transition-colors',
                comment.status === 'pending' ? 'border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 opacity-75'
              )}
            >
              <div className="flex items-start gap-3">
                <img
                    src={resolveAvatarUrl(comment.author.avatar)}
                  alt={comment.author.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-200">{comment.author.name}</span>
                      {getStatusBadge(comment.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-1 text-xs rounded', getPriorityColor(comment.priority))}>
                        {comment.priority}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{comment.time}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{comment.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-500">in</span>
                      <Link
                        to={`/tasks`}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                      >
                        {comment.taskTitle}
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {comment.status === 'pending' && (
                      <button
                        onClick={() => resolveComment(comment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Mark as resolved
                      </button>
                    )}
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
