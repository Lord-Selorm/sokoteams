import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import ChatInterface from '@/components/chat/ChatInterface';
import { API_URL } from '@/lib/utils';

function getDmChannelId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm-${sorted[0]}-${sorted[1]}`;
}

export default function DirectMessagePage() {
  const params = useParams();
  const userParam = params.user || 'unknown';
  const { user } = useAuthStore();
  const isSelf = userParam === 'self';

  const channelId = isSelf
    ? `dm-self-${user?.id}`
    : user?.id
      ? getDmChannelId(user.id, userParam)
      : `dm-${userParam}`;

  const [channelName, setChannelName] = useState(isSelf ? `${user?.name} (you)` : 'Loading...');

  useEffect(() => {
    if (isSelf) {
      setChannelName(`${user?.name} (you)`);
      return;
    }
    fetch(`${API_URL}/users/${userParam}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.name) setChannelName(data.name);
        else setChannelName(userParam);
      })
      .catch(() => setChannelName(userParam));
  }, [userParam, isSelf, user?.name]);

  return (
    <div className="h-full">
      <ChatInterface key={channelId} channelId={channelId} channelName={channelName} />
    </div>
  );
}
