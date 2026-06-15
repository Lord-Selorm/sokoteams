import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/utils';

function getToken(): string {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) { const p = JSON.parse(raw); return p?.state?.token || ''; }
  } catch {} return '';
}

export function usePresence() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Send heartbeat every 60s
  useEffect(() => {
    if (!user) return;
    const sendHeartbeat = () => {
      fetch(`${API_URL}/presence/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch presence status every 30s
  const { data } = useQuery<Record<string, 'online' | 'offline'>>({
    queryKey: ['presence'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/presence/status`);
      return res.ok ? res.json() : {};
    },
    refetchInterval: 30000,
    staleTime: 20000,
  });

  return data || {};
}

export function useIsOnline(userId: string, presence: Record<string, 'online' | 'offline'>): boolean {
  return presence[userId] === 'online';
}
