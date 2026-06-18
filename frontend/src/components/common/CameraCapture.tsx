import { useState, useRef, useEffect } from 'react';
import { X, Camera, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
}

export default function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const SIZE = 512;

  const startCamera = async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1024 }, height: { ideal: 1024 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCaptured(null);
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [facingMode]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const minDim = Math.min(vw, vh);
    const sx = (vw - minDim) / 2;
    const sy = (vh - minDim) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    if (facingMode === 'user') {
      ctx.translate(SIZE, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, SIZE, SIZE);
    ctx.restore();
    const dataUrl = canvas.toDataURL('image/png');
    setCaptured(dataUrl);
  };

  const handleConfirm = async () => {
    if (!captured) return;
    const res = await fetch(captured);
    const blob = await res.blob();
    onCapture(blob);
  };

  const handleRetake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  const handleFlip = () => {
    setFacingMode(f => f === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Take Photo</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative bg-black flex justify-center items-center" style={{ height: 300 }}>
          {error ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <Camera className="w-10 h-10 text-gray-500" />
              <p className="text-sm text-gray-400">{error}</p>
            </div>
          ) : captured ? (
            <img src={captured} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
            />
          )}
          {!captured && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full border-2 border-white/40" />
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center justify-center gap-4 px-4 py-4">
          {captured ? (
            <>
              <button
                onClick={handleRetake}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                Use Photo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleFlip}
                disabled={!!error}
                className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                title="Flip camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={handleCapture}
                disabled={!!error}
                className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors flex items-center justify-center disabled:opacity-40"
              >
                <div className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 transition-colors" />
              </button>
              <div className="w-11" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
