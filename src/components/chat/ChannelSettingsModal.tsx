import { useState } from 'react';
import { X, Clock, Trash2, Timer, Shield } from 'lucide-react';
import { useSocketStore } from '@/store/socketStore';
import type { ChannelInfo } from '@/types';

interface ChannelSettingsModalProps {
  channel: ChannelInfo;
  onClose: () => void;
}

const AUTO_DELETE_OPTIONS = [
  { value: null, label: 'Off', description: 'Messages are kept permanently', icon: '∞' },
  { value: '24h', label: '24 hours', description: 'Messages delete after 24 hours', icon: '1d' },
  { value: '7d', label: '7 days', description: 'Messages delete after 7 days', icon: '7d' },
  { value: '30d', label: '30 days', description: 'Messages delete after 30 days', icon: '30d' },
];

export default function ChannelSettingsModal({ channel, onClose }: ChannelSettingsModalProps) {
  const { setAutoDelete, clearMessages } = useSocketStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showAutoDeleteConfirm, setShowAutoDeleteConfirm] = useState<string | null>(null);

  const handleAutoDeleteChange = async (value: string | null) => {
    if (value && channel.auto_delete !== value) {
      setShowAutoDeleteConfirm(value);
      return;
    }
    await setAutoDelete(channel.id, value);
  };

  const confirmAutoDelete = async () => {
    await setAutoDelete(channel.id, showAutoDeleteConfirm);
    setShowAutoDeleteConfirm(null);
  };

  const handleClearMessages = async () => {
    setClearing(true);
    await clearMessages(channel.id);
    setClearing(false);
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Channel Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">#{channel.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Disappearing Messages */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Timer className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Disappearing Messages</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Auto-delete messages after a set time</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {AUTO_DELETE_OPTIONS.map((opt) => {
                const isActive = channel.auto_delete === opt.value;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleAutoDeleteChange(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                        : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      {opt.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{opt.description}</p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {channel.auto_delete && (
              <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                <Shield className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  New messages will auto-delete after {channel.auto_delete === '24h' ? '24 hours' : channel.auto_delete === '7d' ? '7 days' : '30 days'}. Existing messages are not affected.
                </p>
              </div>
            )}
          </div>

          {/* Clear Chat */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Clear Chat</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Permanently delete all messages in this channel</p>
              </div>
            </div>

            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Messages
              </button>
            ) : (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-1">Are you sure?</p>
                <p className="text-xs text-red-600 dark:text-red-400/80 mb-3">
                  This will permanently delete all messages in #{channel.name}. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearMessages}
                    disabled={clearing}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {clearing ? 'Clearing...' : 'Yes, Clear All'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auto-delete confirmation */}
      {showAutoDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={() => setShowAutoDeleteConfirm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Enable Disappearing Messages?</h4>
                <p className="text-xs text-gray-500">For #{channel.name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              New messages sent after enabling will auto-delete after <strong>{showAutoDeleteConfirm === '24h' ? '24 hours' : showAutoDeleteConfirm === '7d' ? '7 days' : '30 days'}</strong>. Existing messages will not be affected.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowAutoDeleteConfirm(null)}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={confirmAutoDelete}
                className="flex-1 px-3 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
                Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
