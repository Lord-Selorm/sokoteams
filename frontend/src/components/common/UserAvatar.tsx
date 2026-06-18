import { useState, useEffect } from 'react';
import { getInitials, resolveAvatarUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { usePresence } from '@/hooks/usePresence';

interface UserAvatarProps {
  user: { avatar?: string; name?: string; id?: string } | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-24 h-24 text-2xl',
};

const dotSizes = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-4 h-4 border-2',
};

const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];

function getColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function UserAvatar({ user, size = 'md', showOnline = false, className }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const presence = usePresence();
  const isOnline = user?.id ? presence[user.id] === 'online' : false;
  const sizeClass = sizeClasses[size];
  const name = user?.name || '?';
  const colorClass = getColorFromId(user?.id || name);

  useEffect(() => { setImgFailed(false); }, [user?.avatar]);

  const showImage = user?.avatar && !imgFailed;

  return (
    <div className="relative inline-flex flex-shrink-0">
      {showImage ? (
        <img
          src={resolveAvatarUrl(user.avatar)}
          alt={name}
          className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className={cn('rounded-full flex items-center justify-center text-white font-medium flex-shrink-0', sizeClass, colorClass, className)}>
          {getInitials(name)}
        </div>
      )}
      {showOnline && user?.id && (
        <span className={cn(
          'absolute bottom-0 right-0 rounded-full border-white dark:border-gray-900',
          dotSizes[size],
          isOnline ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
        )} />
      )}
    </div>
  );
}
