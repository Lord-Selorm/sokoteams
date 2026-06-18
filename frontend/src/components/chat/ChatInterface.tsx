import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Smile, MessageCircle, CheckSquare, Hash, Paperclip, X, Search, ArrowDown, Pin, Edit3, Trash2, Copy, Forward, Star, MoreHorizontal, Reply, Image as ImageIcon, FileText, Mic, Settings, Timer, ArrowLeft, Lock, ShieldOff, Shield, Phone, Video, User as UserIcon, BellOff, Bell, Trash, Info, ChevronRight, Bookmark } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import type { ChatMessage, MessageReaction, ChatAttachment, User } from '@/types';
import { useNavigate } from 'react-router-dom';

import { getUsers } from '@/api/users';
import UserAvatar from '@/components/common/UserAvatar';
import EmojiPicker from './EmojiPicker';
import ThreadPanel from './ThreadPanel';
import CreateTaskFromMessage from './CreateTaskFromMessage';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessage from './VoiceMessage';
import TypingIndicator from './TypingIndicator';
import ReadReceipt from './ReadReceipt';
import { usePresence } from '@/hooks/usePresence';
import ChannelSettingsModal from './ChannelSettingsModal';
import ChannelMembersPanel from './ChannelMembersPanel';
import ImageLightbox from './ImageLightbox';

import { API_URL, API_BASE } from '@/lib/utils';

const POLL_INTERVAL = 2000;
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const API_URL_BASE = API_URL;

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
};

interface ChatInterfaceProps {
  channelId: string;
  channelName: string;
}

function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function parseAttachments(attachments: any): ChatAttachment[] {
  if (!attachments) return [];
  if (Array.isArray(attachments)) return attachments;
  try { return JSON.parse(attachments); } catch { return []; }
}

function fileUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const base = API_BASE;
  const path = url.replace(/^\/api/, '');
  return `${base}/api${path}`;
}

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);
}

interface InlineMedia {
  type: 'gif' | 'sticker';
  alt: string;
  url: string;
}

function parseInlineMedia(content: string): { text: string; media: InlineMedia[] } {
  const media: InlineMedia[] = [];
  const gifRegex = /\[GIF:(.+?):(.+?)\]/g;
  const stickerRegex = /\[STICKER:(.+?):(.+?)\]/g;
  let text = content;

  let match;
  while ((match = gifRegex.exec(content)) !== null) {
    media.push({ type: 'gif', alt: match[1], url: match[2] });
  }
  text = text.replace(gifRegex, '');

  while ((match = stickerRegex.exec(content)) !== null) {
    media.push({ type: 'sticker', alt: match[1], url: match[2] });
  }
  text = text.replace(stickerRegex, '');

  return { text: text.trim(), media };
}

function renderContent(content: string) {
  return content.replace(/@(\w+\s?\w*)/g, '<span class="text-blue-500 font-medium">@$1</span>');
}

