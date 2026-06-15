import { useState, useEffect } from 'react';
import { X, Search, Lock, Hash, Check, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  type: string;
  description: string;
  avatar?: string;
  isMember?: boolean;
  membershipStatus?: string;
}

interface ChannelBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelJoined: (channelId: string) => void;
}

export default function ChannelBrowserModal({ isOpen, onClose, onChannelJoined }: ChannelBrowserModalProps) {
  const { token } = useAuthStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearch('');
    fetch(`${API_URL}/channels/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setChannels(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isOpen, token]);

  const handleJoin = async (channelId: string) => {
    setJoiningId(channelId);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(prev => prev.map(ch =>
          ch.id === channelId ? { ...ch, membershipStatus: data.status, isMember: data.status === 'approved' } : ch
        ));
        if (data.status === 'approved') onChannelJoined(channelId);
      }
    } catch {}
    setJoiningId(null);
  };

  const publicChannels = channels.filter(ch => ch.type === 'public');
  const myChannels = channels.filter(ch => ch.isMember || ch.membershipStatus === 'approved');
  const filtered = channels.filter(ch =>
    ch.name.toLowerCase().includes(search.toLowerCase()) ||
    ch.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Browse Channels</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Find channels to join or browse</p>
        </div>

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Channel List */}
        <div className="max-h-[420px] overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Hash className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No channels found</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {search ? 'Try a different search term' : 'No channels available to join'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* My Channels */}
              {myChannels.length > 0 && !search && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Your Channels</p>
                  <div className="space-y-1">
                    {myChannels.map(ch => (
                      <ChannelRow key={ch.id} channel={ch} onJoin={handleJoin} joiningId={joiningId} />
                    ))}
                  </div>
                </div>
              )}

              {/* Public Channels to Join */}
              {publicChannels.filter(ch => !ch.isMember && ch.membershipStatus !== 'approved').length > 0 && !search && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Public Channels</p>
                  <div className="space-y-1">
                    {publicChannels.filter(ch => !ch.isMember && ch.membershipStatus !== 'approved').map(ch => (
                      <ChannelRow key={ch.id} channel={ch} onJoin={handleJoin} joiningId={joiningId} />
                    ))}
                  </div>
                </div>
              )}

              {/* Search results */}
              {search && (
                <div className="space-y-1">
                  {filtered.map(ch => (
                    <ChannelRow key={ch.id} channel={ch} onJoin={handleJoin} joiningId={joiningId} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelRow({ channel: ch, onJoin, joiningId }: { channel: Channel; onJoin: (id: string) => void; joiningId: string | null }) {
  const isMember = ch.isMember || ch.membershipStatus === 'approved';
  const isPending = ch.membershipStatus === 'pending';
  const isPrivate = ch.type === 'private';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold"
        style={{ backgroundColor: ch.avatar || (isPrivate ? '#d97706' : '#7c3aed') }}>
        {ch.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ch.name}</p>
          {isPrivate && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md font-medium">Private</span>
          )}
        </div>
        {ch.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{ch.description}</p>
        )}
      </div>

      <div className="flex-shrink-0">
        {isMember ? (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Check className="w-3 h-3" /> Joined
          </span>
        ) : isPending ? (
          <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <Clock className="w-3 h-3" /> Pending
          </span>
        ) : (
          <button
            onClick={() => onJoin(ch.id)}
            disabled={joiningId === ch.id}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
              isPrivate
                ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                : 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40'
            )}>
            {joiningId === ch.id ? (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Plus className="w-3 h-3" /> {isPrivate ? 'Request' : 'Join'}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
