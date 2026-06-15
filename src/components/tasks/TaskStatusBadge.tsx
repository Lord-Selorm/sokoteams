import type { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface Props { status: TaskStatus; }

const config: Record<TaskStatus, { label: string; className: string }> = {
  Todo: { label: 'Todo', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
  InProgress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  Done: { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  Blocked: { label: 'Blocked', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  Cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700' },
};

export default function TaskStatusBadge({ status }: Props) {
  const c = config[status];
  return <span className={cn('badge', c.className)}>{c.label}</span>;
}
