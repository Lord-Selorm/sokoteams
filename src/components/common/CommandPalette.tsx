import { useState, useEffect, useRef } from 'react';
import { Search, LayoutDashboard, FolderKanban, CheckSquare, BarChart3, Settings, Users, Database, MessageCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Command { id: string; label: string; icon: typeof Search; section: string; action: () => void; }

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); } }, [isOpen]);

  const commands: Command[] = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, section: 'Navigation', action: () => { navigate('/dashboard'); onClose(); } },
    { id: 'projects', label: 'Go to Projects', icon: FolderKanban, section: 'Navigation', action: () => { navigate('/projects'); onClose(); } },
    { id: 'tasks', label: 'Go to Tasks', icon: CheckSquare, section: 'Navigation', action: () => { navigate('/tasks'); onClose(); } },
    { id: 'analytics', label: 'Go to Analytics', icon: BarChart3, section: 'Navigation', action: () => { navigate('/analytics'); onClose(); } },
    { id: 'users', label: 'Go to Users', icon: Users, section: 'Navigation', action: () => { navigate('/users'); onClose(); } },
    { id: 'settings', label: 'Go to Settings', icon: Settings, section: 'Navigation', action: () => { navigate('/settings'); onClose(); } },
    { id: 'db', label: 'Go to DB Management', icon: Database, section: 'Navigation', action: () => { navigate('/admin/db'); onClose(); } },
    { id: 'chat', label: 'Go to Channels', icon: MessageCircle, section: 'Navigation', action: () => { navigate('/channels/general'); onClose(); } },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none" />
          <kbd className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No commands found</p>
          ) : (
            filtered.map(cmd => {
              const Icon = cmd.icon;
              return (
                <button key={cmd.id} onClick={cmd.action}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
