import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Send, X, AlertCircle, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animIntervalRef.current) { clearInterval(animIntervalRef.current); animIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setInitializing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 44100 }
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const opts: MediaRecorderOptions = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : {};
      const recorder = new MediaRecorder(stream, opts);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 100) {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setAudioBlob(blob);
          setAudioUrl(url);
        } else {
          setError('Recording is empty. Check your microphone.');
        }
        setIsRecording(false);
      };

      recorder.onerror = () => {
        setError('Recording failed. Microphone may be in use by another app.');
        cleanup();
        setIsRecording(false);
      };

      recorder.start(100);
      setIsRecording(true);
      setInitializing(false);
      setDuration(0);

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // Fake waveform — small random pulses for visual feedback
      animIntervalRef.current = setInterval(() => {
        setWaveformData(Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.2));
      }, 100);
    } catch (err: any) {
      setInitializing(false);
      if (err.name === 'NotAllowedError') setError('Microphone access denied. Allow mic access and try again.');
      else if (err.name === 'NotFoundError') setError('No microphone found. Connect a microphone.');
      else setError('Could not start recording: ' + (err.message || 'Unknown error'));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animIntervalRef.current) { clearInterval(animIntervalRef.current); animIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => {
    startRecording();
    return () => cleanup();
  }, []);

  const handleSend = () => {
    if (audioBlob && duration > 0) {
      onSend(audioBlob, duration);
      cleanup();
    }
  };

  const handlePreview = () => {
    if (!audioUrl) return;
    if (previewPlaying) {
      previewAudioRef.current?.pause();
      setPreviewPlaying(false);
      return;
    }
    const audio = new Audio();
    audio.src = audioUrl;
    previewAudioRef.current = audio;
    audio.addEventListener('ended', () => { setPreviewPlaying(false); setPreviewProgress(0); });
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setPreviewProgress((audio.currentTime / audio.duration) * 100);
    });
    audio.play().catch(err => {
      console.error('Preview failed:', err);
      setPreviewPlaying(false);
    });
    setPreviewPlaying(true);
  };

  if (error) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/10 border-t border-red-200 dark:border-red-800">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <span className="flex-1 text-sm text-red-600 dark:text-red-400">{error}</span>
        <button onClick={onCancel} className="p-2 rounded text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (audioBlob) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-200 dark:border-blue-800">
        <button onClick={() => { setAudioBlob(null); setAudioUrl(null); setDuration(0); setWaveformData([]); }}
          className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center hover:bg-gray-300">
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <button onClick={handlePreview}
            className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
            {previewPlaying
              ? <div className="flex gap-0.5"><div className="w-1 h-3 bg-white rounded" /><div className="w-1 h-3 bg-white rounded" /></div>
              : <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-white ml-0.5" />
            }
          </button>
          <div className="flex-1 h-8 flex items-center">
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${previewProgress}%` }} />
            </div>
          </div>
          <span className="text-sm font-mono text-gray-500 min-w-[40px]">{formatDuration(duration)}</span>
        </div>
        <button onClick={handleSend}
          className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg">
          <Send className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-200 dark:border-blue-800">
      {!isRecording && initializing && (
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        </div>
      )}
      {isRecording && (
        <>
          <button onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg">
            <Square className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-10 flex items-center gap-px overflow-hidden">
              {waveformData.map((v, i) => (
                <div key={i} className="w-[3px] bg-red-400 dark:bg-red-500 rounded-full flex-shrink-0 transition-all"
                  style={{ height: `${Math.max(4, v * 36)}px` }} />
              ))}
            </div>
            <span className="text-sm font-mono text-red-500 font-medium min-w-[40px]">{formatDuration(duration)}</span>
          </div>
        </>
      )}
      <button onClick={() => { cleanup(); onCancel(); }}
        className="p-2 rounded text-gray-400 hover:text-gray-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
