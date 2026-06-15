import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import { useSocketStore } from '@/store/socketStore';

export default function ChannelsPage() {
  const { channel } = useParams();
  const { joinChannel, leaveChannel } = useSocketStore();

  useEffect(() => {
    if (channel) {
      joinChannel(channel);
    }
    return () => {
      leaveChannel();
    };
  }, [channel, joinChannel, leaveChannel]);

  return (
    <div className="h-full">
      <ChatInterface key={channel || 'general'} channelId={channel || 'general'} channelName={`#${channel || 'general'}`} />
    </div>
  );
}
