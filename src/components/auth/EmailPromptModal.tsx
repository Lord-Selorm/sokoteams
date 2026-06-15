import { useState, useEffect } from 'react';
import { Mail, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const PROMPT_KEY = 'sokoteams-email-prompted';

function hasBeenPrompted(): boolean {
  try {
    return JSON.parse(localStorage.getItem(PROMPT_KEY) || 'false');
  } catch {
    return false;
  }
}

function markPrompted() {
  localStorage.setItem(PROMPT_KEY, 'true');
}

export default function EmailPromptModal() {
  const { user, updateUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && !hasBeenPrompted()) {
      setEmail(user.email || '');
      setOpen(true);
    }
  }, [user]);

  function handleSave() {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    markPrompted();
    updateUser({ ...user!, email: email.trim() });
    setOpen(false);
  }

  function handleSkip() {
    markPrompted();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Email Address</h2>
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Provide your email to receive real-time notifications about task assignments, completions, and overdue tasks.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="you@company.com"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-gray-400"
          />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        </div>
        <div className="px-6 pb-6 pt-3 flex gap-2 justify-end">
          <button
            onClick={handleSkip}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
