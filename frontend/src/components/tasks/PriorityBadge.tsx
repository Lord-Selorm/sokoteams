import type { Priority } from '@/types';
import { cn } from '@/lib/utils';

interface Props { priority: Priority; }

const config: Record<Priority, { label: string; className: string }> = {
  Low: { label: 'Low', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
  Medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  High: { label: 'High', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  Critical: { label: 'Critical', className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700' },
};

export default function PriorityBadge({ priority }: Props) {
  const c = config[priority];
  return <span className={cn('badge', c.className)}>{c.label}</span>;
}
