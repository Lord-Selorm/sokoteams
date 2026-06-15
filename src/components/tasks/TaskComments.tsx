import { useState } from 'react';
import { MessageSquare, Send, MoreHorizontal, Smile } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn, resolveAvatarUrl } from '@/lib/utils';
import type { Comment, Reaction } from '@/types';

interface TaskCommentsProps {
  comments: Comment[];
  onAddComment: (content: string) => void;
  onAddReaction: (commentId: string, emoji: string) => void;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

export default function TaskComments({
  comments,
  onAddComment,
  onAddReaction,
}: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const { user } = useAuthStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleAddReaction = (commentId: string, emoji: string) => {
    onAddReaction(commentId, emoji);
    setShowEmojiPicker(null);
  };

  const getReactionCount = (comment: Comment, emoji: string) => {
    return comment.reactions?.filter(r => r.emoji === emoji).length || 0;
  };

  const hasUserReacted = (comment: Comment, emoji: string) => {
    return comment.reactions?.some(r => r.emoji === emoji && r.userId === user?.id);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200">Comments</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">{comments.length}</span>
      </div>

      {/* Comments list */}
      <div className="space-y-4 mb-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <img
                src={resolveAvatarUrl(comment.author.avatar)}
                alt={comment.author.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                    {comment.author.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Reactions */}
                {comment.reactions && comment.reactions.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {EMOJIS.map((emoji) => {
                      const count = getReactionCount(comment, emoji);
                      if (count === 0) return null;
                      const reacted = hasUserReacted(comment, emoji);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(comment.id, emoji)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors',
                            reacted
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600'
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                          )}
                        >
                          <span>{emoji}</span>
                          <span className="text-gray-600 dark:text-gray-400">{count}</span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setShowEmojiPicker(comment.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Emoji picker */}
                {showEmojiPicker === comment.id && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg">
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(comment.id, emoji)}
                          className="w-8 h-8 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <img
          src={resolveAvatarUrl(user?.avatar)}
          alt={user?.name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 relative">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full px-4 py-2 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
