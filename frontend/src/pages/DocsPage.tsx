import { FileText } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-purple-500 dark:text-purple-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-200">Team Docs</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Documentation coming soon...</p>
      </div>
    </div>
  );
}