export default function ChatInterface({ channelId, channelName }: ChatInterfaceProps) {
  const isDm = channelId.startsWith('dm-');
  const [input, setInput] = useState('');
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    messages, fetchMessages, addMessage, editMessage, deleteMessage, forwardMessage,
    fetchReactions, reactions, addReaction, removeReaction,
    pinMessage, unpinMessage, starMessage, unstarMessage,
    searchMessages, searchResults, clearSearch, isSearching,
    replyingTo, setReplyingTo, editingMessage, setEditingMessage,
    unreadCounts, markChannelRead, uploadFile, channelInfo,
    messageStatuses, fetchMessageStatuses, fetchUnreadCounts,
  } = useSocketStore();

  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [createTaskMessage, setCreateTaskMessage] = useState<ChatMessage | null>(null);
  const [reactionsByMsg, setReactionsByMsg] = useState<Record<string, MessageReaction[]>>({});
  const [openEmojiPicker, setOpenEmojiPicker] = useState<string | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msg: ChatMessage; x: number; y: number } | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinned, setShowPinned] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState<ChatMessage | null>(null);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [membership, setMembership] = useState<{ isMember: boolean; status: string }>({ isMember: true, status: 'approved' });
  const [blockStatus, setBlockStatus] = useState<{ blockedByMe: boolean; blockedByThem: boolean }>({ blockedByMe: false, blockedByThem: false });
  const [showDmDropdown, setShowDmDropdown] = useState(false);
  const [dmSettings, setDmSettings] = useState<{ auto_delete: string | null; isMuted: number }>({ auto_delete: null, isMuted: 0 });
  const [showDmInfo, setShowDmInfo] = useState(false);
  const [showDisappearingMenu, setShowDisappearingMenu] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const token = useAuthStore(s => s.token);
  const queryClient = useQueryClient();
  const presence = usePresence();
  const { data: usersData } = useQuery<User[]>({ queryKey: ['users'], queryFn: getUsers, staleTime: 60000, refetchOnWindowFocus: true });
  const { data: channelsData } = useQuery<{ id: string; name: string }[]>({ queryKey: ['channels'], queryFn: async () => { const r = await fetch(`${API_URL_BASE}/channels`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }); return r.ok ? r.json() : []; }, staleTime: 30000 });

  const otherUserId = isDm ? (() => {
    const parts = channelId.split('-');
    return parts.length >= 3 ? parts.slice(2).join('-') : null;
  })() : null;

  useEffect(() => {
    if (!isDm || !otherUserId || !token) return;
    fetch(`${API_URL_BASE}/users/${otherUserId}/block-status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { blockedByMe: false, blockedByThem: false })
      .then(d => setBlockStatus(d))
      .catch(() => setBlockStatus({ blockedByMe: false, blockedByThem: false }));
  }, [isDm, otherUserId, token]);

  const handleBlockToggle = async () => {
    if (!otherUserId || !token) return;
    const method = blockStatus.blockedByMe ? 'DELETE' : 'POST';
    try {
      const r = await fetch(`${API_URL_BASE}/users/${otherUserId}/block`, { method, headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        setBlockStatus(prev => ({ ...prev, blockedByMe: !prev.blockedByMe }));
        queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
      }
    } catch {}
  };

  useEffect(() => {
    if (!isDm || !otherUserId || !token) return;
    fetch(`${API_URL_BASE}/dm-settings/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDmSettings({ auto_delete: d.auto_delete, isMuted: d.isMuted || 0 }); })
      .catch(() => {});
  }, [isDm, otherUserId, token]);

  const handleSetAutoDelete = async (value: string | null) => {
    if (!otherUserId || !token) return;
    try {
      const r = await fetch(`${API_URL_BASE}/dm-settings/${otherUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ auto_delete: value }),
      });
      if (r.ok) setDmSettings(prev => ({ ...prev, auto_delete: value }));
    } catch {}
    setShowDisappearingMenu(false);
  };

  const handleToggleMute = async () => {
    if (!otherUserId || !token) return;
    const newMuted = dmSettings.isMuted ? 0 : 1;
    try {
      const r = await fetch(`${API_URL_BASE}/dm-settings/${otherUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isMuted: newMuted }),
      });
      if (r.ok) setDmSettings(prev => ({ ...prev, isMuted: newMuted }));
    } catch {}
  };

  const handleClearChat = async () => {
    if (!otherUserId || !token) return;
    if (!confirm('Delete all messages in this conversation? This cannot be undone.')) return;
    try {
      const r = await fetch(`${API_URL_BASE}/dm/${otherUserId}/messages`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        fetchMessages(channelId);
        setShowDmDropdown(false);
      }
    } catch {}
  };

  useEffect(() => {
    if (!channelId || !token) return;
    if (channelId.startsWith('dm-')) {
      setMembership({ isMember: true, status: 'approved' });
      return;
    }
    fetch(`${API_URL_BASE}/channels/${channelId}/membership`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { isMember: false, status: 'none' })
      .then(d => setMembership(d))
      .catch(() => setMembership({ isMember: false, status: 'none' }));
  }, [channelId, token]);
  const avatarMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (user?.id && user.avatar) {
      map[user.id] = user.avatar;
      map[user.name] = user.avatar;
    }
    if (Array.isArray(usersData)) {
      for (const u of usersData) {
        if (u.avatar) map[u.id] = u.avatar;
        map[u.name] = u.avatar;
      }
    }
    return map;
  }, [usersData, user]);

  const getAvatar = (msg: ChatMessage) => avatarMap[msg.userId] || avatarMap[msg.userName] || msg.userAvatar || '';

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAtBottomRef = useRef(true);
  const prevMessagesLenRef = useRef(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => { if (channelId) { prevMessagesLenRef.current = 0; isAtBottomRef.current = true; fetchMessages(channelId); } }, [channelId, fetchMessages]);

  useEffect(() => {
    if (!channelId) return;
    const interval = setInterval(() => fetchMessages(channelId), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [channelId, fetchMessages]);

  useEffect(() => {
    if (channelId && user) markChannelRead(channelId);
  }, [channelId, user]);

  useEffect(() => {
    const interval = setInterval(() => fetchUnreadCounts(), 5000);
    fetchUnreadCounts();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach((m) => {
        if (!reactionsByMsg[m.id]) {
          fetchReactions(m.id).then((r) => setReactionsByMsg((prev) => ({ ...prev, [m.id]: r })));
        }
      });
    }
  }, [messages, fetchReactions]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      isAtBottomRef.current = atBottom;
      setShowScrollBtn(!atBottom);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (messages.length > prevMessagesLenRef.current && isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (messages.length > prevMessagesLenRef.current) {
      const newMsgs = messages.slice(prevMessagesLenRef.current);
      const hasNewFromOthers = newMsgs.some(m => m.userId !== user?.id);
      if (hasNewFromOthers) playNotificationSound();
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (replyingTo || editingMessage) inputRef.current?.focus();
  }, [replyingTo, editingMessage]);

  useEffect(() => {
    if (!token || !isDm) return;
    fetch(`${API_URL_BASE}/saved-messages`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setSavedMessageIds(new Set(d.map((s: any) => s.messageId))))
      .catch(() => {});
  }, [token, channelId]);

  useEffect(() => {
    const ownMsgIds = messages.filter(m => m.userId === user?.id && !m.isDeleted).map(m => m.id);
    if (ownMsgIds.length > 0) fetchMessageStatuses(ownMsgIds);
  }, [messages, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReplyingTo(null);
        setEditingMessage(null);
        setContextMenu(null);
        setShowSearch(false);
        clearSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!input || !user || isDm) return;
    clearTimeout(typingTimeoutRef.current);
    fetch(`${API_URL_BASE}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channelId }),
    }).catch(() => {});
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  }, [input]);

  const groupedMessages = useMemo(() => {
    const groups: { message: ChatMessage; isGroupStart: boolean; showDate: boolean }[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = messages[i - 1];
      const isGroupStart = !prev || prev.userId !== msg.userId || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_WINDOW_MS;
      const showDate = !prev || !sameDay(prev.createdAt, msg.createdAt);
      groups.push({ message: msg, isGroupStart, showDate });
    }
    return groups;
  }, [messages]);

  const unreadCount = unreadCounts[channelId] || 0;

  const scrollToBottom = () => {
    isAtBottomRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;
    if (isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem)) return;
    if (editingMessage) {
      await editMessage(editingMessage.id, input.trim());
      setInput('');
      return;
    }
    const replyToId = replyingTo?.id || null;
    await addMessage(channelId, input.trim(), user.id, user.name, user.avatar, replyToId || undefined);
    setInput('');
    setReplyingTo(null);
    scrollToBottom();
  };

  const toggleSave = async (msg: ChatMessage) => {
    if (!token) return;
    const saved = savedMessageIds.has(msg.id);
    if (saved) {
      await fetch(`${API_URL_BASE}/saved-messages/${msg.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setSavedMessageIds(prev => { const next = new Set(prev); next.delete(msg.id); return next; });
    } else {
      const r = await fetch(`${API_URL_BASE}/saved-messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ messageId: msg.id, channelId }) });
      if (r.ok) setSavedMessageIds(prev => new Set(prev).add(msg.id));
    }
  };

  const handleEditSave = async () => {
    if (!editingMessage || !input.trim()) return;
    await editMessage(editingMessage.id, input.trim());
    setInput('');
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const existing = reactionsByMsg[messageId]?.find((r) => r.emoji === emoji && r.userId === user?.id);
    if (existing) await removeReaction(existing.id);
    else if (user) await addReaction(messageId, emoji, user.id, user.name);
    const updated = await fetchReactions(messageId);
    setReactionsByMsg((prev) => ({ ...prev, [messageId]: updated }));
  };

  const handleContextMenu = (e: React.MouseEvent, msg: ChatMessage) => {
    e.preventDefault();
    setContextMenu({ msg, x: e.clientX, y: e.clientY });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const attachment = await uploadFile(files[i]);
      if (attachment) {
        await addMessage(channelId, attachment.name, user.id, user.name, user.avatar, undefined, [attachment]);
      }
    }
  };

  const handleSendVoice = async (blob: Blob, duration: number) => {
    if (!user) return;
    if (isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem)) return;
    if (blob.size < 100) {
      console.warn('Audio blob too small, likely no audio captured');
    }
    const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || 'audio/webm' });
    const attachment = await uploadFile(file);
    if (attachment) {
      attachment.isVoice = true;
      attachment.duration = duration;
      await addMessage(channelId, '🎤 Voice message', user.id, user.name, user.avatar, undefined, [attachment]);
    }
    setShowRecorder(false);
    scrollToBottom();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) searchMessages(searchQuery, channelId);
  };

  const displayedMessages = searchResults.length > 0 ? searchResults : messages;

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Channel Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            {isDm ? (
              <UserAvatar user={otherUserId ? (usersData?.find(u => u.id === otherUserId) || { id: otherUserId, name: channelName, avatar: '' }) : { id: '', name: channelName, avatar: '' }} size="sm" showOnline />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm text-white font-semibold text-sm" style={{ backgroundColor: channelInfo?.avatar || '#7c3aed' }}>
                {channelName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{channelName}</h2>
              {isDm ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {otherUserId && presence[otherUserId] === 'online' ? 'Online' : 'Offline'}
                </p>
              ) : channelInfo?.topic ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{channelInfo.topic}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowSearch(!showSearch); if (showSearch) { clearSearch(); setSearchQuery(''); } }}
              className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
              <Search className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowPinned(!showPinned); }} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              <Pin className="w-4 h-4" />
            </button>
            {isDm ? (
              <div className="relative">
                <button onClick={() => setShowDmDropdown(!showDmDropdown)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {showDmDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowDmDropdown(false); setShowDisappearingMenu(false); }} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5">
                      <button onClick={() => { setShowDmDropdown(false); setShowDmInfo(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <Info className="w-4 h-4 text-gray-400" /> Contact info
                      </button>
                      <button onClick={() => { setShowDmDropdown(false); setShowSearch(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <Search className="w-4 h-4 text-gray-400" /> Search messages
                      </button>
                      <button onClick={handleToggleMute} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {dmSettings.isMuted ? <Bell className="w-4 h-4 text-gray-400" /> : <BellOff className="w-4 h-4 text-gray-400" />}
                        {dmSettings.isMuted ? 'Unmute notifications' : 'Mute notifications'}
                      </button>
                      <div className="relative">
                        <button onClick={() => setShowDisappearingMenu(!showDisappearingMenu)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <Timer className="w-4 h-4 text-gray-400" />
                          <span className="flex-1 text-left">Disappearing messages</span>
                          <span className="text-xs text-gray-400">{dmSettings.auto_delete === '24h' ? '24h' : dmSettings.auto_delete === '7d' ? '7 days' : dmSettings.auto_delete === '30d' ? '30 days' : 'Off'}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {showDisappearingMenu && (
                          <div className="absolute left-full top-0 ml-1 z-50 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5">
                            <button onClick={() => handleSetAutoDelete(null)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!dmSettings.auto_delete ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                              {!dmSettings.auto_delete && <span className="ml-auto text-blue-500">✓</span>} Off
                            </button>
                            <button onClick={() => handleSetAutoDelete('24h')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${dmSettings.auto_delete === '24h' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                              {dmSettings.auto_delete === '24h' && <span className="ml-auto text-blue-500">✓</span>} 24 hours
                            </button>
                            <button onClick={() => handleSetAutoDelete('7d')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${dmSettings.auto_delete === '7d' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                              {dmSettings.auto_delete === '7d' && <span className="ml-auto text-blue-500">✓</span>} 7 days
                            </button>
                            <button onClick={() => handleSetAutoDelete('30d')} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${dmSettings.auto_delete === '30d' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}>
                              {dmSettings.auto_delete === '30d' && <span className="ml-auto text-blue-500">✓</span>} 30 days
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button onClick={handleClearChat} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10">
                        <Trash className="w-4 h-4" /> Clear chat
                      </button>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button onClick={() => { handleBlockToggle(); setShowDmDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${blockStatus.blockedByMe ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                        {blockStatus.blockedByMe ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                        {blockStatus.blockedByMe ? 'Unblock user' : 'Block user'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => setShowChannelSettings(true)}
                  className={`p-2 rounded-lg transition-colors ${channelInfo?.auto_delete ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  title={channelInfo?.auto_delete ? `Disappearing messages: ${channelInfo.auto_delete}` : 'Channel settings'}>
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => setShowChannelInfo(!showChannelInfo)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Blocked User Banner */}
        {isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem) && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-800">
            <ShieldOff className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400">
              {blockStatus.blockedByMe ? 'You have blocked this user.' : 'This user has blocked you. You cannot send messages.'}
            </p>
            {blockStatus.blockedByMe && (
              <button onClick={handleBlockToggle} className="ml-auto text-xs text-red-600 dark:text-red-400 hover:underline font-medium">
                Unblock
              </button>
            )}
          </div>
        )}

        {/* Disappearing Messages Banner */}
        {(channelInfo?.auto_delete || (isDm && dmSettings.auto_delete)) && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-800">
            <Timer className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Disappearing messages are <strong>on</strong> — new messages delete after{' '}
              {(channelInfo?.auto_delete || dmSettings.auto_delete) === '24h' ? '24 hours' : (channelInfo?.auto_delete || dmSettings.auto_delete) === '7d' ? '7 days' : '30 days'}.
            </p>
            <button onClick={() => isDm ? setShowDmDropdown(true) : setShowChannelSettings(true)} className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium">
              Change
            </button>
          </div>
        )}

        {/* Private Channel Access Denied */}
        {!membership.isMember && membership.status === 'pending' && (
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Request Sent</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your request to join <strong>{channelName}</strong> is pending.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">You'll see messages once an admin approves.</p>
              <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium transition-colors">Back to Dashboard</button>
            </div>
          </div>
        )}

        {!membership.isMember && membership.status === 'none' && (
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{channelName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This is a private channel. Request to join to see messages.</p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`${API_URL_BASE}/channels/${channelId}/join`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setMembership({ isMember: data.status === 'approved', status: data.status });
                    }
                  } catch {}
                }}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium transition-colors shadow-sm"
              >
                Request to Join
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search in this channel..." autoFocus
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none" />
            {searchResults.length > 0 && <span className="text-xs text-gray-400">{searchResults.length} results</span>}
            <button onClick={() => { clearSearch(); setSearchQuery(''); setShowSearch(false); }} className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}

        {/* Messages Area */}
        {membership.isMember && (<>
        <div ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto px-4 py-2 space-y-0 relative ${dragOver ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}>

          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 dark:bg-blue-900/20 z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-2 p-8 rounded-2xl border-2 border-dashed border-blue-400">
                <Paperclip className="w-8 h-8 text-blue-500" />
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Drop files to share</p>
              </div>
            </div>
          )}

          {groupedMessages.map(({ message: msg, isGroupStart, showDate }) => {
            const msgReactions = reactionsByMsg[msg.id] || [];
            const groupedReactions = msgReactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
              if (!acc[r.emoji]) acc[r.emoji] = [];
              acc[r.emoji].push(r);
              return acc;
            }, {});
            const replyToMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 flex-shrink-0 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">{formatMessageDate(msg.createdAt)}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                  </div>
                )}

                {msg.isPinned && (
                  <div className="flex items-center gap-1.5 px-4 md:px-12 py-0.5 text-[11px] text-blue-500">
                    <Pin className="w-3 h-3" />
                    <span>Pinned by {msg.pinnedBy ? (usersData?.find(u => u.id === msg.pinnedBy)?.name || 'someone') : 'someone'}</span>
                  </div>
                )}

                <div
                  className={`group flex gap-3 px-2 py-0.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 relative transition-colors ${msg.isPinned ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  onMouseEnter={() => setHoveredMessage(msg.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                >
                  {isGroupStart ? (
                    <div className="relative flex-shrink-0 mt-0.5">
                      <UserAvatar user={{ id: msg.userId, name: msg.userName, avatar: getAvatar(msg) }} size="md" />
                    </div>
                  ) : (
                    <div className="w-9 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    {isGroupStart && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <button onClick={() => navigate(`/user/${msg.userId}`)} className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 hover:underline">{msg.userName}</button>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatTime(msg.createdAt)}</span>
                        {msg.userId === user?.id && (
                          <ReadReceipt messageId={msg.id} />
                        )}
                        {msg.isEdited && (
                          <span
                            className="text-[10px] text-gray-400 dark:text-gray-500 italic cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
                            onMouseEnter={async () => {
                              if (editHistoryMsgId !== msg.id) {
                                setEditHistoryMsgId(msg.id);
                                try {
                                  const r = await fetch(`${API_URL_BASE}/messages/${msg.id}/history`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                  if (r.ok) setEditHistory(await r.json());
                                } catch { setEditHistory([]); }
                              }
                            }}
                            onClick={async () => {
                              setEditHistoryMsgId(msg.id);
                              try {
                                const r = await fetch(`${API_URL_BASE}/messages/${msg.id}/history`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                if (r.ok) setEditHistory(await r.json());
                              } catch { setEditHistory([]); }
                            }}
                          >
                            (edited)
                            {editHistoryMsgId === msg.id && editHistory.length > 0 && (
                              <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Edit History</p>
                                {editHistory.map((h: any, i: number) => (
                                  <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                    <p className="text-xs text-gray-700 dark:text-gray-300">{h.content}</p>
                                    <p className="text-[10px] text-gray-400">{new Date(h.editedAt).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </span>
                        )}
                        {msg.isStarred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                        {msg.forwardedFrom && <span className="text-[10px] text-gray-400">Forwarded from {msg.forwardedFrom}</span>}
                        {msg.auto_delete_at && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-500" title={`Deletes ${new Date(msg.auto_delete_at).toLocaleString()}`}>
                            <Timer className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    )}

                    {replyToMsg && (
                      <div className="flex items-center gap-2 mb-1 pl-3 border-l-2 border-blue-400 dark:border-blue-500">
                        <Reply className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-blue-500 dark:text-blue-400">{replyToMsg.userName}</span>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{replyToMsg.content}</p>
                        </div>
                      </div>
                    )}

                    {msg.isDeleted ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">This message was deleted</p>
                    ) : (
                      <>
                        {(() => {
                          const atts = parseAttachments(msg.attachments);
                          const hasVoice = atts.some(a => a.isVoice);
                          const showText = !(hasVoice && msg.content === '🎤 Voice message');
                          const { text: inlineText, media } = parseInlineMedia(msg.content || '');

                          return (
                            <>
                              {showText && inlineText ? (
                                <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: renderContent(inlineText) }} />
                              ) : null}

                              {media.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {media.map((m, i) => (
                                    <div key={i} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                      <img src={m.url} alt={m.alt} className={`object-cover ${m.type === 'sticker' ? 'w-24 h-24' : 'max-w-xs max-h-48'}`} loading="lazy" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {(() => { const atts = parseAttachments(msg.attachments); if (atts.length === 0) return null;
                          const voiceAtts = atts.filter(a => a.isVoice);
                          const fileAtts = atts.filter(a => !a.isVoice);
                          return (
                            <>
                              {voiceAtts.map((att) => (
                                <div key={att.id} className="mt-1.5">
                                  <VoiceMessage url={att.url} isOwn={msg.userId === user?.id} />
                                </div>
                              ))}
                              {fileAtts.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {fileAtts.map((att) => (
                                    isImageFile(att.name) ? (
                                      <div key={att.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden cursor-pointer" onClick={() => setLightboxSrc(fileUrl(att.url))}>
                                        <img src={fileUrl(att.url)} alt={att.name} className="max-w-[200px] max-h-48 rounded-lg object-cover" loading="lazy" />
                                      </div>
                                    ) : (
                                      <a key={att.id} href={fileUrl(att.url)} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        <div className="min-w-0">
                                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{att.name}</p>
                                          {att.size && <p className="text-[10px] text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>}
                                        </div>
                                      </a>
                                    )
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </>
                    )}

                    {Object.keys(groupedReactions).length > 0 && !msg.isDeleted && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(groupedReactions).map(([emoji, reactors]) => {
                          const userReacted = reactors.some((r) => r.userId === user?.id);
                          return (
                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                              title={reactors.map(r => r.userName).join(', ')}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-all ${
                                userReacted
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                              }`}>
                              <span>{emoji}</span>
                              <span className="font-medium">{ reactors.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                    {/* Hover Actions - always visible on touch, hover on desktop */}
                    {!msg.isDeleted && (
                    <>
                    <div className="flex md:hidden absolute top-0 right-2 -translate-y-1/2 items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-1 py-0.5 z-10">
                      <button onClick={() => { setReplyingTo(msg); setInput(''); inputRef.current?.focus(); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Reply">
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button onClick={() => setOpenEmojiPicker(openEmojiPicker === msg.id ? null : msg.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="React">
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        {openEmojiPicker === msg.id && (
                          <EmojiPicker position="top" onSelect={(emoji) => handleReaction(msg.id, emoji)} onClose={() => setOpenEmojiPicker(null)} />
                        )}
                      </div>
                      <button onClick={() => { setThreadMessage(msg); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Thread">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setShowForwardModal(msg); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Forward">
                        <Forward className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setCreateTaskMessage(msg); setShowCreateTask(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Create task">
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleSave(msg)}
                        className={`p-1.5 rounded-lg transition-colors ${savedMessageIds.has(msg.id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'} hover:bg-gray-100 dark:hover:bg-gray-700`} title={savedMessageIds.has(msg.id) ? "Unsave message" : "Save message"}>
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => handleContextMenu(e, msg)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="More">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {hoveredMessage === msg.id && (
                    <div className="hidden md:flex absolute top-0 right-2 -translate-y-1/2 items-center gap-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-1 py-0.5 z-10">
                      <button onClick={() => { setReplyingTo(msg); setInput(''); inputRef.current?.focus(); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Reply">
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button onClick={() => setOpenEmojiPicker(openEmojiPicker === msg.id ? null : msg.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="React">
                          <Smile className="w-3.5 h-3.5" />
                        </button>
                        {openEmojiPicker === msg.id && (
                          <EmojiPicker position="top" onSelect={(emoji) => handleReaction(msg.id, emoji)} onClose={() => setOpenEmojiPicker(null)} />
                        )}
                      </div>
                      <button onClick={() => { setThreadMessage(msg); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Thread">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setShowForwardModal(msg); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Forward">
                        <Forward className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setCreateTaskMessage(msg); setShowCreateTask(true); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Create task">
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleSave(msg)}
                        className={`p-1.5 rounded-lg transition-colors ${savedMessageIds.has(msg.id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'} hover:bg-gray-100 dark:hover:bg-gray-700`} title={savedMessageIds.has(msg.id) ? "Unsave message" : "Save message"}>
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => handleContextMenu(e, msg)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="More">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    )}
                    </>
                    )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to Bottom */}
        {showScrollBtn && (
          <button onClick={scrollToBottom}
            className="absolute bottom-28 right-6 w-9 h-9 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 dark:hover:bg-gray-600 transition-all z-20 animate-bounce">
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Reply/Edit Preview */}
        {(replyingTo || editingMessage) && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {editingMessage ? <Edit3 className="w-3.5 h-3.5 text-blue-500" /> : <Reply className="w-3.5 h-3.5 text-blue-500" />}
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {editingMessage ? 'Editing message' : `Replying to ${replyingTo?.userName}`}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {editingMessage ? editingMessage.content : replyingTo?.content}
              </p>
            </div>
            <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setInput(''); }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        )}

        {/* Typing Indicator */}
        {!isDm && <TypingIndicator channelId={channelId} currentUserId={user?.id} />}

        {/* Message Input */}
        {showRecorder ? (
          <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowRecorder(false)} />
        ) : (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <label className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <Paperclip className="w-4.5 h-4.5" />
              <input type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
            </label>
            <div className="flex-1 flex items-center bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all relative">
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => {
                  const val = e.target.value;
                  setInput(val);
                  const lastAt = val.lastIndexOf('@');
                  if (lastAt >= 0 && lastAt === val.length - 1) {
                    setShowMentionDropdown(true);
                    setMentionQuery('');
                  } else if (lastAt >= 0 && !val.substring(lastAt).includes(' ')) {
                    setShowMentionDropdown(true);
                    setMentionQuery(val.substring(lastAt + 1).toLowerCase());
                  } else {
                    setShowMentionDropdown(false);
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem) ? (blockStatus.blockedByMe ? 'You blocked this user' : 'Blocked by this user') : editingMessage ? 'Edit message...' : `Message #${channelName}`}
                disabled={isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem)}
                className="flex-1 bg-transparent text-[13px] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none py-1 disabled:opacity-50" />
              {showMentionDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50 max-h-48 overflow-y-auto">
                  {usersData?.filter(u => u.id !== user?.id && u.name.toLowerCase().includes(mentionQuery)).slice(0, 8).map(u => (
                    <button key={u.id} onClick={() => {
                      const lastAt = input.lastIndexOf('@');
                      setInput(input.substring(0, lastAt) + '@' + u.name + ' ');
                      setShowMentionDropdown(false);
                      inputRef.current?.focus();
                    }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <span className="text-gray-900 dark:text-gray-100">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <button onClick={() => setOpenEmojiPicker(openEmojiPicker === 'input' ? null : 'input')}
                  className="p-1 rounded text-gray-400 hover:text-yellow-500 transition-colors">
                  <Smile className="w-4 h-4" />
                </button>
                {openEmojiPicker === 'input' && (
                  <EmojiPicker position="top" onSelect={(emoji) => setInput(prev => prev + emoji)} onClose={() => setOpenEmojiPicker(null)} />
                )}
              </div>
            </div>
            {!input.trim() && !editingMessage && (
              <button onClick={() => setShowRecorder(true)}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all hidden sm:flex">
                <Mic className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleSend} disabled={!input.trim() || (isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem))}
              className={`p-2.5 rounded-xl transition-all ${input.trim() && !(isDm && (blockStatus.blockedByMe || blockStatus.blockedByThem)) ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}
        </>)}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1.5 min-w-[200px]"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 300) }}>
            <button onClick={() => { setReplyingTo(contextMenu.msg); setContextMenu(null); inputRef.current?.focus(); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Reply className="w-4 h-4" /> Reply
            </button>
            <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Copy className="w-4 h-4" /> Copy Text
            </button>
            {contextMenu.msg.userId === user?.id && (
              <button onClick={() => { setEditingMessage(contextMenu.msg); setInput(contextMenu.msg.content); setContextMenu(null); inputRef.current?.focus(); }}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            )}
            <button onClick={() => { setShowForwardModal(contextMenu.msg); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Forward className="w-4 h-4" /> Forward
            </button>
            <button onClick={() => { contextMenu.msg.isPinned ? unpinMessage(contextMenu.msg.id) : pinMessage(contextMenu.msg.id); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Pin className="w-4 h-4" /> {contextMenu.msg.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button onClick={() => { contextMenu.msg.isStarred ? unstarMessage(contextMenu.msg.id) : starMessage(contextMenu.msg.id); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Star className="w-4 h-4" /> {contextMenu.msg.isStarred ? 'Unstar' : 'Star'}
            </button>
            <button onClick={() => { setThreadMessage(contextMenu.msg); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <MessageCircle className="w-4 h-4" /> Reply in Thread
            </button>
            <button onClick={() => { setCreateTaskMessage(contextMenu.msg); setShowCreateTask(true); setContextMenu(null); }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              <CheckSquare className="w-4 h-4" /> Create Task
            </button>
            {contextMenu.msg.userId === user?.id && (
              <>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button onClick={() => { if (confirm('Delete this message?')) { deleteMessage(contextMenu.msg.id); } setContextMenu(null); }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Forward Modal */}
      {showForwardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForwardModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-3">Forward message to...</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(Array.isArray(channelsData) ? channelsData : []).filter(c => c.id !== channelId).map(ch => (
                <button key={ch.id} onClick={() => {
                  if (user) forwardMessage(showForwardModal.id, ch.id, user.id, user.name, user.avatar);
                  setShowForwardModal(null);
                }} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm">
                  <Hash className="w-4 h-4 text-gray-400" /> {ch.name}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForwardModal(null)} className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
          </div>
        </div>
      )}

      {threadMessage && <ThreadPanel parentMessage={threadMessage} onClose={() => setThreadMessage(null)} />}

      {showCreateTask && createTaskMessage && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <CreateTaskFromMessage messageContent={createTaskMessage.content} channelId={channelId} workspaceId="default-workspace"
            onCancel={() => { setShowCreateTask(false); setCreateTaskMessage(null); }}
            onTaskCreated={() => { setShowCreateTask(false); setCreateTaskMessage(null); }} />
        </div>
      )}

      {showChannelSettings && channelInfo && (
        <ChannelSettingsModal channel={channelInfo} onClose={() => setShowChannelSettings(false)} />
      )}

      <ChannelMembersPanel channelId={channelId} isOpen={showChannelInfo} onClose={() => setShowChannelInfo(false)} />

      {showDmInfo && otherUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDmInfo(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Contact info</h3>
              <button onClick={() => setShowDmInfo(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <UserAvatar user={usersData?.find(u => u.id === otherUserId) || { id: otherUserId, name: channelName, avatar: '' }} size="xl" showOnline />
              <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{channelName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {presence[otherUserId] === 'online' ? 'Online' : 'Offline'}
              </p>
            </div>
            <div className="px-5 pb-5 space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <Timer className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Disappearing messages</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{dmSettings.auto_delete === '24h' ? '24 hours' : dmSettings.auto_delete === '7d' ? '7 days' : dmSettings.auto_delete === '30d' ? '30 days' : 'Off'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                {dmSettings.isMuted ? <BellOff className="w-4 h-4 text-gray-400" /> : <Bell className="w-4 h-4 text-gray-400" />}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{dmSettings.isMuted ? 'Muted' : 'Active'}</p>
                </div>
              </div>
              {blockStatus.blockedByMe && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10">
                  <ShieldOff className="w-4 h-4 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Blocked</p>
                    <p className="text-xs text-red-500 dark:text-red-400">You have blocked this user</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
