import { create } from 'zustand';
import type { ChatMessage, MessageReaction, ChatAttachment, ChannelInfo } from '@/types';
import { API_URL } from '@/lib/utils';

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

interface SocketState {
  currentChannel: string | null;
  messages: ChatMessage[];
  threadMessages: Record<string, ChatMessage[]>;
  reactions: MessageReaction[];
  unreadCounts: Record<string, number>;
  channelInfo: ChannelInfo | null;
  searchResults: ChatMessage[];
  pinnedMessages: ChatMessage[];
  isSearching: boolean;
  replyingTo: ChatMessage | null;
  editingMessage: ChatMessage | null;
  messageStatuses: Record<string, 'sending' | 'sent' | 'delivered' | 'read'>;

  connect: (userId?: string) => void;
  disconnect: () => void;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId?: string) => void;
  setReplyingTo: (msg: ChatMessage | null) => void;
  setEditingMessage: (msg: ChatMessage | null) => void;

  fetchMessages: (channelId: string) => Promise<void>;
  addMessage: (channelId: string, content: string, userId: string, userName: string, userAvatar: string, replyToId?: string, attachments?: ChatAttachment[]) => Promise<ChatMessage | null>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  forwardMessage: (messageId: string, toChannelId: string, userId: string, userName: string, userAvatar: string) => Promise<void>;

  fetchThreadMessages: (parentId: string) => Promise<ChatMessage[]>;
  addThreadReply: (parentId: string, content: string, userId: string, userName: string, userAvatar: string) => Promise<void>;

  fetchReactions: (messageId: string) => Promise<MessageReaction[]>;
  addReaction: (messageId: string, emoji: string, userId: string, userName: string) => Promise<void>;
  removeReaction: (reactionId: string) => Promise<void>;

  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  starMessage: (messageId: string) => Promise<void>;
  unstarMessage: (messageId: string) => Promise<void>;

  searchMessages: (query: string, channelId?: string) => Promise<void>;
  clearSearch: () => void;
  fetchPinnedMessages: (channelId: string) => Promise<void>;

  fetchChannelInfo: (channelId: string) => Promise<void>;
  setAutoDelete: (channelId: string, autoDelete: string | null) => Promise<void>;
  clearMessages: (channelId: string) => Promise<void>;
  fetchUnreadCounts: () => Promise<void>;
  markChannelRead: (channelId: string) => Promise<void>;
  uploadFile: (file: File) => Promise<ChatAttachment | null>;
  fetchMessageStatuses: (messageIds: string[]) => Promise<void>;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  currentChannel: null,
  messages: [],
  threadMessages: {},
  reactions: [],
  unreadCounts: {},
  channelInfo: null,
  searchResults: [],
  pinnedMessages: [],
  isSearching: false,
  replyingTo: null,
  editingMessage: null,
  messageStatuses: {},

  connect: () => {},
  disconnect: () => set({ currentChannel: null, messages: [], threadMessages: {}, reactions: [] }),
  joinChannel: (channelId: string) => { set({ currentChannel: channelId }); get().fetchMessages(channelId); get().fetchChannelInfo(channelId); },
  leaveChannel: () => set({ currentChannel: null, messages: [], threadMessages: {}, reactions: [], channelInfo: null, replyingTo: null, editingMessage: null }),
  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),

  fetchMessages: async (channelId: string) => {
    try {
      const res = await fetch(`${API_URL}/messages?channelId=${channelId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const filtered = Array.isArray(data) ? data.filter((m: ChatMessage) => !m.parentId) : [];
        set({ messages: filtered });
      }
    } catch (err) { console.error('Failed to fetch messages:', err); }
  },

  addMessage: async (channelId, content, userId, userName, userAvatar, replyToId, attachments) => {
    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ channelId, userId, userName, userAvatar, content, replyToId: replyToId || null, attachments: attachments || [], createdAt: new Date().toISOString() }),
      });
      if (res.ok) {
        const msg = await res.json();
        await get().fetchMessages(channelId);
        return msg;
      }
    } catch (err) { console.error('Failed to send message:', err); }
    return null;
  },

  editMessage: async (messageId, content) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content }),
      });
      const { currentChannel } = get();
      if (currentChannel) await get().fetchMessages(currentChannel);
      set({ editingMessage: null });
    } catch (err) { console.error('Failed to edit message:', err); }
  },

  deleteMessage: async (messageId) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}`, { method: 'DELETE', headers: getAuthHeaders() });
      const { currentChannel } = get();
      if (currentChannel) await get().fetchMessages(currentChannel);
    } catch (err) { console.error('Failed to delete message:', err); }
  },

  forwardMessage: async (messageId, toChannelId, userId, userName, userAvatar) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ channelId: toChannelId, userId, userName, userAvatar }),
      });
      await get().fetchMessages(toChannelId);
    } catch (err) { console.error('Failed to forward message:', err); }
  },

  fetchThreadMessages: async (parentId: string) => {
    try {
      const res = await fetch(`${API_URL}/messages?parentId=${parentId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        set((s) => ({ threadMessages: { ...s.threadMessages, [parentId]: data } }));
        return data;
      }
    } catch (err) { console.error('Failed to fetch thread messages:', err); }
    return [];
  },

  addThreadReply: async (parentId, content, userId, userName, userAvatar) => {
    try {
      const { currentChannel } = get();
      await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ channelId: currentChannel, parentId, userId, userName, userAvatar, content, createdAt: new Date().toISOString() }),
      });
      await get().fetchThreadMessages(parentId);
    } catch (err) { console.error('Failed to send thread reply:', err); }
  },

  fetchReactions: async (messageId: string) => {
    try {
      const res = await fetch(`${API_URL}/reactions?messageId=${messageId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ reactions: data });
        return data;
      }
    } catch (err) { console.error('Failed to fetch reactions:', err); }
    return [];
  },

  addReaction: async (messageId, emoji, userId, userName) => {
    try {
      await fetch(`${API_URL}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ messageId, emoji, userId, userName }),
      });
      await get().fetchReactions(messageId);
    } catch (err) { console.error('Failed to add reaction:', err); }
  },

  removeReaction: async (reactionId: string) => {
    try {
      await fetch(`${API_URL}/reactions/${reactionId}`, { method: 'DELETE', headers: getAuthHeaders() });
      const { reactions } = get();
      const reac = reactions.find((r) => r.id === reactionId);
      if (reac) await get().fetchReactions(reac.messageId);
    } catch (err) { console.error('Failed to remove reaction:', err); }
  },

  pinMessage: async (messageId) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}/pin`, { method: 'POST', headers: getAuthHeaders() });
      const { currentChannel } = get();
      if (currentChannel) {
        await get().fetchMessages(currentChannel);
        await get().fetchPinnedMessages(currentChannel);
      }
    } catch (err) { console.error('Failed to pin message:', err); }
  },

  unpinMessage: async (messageId) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}/unpin`, { method: 'POST', headers: getAuthHeaders() });
      const { currentChannel } = get();
      if (currentChannel) {
        await get().fetchMessages(currentChannel);
        await get().fetchPinnedMessages(currentChannel);
      }
    } catch (err) { console.error('Failed to unpin message:', err); }
  },

  starMessage: async (messageId) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}/star`, { method: 'POST', headers: getAuthHeaders() });
      const { currentChannel } = get();
      if (currentChannel) await get().fetchMessages(currentChannel);
    } catch (err) { console.error('Failed to star message:', err); }
  },

  unstarMessage: async (messageId) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}/unstar`, { method: 'POST', headers: getAuthHeaders() });
      const { currentChannel } = get();
      if (currentChannel) await get().fetchMessages(currentChannel);
    } catch (err) { console.error('Failed to unstar message:', err); }
  },

  searchMessages: async (query, channelId) => {
    if (!query.trim()) { set({ searchResults: [], isSearching: false }); return; }
    set({ isSearching: true });
    try {
      let url = `${API_URL}/messages/search?q=${encodeURIComponent(query)}`;
      if (channelId) url += `&channelId=${channelId}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ searchResults: data, isSearching: false });
      }
    } catch (err) { console.error('Failed to search messages:', err); set({ isSearching: false }); }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

  fetchPinnedMessages: async (channelId) => {
    try {
      const res = await fetch(`${API_URL}/messages/pinned/${channelId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ pinnedMessages: data });
      }
    } catch (err) { console.error('Failed to fetch pinned messages:', err); }
  },

  fetchChannelInfo: async (channelId) => {
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ channelInfo: data });
      }
    } catch (err) { console.error('Failed to fetch channel info:', err); }
  },

  setAutoDelete: async (channelId, autoDelete) => {
    try {
      await fetch(`${API_URL}/channels/${channelId}/auto-delete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ auto_delete: autoDelete }),
      });
      await get().fetchChannelInfo(channelId);
      if (autoDelete) await get().fetchMessages(channelId);
    } catch (err) { console.error('Failed to set auto-delete:', err); }
  },

  clearMessages: async (channelId) => {
    try {
      await fetch(`${API_URL}/channels/${channelId}/clear-messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      set({ messages: [] });
    } catch (err) { console.error('Failed to clear messages:', err); }
  },

  fetchUnreadCounts: async () => {
    try {
      const res = await fetch(`${API_URL}/messages/unread-all`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        set({ unreadCounts: data });
      }
    } catch (err) { console.error('Failed to fetch unread counts:', err); }
  },

  markChannelRead: async (channelId) => {
    try {
      await fetch(`${API_URL}/messages/read-channel/${channelId}`, { method: 'POST', headers: getAuthHeaders() });
      set((s) => ({ unreadCounts: { ...s.unreadCounts, [channelId]: 0 } }));
    } catch (err) { console.error('Failed to mark channel read:', err); }
  },

  uploadFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('files', file);
      const headers: Record<string, string> = {};
      const raw = localStorage.getItem('auth-store');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const token = parsed?.state?.token;
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (res.ok) {
        const files = await res.json();
        if (files.length > 0) return files[0] as ChatAttachment;
      } else {
        console.error('Upload failed:', res.status, await res.text());
      }
    } catch (err) { console.error('Failed to upload file:', err); }
    return null;
  },

  fetchMessageStatuses: async (messageIds) => {
    if (messageIds.length === 0) return;
    try {
      const res = await fetch(`${API_URL}/messages/batch-status?ids=${messageIds.join(',')}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const statuses: Record<string, 'sending' | 'sent' | 'delivered' | 'read'> = {};
        for (const [id, info] of Object.entries(data) as [string, any][]) {
          if (info.read) statuses[id] = 'read';
          else if (info.delivered) statuses[id] = 'delivered';
          else statuses[id] = 'sent';
        }
        set((s) => ({ messageStatuses: { ...s.messageStatuses, ...statuses } }));
      }
    } catch (err) { console.error('Failed to fetch message statuses:', err); }
  },
}));
