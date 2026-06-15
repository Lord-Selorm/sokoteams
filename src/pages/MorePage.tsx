import { MoreHorizontal, Settings, HelpCircle, Keyboard, Zap, Shield, FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MoreOption {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action?: 'link' | 'external' | 'modal';
  to?: string;
  href?: string;
  badge?: string;
}

export default function MorePage() {
  const options: MoreOption[] = [
    {
      id: 'settings',
      title: 'Settings',
      description: 'Manage your account and preferences',
      icon: Settings,
      action: 'link',
      to: '/settings',
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help with using SokoTeams',
      icon: HelpCircle,
      action: 'external',
      href: 'https://help.sokoteams.com',
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      icon: Keyboard,
      action: 'modal',
      badge: 'Coming Soon',
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Connect with other tools',
      icon: Zap,
      action: 'modal',
      badge: 'Coming Soon',
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Manage your privacy settings',
      icon: Shield,
      action: 'link',
      to: '/settings',
    },
    {
      id: 'documentation',
      title: 'Documentation',
      description: 'Read the SokoTeams documentation',
      icon: FileText,
      action: 'link',
      to: '/docs',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <MoreHorizontal className="w-6 h-6 text-purple-500 dark:text-purple-400" />
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-200">More</h1>
      </div>

      <div className="space-y-3">
        {options.map((option) => {
          const Icon = option.icon;
          const content = (
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-200">{option.title}</h3>
                  {option.badge && (
                    <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {option.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          );

          if (option.action === 'link' && option.to) {
            return (
              <Link
                key={option.id}
                to={option.to}
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {content}
              </Link>
            );
          }

          if (option.action === 'external' && option.href) {
            return (
              <a
                key={option.id}
                href={option.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                {content}
              </a>
            );
          }

          return (
            <button
              key={option.id}
              disabled={!!option.badge}
              className={cn(
                'w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-left',
                option.badge && 'opacity-60 cursor-not-allowed'
              )}
            >
              {content}
            </button>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <ExternalLink className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-medium text-gray-900 dark:text-gray-200">SokoTeams</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Version 1.0.0
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <span>© {new Date().getFullYear()} SokoTeams</span>
            <span>•</span>
            <a href="#" className="hover:text-gray-900 dark:hover:text-gray-200">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-900 dark:hover:text-gray-200">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
