import { useState, Fragment } from 'react';
import { Sun, Moon, Menu, LogOut, User as UserIcon, Settings, Smile } from 'lucide-react';
import { Menu as HMenu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import NotificationBell from '@/components/notifications/NotificationBell';
import ProfileModal from '@/components/common/ProfileModal';
import UserAvatar from '@/components/common/UserAvatar';
import { API_URL } from '@/lib/utils';

const STATUS_EMOJIS = ['🟢','🔴','🟡','🔵','💼','🏃','🏠','🎯','🚀','⏰','☕','🎉'];

export default function Topbar() {
  const { darkMode, toggleDarkMode, toggleSidebar } = useUIStore();
  const { user, logout, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState(user?.status || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.statusEmoji || '🟢');

  const handleSaveStatus = async () => {
    try {
      const raw = localStorage.getItem('auth-store');
      const token = raw ? JSON.parse(raw)?.state?.token : '';
      const res = await fetch(`${API_URL}/users/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: statusText, statusEmoji }),
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ ...user!, status: statusText, statusEmoji, ...(data.user || {}) });
      }
    } catch {}
    setShowStatusModal(false);
  };

  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between h-12 px-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <NotificationBell />
          {user && (
            <HMenu as="div" className="relative ml-2 pl-3 border-l border-gray-200 dark:border-gray-800">
              <MenuButton className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none">
                <UserAvatar user={user} size="sm" />
                {user?.status && (
                  <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400 max-w-[100px] truncate">{user.statusEmoji} {user.status}</span>
                )}
              </MenuButton>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <MenuItems className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 focus:outline-none">
                  {/* User info header */}
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    {user?.status && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.statusEmoji} {user.status}</p>
                    )}
                  </div>
                  <MenuItem>
                    <button
                      onClick={() => { setStatusText(user?.status || ''); setStatusEmoji(user?.statusEmoji || '🟢'); setShowStatusModal(true); }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Smile className="w-4 h-4" />
                      Set Status
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={() => setProfileOpen(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4" />
                      Edit Profile
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={() => navigate('/settings')}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </MenuItem>
                  <div className="border-t border-gray-200 dark:border-gray-800 mt-1 pt-1">
                    <MenuItem>
                      <button
                        onClick={() => { queryClient.clear(); logout(); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </MenuItem>
                  </div>
                </MenuItems>
              </Transition>
            </HMenu>
          )}
        </div>
      </header>
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowStatusModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Set your status</h3>
            </div>
            <div className="p-5 space-y-4">
              <input type="text" value={statusText} onChange={e => setStatusText(e.target.value)}
                placeholder="What are you working on?"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Emoji</p>
                <div className="grid grid-cols-6 gap-1.5">
                  {STATUS_EMOJIS.map(em => (
                    <button key={em} onClick={() => setStatusEmoji(em)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${statusEmoji === em ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={() => { setStatusText(''); setStatusEmoji('🟢'); }} className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg transition-colors">
                Clear Status
              </button>
              <button onClick={handleSaveStatus} className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
