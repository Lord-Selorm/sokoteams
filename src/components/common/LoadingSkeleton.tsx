export function CardSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
        <div className="flex justify-between"><div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" /><div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/5" /></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-800"><div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" /><div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/6" /></div>
      </div>
    </div>
  );
}
