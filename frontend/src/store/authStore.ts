import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { API_BASE } from '@/lib/utils';

const AUTH_API = API_BASE;
const REGISTERED_USERS_KEY = 'sokoteams-registered-users';

interface RegisteredUser {
  username: string;
  password: string;
  user: User;
}

function getRegisteredUsers(): RegisteredUser[] {
  try {
    return JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRegisteredUser(entry: RegisteredUser) {
  const existing = getRegisteredUsers();
  existing.push(entry);
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(existing));
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  serverAvailable: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, name: string, email: string, department?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAdmin: () => boolean;
  refreshUser: () => Promise<void>;
}

const MOCK_USERS: Record<string, { user: User; password: string }> = {
  admin: {
    user: { id: '1', name: 'Admin User', email: 'admin@corp.com', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', role: 'admin' },
    password: 'admin123',
  },
  john: {
    user: { id: '2', name: 'John Doe', email: 'john@corp.com', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', role: 'user' },
    password: 'john123',
  },
  jane: {
    user: { id: '3', name: 'Jane Smith', email: 'jane@corp.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', role: 'user' },
    password: 'jane123',
  },
  bob: {
    user: { id: '4', name: 'Bob Wilson', email: 'bob@corp.com', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', role: 'user' },
    password: 'bob123',
  },
};

async function tryServerLogin(username: string, password: string) {
  const res = await fetch(`${AUTH_API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  return { user: data.user as User, token: data.token as string };
}

async function tryServerRegister(username: string, password: string, name: string, email: string, department?: string) {
  const res = await fetch(`${AUTH_API}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, name, email, department }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  return { user: data.user as User, token: data.token as string };
}

async function tryServerUpdate(id: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`${AUTH_API}/api/users/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Server update failed');
  const data = await res.json();
  return (data.user || data) as User;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      serverAvailable: false,

      login: async (username: string, password: string) => {
        if (!username || !password) throw new Error('Please enter your username and password');

        try {
          const result = await tryServerLogin(username, password);
          set({ user: result.user, token: result.token, isAuthenticated: true, serverAvailable: true });
          return;
        } catch (err) {
          // Server unreachable or auth failed — try fallback
          if (!(err instanceof TypeError)) throw err; // TypeError = network error, keep trying
        }

        // ─── Fallback: localStorage mock users ───
        const key = username.toLowerCase().trim();
        const mockUser = MOCK_USERS[key];
        if (mockUser) {
          if (password !== mockUser.password) throw new Error('Invalid password');
          const tok = `tf_${btoa(JSON.stringify(mockUser.user))}`;
          set({ user: mockUser.user, token: tok, isAuthenticated: true, serverAvailable: false });
          return;
        }
        const registered = getRegisteredUsers();
        const match = registered.find((r) => r.username === key);
        if (match) {
          if (password !== match.password) throw new Error('Invalid password');
          const tok = `tf_${btoa(JSON.stringify(match.user))}`;
          set({ user: match.user, token: tok, isAuthenticated: true, serverAvailable: false });
          return;
        }
        throw new Error('User not found. Please register first.');
      },

      register: async (username: string, password: string, name: string, email: string, department?: string) => {
        if (!username || !password || !name || !email) throw new Error('All fields are required');

        try {
          const result = await tryServerRegister(username, password, name, email, department);
          set({ user: result.user, token: result.token, isAuthenticated: true, serverAvailable: true });
          return;
        } catch (err) {
          if (!(err instanceof TypeError)) throw err;
        }

        // ─── Fallback: localStorage registration ───
        const key = username.toLowerCase().trim();
        if (MOCK_USERS[key]) throw new Error('Username already taken');
        const registered = getRegisteredUsers();
        if (registered.find((r) => r.username === key)) throw new Error('Username already taken');
        const isFirst = registered.length === 0;
        const role: UserRole = isFirst ? 'admin' : 'user';
        const newUser: User = {
          id: crypto.randomUUID(), name, email, department,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
          role,
        };
        saveRegisteredUser({ username: key, password, user: newUser });
        const tok = `tf_${btoa(JSON.stringify(newUser))}`;
        set({ user: newUser, token: tok, isAuthenticated: true, serverAvailable: false });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: async (user: User) => {
        const state = useAuthStore.getState();
        set({ user });

        // Try server first
        if (state.serverAvailable && state.token && !state.token.startsWith('tf_')) {
          try {
            const updated = await tryServerUpdate(user.id, { email: user.email, name: user.name, department: user.department, avatar: user.avatar }, state.token);
            set({ user: updated });
            return;
          } catch {
            // fall through to localStorage
          }
        }

        // Fallback: localStorage
        const registered = getRegisteredUsers();
        const idx = registered.findIndex((r) => r.user.id === user.id);
        if (idx !== -1) {
          registered[idx].user = user;
        } else {
          registered.push({ username: user.name.toLowerCase().replace(/\s+/g, '_'), password: '', user });
        }
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));
      },

      refreshUser: async () => {
        const state = useAuthStore.getState();
        if (!state.token || state.token.startsWith('tf_') || !state.isAuthenticated) return;
        try {
          const res = await fetch(`${AUTH_API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${state.token}` },
          });
          if (res.ok) {
            const data = await res.json();
            set({ user: data.user, serverAvailable: true });
          } else {
            set({ serverAvailable: false });
          }
        } catch {
          set({ serverAvailable: false });
        }
      },

      isAdmin: () => {
        const state = useAuthStore.getState();
        return state.user?.role === 'admin';
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user, token: state.token, isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
