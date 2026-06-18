import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { API_BASE } from '@/lib/utils';

interface VoiceMessageProps {
  url: string;
  isOwn?: boolean;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http')) return url;
  const base = API_BASE;
  const path = url.replace(/^\/api/, '');
  return `${base}/api${path}`;
}

export default function VoiceMessage({ url, isOwn = false }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [bars, setBars] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setBars(Array.from({ length: 30 }, () => Math.random() * 0.6 + 0.4));
  }, []);

  useEffect(() => {
    let mounted = true;
    const audioUrl = resolveUrl(url);

    fetch(audioUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.blob();
      })
      .then(blob => {
        if (!mounted) return;
        console.log('Voice blob loaded:', blob.type, blob.size, 'bytes');
        const localUrl = URL.createObjectURL(blob);
        blobUrlRef.current = localUrl;

        const audio = new Audio();
        audio.preload = 'auto';
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
          if (mounted) { setDuration(audio.duration); setLoaded(true); }
        });
        audio.addEventListener('ended', () => {
          if (mounted) { setPlaying(false); setProgress(0); if (rafRef.current) cancelAnimationFrame(rafRef.current); }
        });
        audio.addEventListener('error', (e) => {
          if (mounted) {
            const code = audio.error?.code || 'unknown';
            const msg = audio.error?.message || 'unknown';
            setFailed(true);
            console.error('Audio error:', code, msg, 'src:', localUrl, 'blob type:', blob.type);
          }
        });

        audio.src = localUrl;
      })
      .catch(err => {
        if (mounted) { setFailed(true); console.error('Failed to fetch audio:', audioUrl, err); }
      });

    return () => {
      mounted = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute('src'); }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [url]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || failed) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    } else {
      audio.currentTime = 0;
      const tick = () => {
        if (audio.duration && !audio.paused) {
          setProgress((audio.currentTime / audio.duration) * 100);
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      audio.play().then(() => {
        setPlaying(true);
        rafRef.current = requestAnimationFrame(tick);
      }).catch(err => {
        console.error('Play failed:', err);
      });
    }
  }, [playing, failed]);

  return (
    <div className={`flex items-center gap-3 min-w-[260px] max-w-[320px] py-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <button onClick={togglePlay}
        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          failed
            ? 'bg-red-100 dark:bg-red-900/20 text-red-400'
            : !loaded
              ? 'bg-gray-200 dark:bg-gray-700 cursor-wait'
              : isOwn
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400'
        }`}>
        {failed ? (
          <span className="text-xs">!</span>
        ) : !loaded ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : playing ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-px h-9">
          {bars.map((h, i) => {
            const pct = (i / bars.length) * 100;
            const active = pct <= progress;
            return (
              <div key={i}
                className={`flex-1 max-w-[4px] rounded-full transition-colors duration-75 ${
                  failed
                    ? 'bg-red-300 dark:bg-red-700'
                    : !loaded
                      ? (isOwn ? 'bg-white/15' : 'bg-gray-200 dark:bg-gray-700')
                      : active
                        ? (isOwn ? 'bg-white' : 'bg-blue-500')
                        : (isOwn ? 'bg-white/25' : 'bg-gray-300 dark:bg-gray-600')
                }`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-0.5">
          <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
            {failed ? 'Unable to play' : duration > 0 ? formatTime(duration) : '0:00'}
          </span>
        </div>
      </div>
    </div>
  );
}
