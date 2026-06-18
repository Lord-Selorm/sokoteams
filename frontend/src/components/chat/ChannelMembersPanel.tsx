import { useState, useEffect, useRef } from 'react';
import { X, Shield, User, Check, Trash2, Clock, UserPlus, Trash, Camera, Image as ImageIcon } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { cn, API_URL, API_BASE } from '@/lib/utils';

interface Member {
  channelId: string;
  userId: string;
  role: string;
  status: string;
  name: string;
  email: string;
  avatar: string;
}

interface ChannelInfo {
  id: string;
  name: string;
  type: string;
  avatar: string;
  description?: string;
  topic?: string;
}

interface ChannelMembersPanelProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChannelMembersPanel({ channelId, isOpen, onClose }: ChannelMembersPanelProps) {
  const { user, token } = useAuthStore();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [pending, setPending] = useState<Member[]>([]);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descText, setDescText] = useState('');
  const [topicText, setTopicText] = useState('');
  const [descSaving, setDescSaving] = useState(false);

  const myRole = members.find(m => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'admin';

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [membersRes, pendingRes, chRes] = await Promise.all([
        fetch(`${API_URL}/channels/${channelId}/members`, { headers }),
        isAdmin ? fetch(`${API_URL}/channels/${channelId}/pending`, { headers }) : Promise.resolve({ ok: false }),
        fetch(`${API_URL}/channels/${channelId}`),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (pendingRes.ok) setPending(await pendingRes.json());
      if (chRes.ok) setChannelInfo(await chRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && channelId) fetchMembers();
  }, [isOpen, channelId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${API_URL}/channels/${channelId}/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setChannelInfo(prev => prev ? { ...prev, avatar: data.avatar } : null);
    }
  };

  const handleApprove = async (userId: string) => {
    await fetch(`${API_URL}/channels/${channelId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    fetchMembers();
  };

  const handleDeny = async (userId: string) => {
    await fetch(`${API_URL}/channels/${channelId}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId }),
    });
    fetchMembers();
  };

  const handleRemove = async (userId: string) => {
    await fetch(`${API_URL}/channels/${channelId}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMembers(prev => prev.filter(m => m.userId !== userId));
  };

  const handleDeleteChannel = async () => {
    if (!confirm('Delete this channel? All messages will be permanently lost.')) return;
    await fetch(`${API_URL}/channels/${channelId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    onClose();
    navigate('/dashboard');
  };

  if (!isOpen) return null;

  return (
    <div className="w-72 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Members</h3>
        <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Channel Avatar (admin can change) */}
      {isAdmin && channelInfo && (
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md overflow-hidden"
                style={{ backgroundColor: channelInfo.avatar && !channelInfo.avatar.startsWith('/') && !channelInfo.avatar.startsWith('http') ? channelInfo.avatar : undefined }}>
                {channelInfo.avatar && (channelInfo.avatar.startsWith('/') || channelInfo.avatar.startsWith('http')) ? (
                  <img src={channelInfo.avatar.startsWith('/') ? `${API_BASE}${channelInfo.avatar}` : channelInfo.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  channelInfo.name.charAt(0).toUpperCase()
                )}
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{channelInfo.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click icon to change</p>
            </div>
          </div>
        </div>
      )}

      {/* Channel Description/Topic (admin can edit) */}
      {isAdmin && channelInfo && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {!editingDesc ? (
            <div className="space-y-1.5">
              {channelInfo.description && <p className="text-xs text-gray-600 dark:text-gray-400">{channelInfo.description}</p>}
              {channelInfo.topic && <p className="text-xs text-gray-500 dark:text-gray-500 italic">Topic: {channelInfo.topic}</p>}
              <button onClick={() => { setDescText(channelInfo.description || ''); setTopicText(channelInfo.topic || ''); setEditingDesc(true); }}
                className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">
                Edit description
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <input type="text" value={descText} onChange={e => setDescText(e.target.value)}
                  placeholder="Channel description"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Topic</label>
                <input type="text" value={topicText} onChange={e => setTopicText(e.target.value)}
                  placeholder="Channel topic"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingDesc(false)} className="px-2.5 py-1 text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                <button onClick={async () => {
                  setDescSaving(true);
                  try {
                    await fetch(`${API_URL}/channels/${channelId}/description`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ description: descText, topic: topicText }),
                    });
                    setChannelInfo(prev => prev ? { ...prev, description: descText, topic: topicText } : null);
                  } catch {}
                  setDescSaving(false);
                  setEditingDesc(false);
                }} disabled={descSaving}
                  className="px-2.5 py-1 text-[11px] font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
                  {descSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Pending Requests */}
            {isAdmin && pending.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                  Join Requests ({pending.length})
                </p>
                <div className="space-y-1">
                  {pending.map(m => (
                    <div key={m.userId} className="flex items-center justify-between py-2 px-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserAvatar user={{ id: m.userId, name: m.name, avatar: m.avatar }} size="sm" />
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleApprove(m.userId)}
                          className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeny(m.userId)}
                          className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="px-4 pt-3 pb-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Members ({members.length})
              </p>
              <div className="space-y-1">
                {members.map(m => (
                  <div key={m.userId} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserAvatar user={{ id: m.userId, name: m.name, avatar: m.avatar }} size="sm" showOnline />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {m.name} {m.userId === user?.id && <span className="text-xs text-gray-400">(you)</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.role === 'admin' && (
                        <Shield className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                      {isAdmin && m.userId !== user?.id && (
                        <button onClick={() => handleRemove(m.userId)}
                          className="p-1 rounded text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleDeleteChannel}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium transition-colors">
              <Trash className="w-4 h-4" /> Delete Channel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
