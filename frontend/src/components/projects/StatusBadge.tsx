import type { ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps { status: ProjectStatus; }

const config: Record<ProjectStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
  completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  'on-hold': { label: 'On Hold', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  archived: { label: 'Archived', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status];
  return <span className={cn('badge', c.className)}>{c.label}</span>;
}
