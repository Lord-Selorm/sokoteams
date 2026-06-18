import { useState, useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const SIZE = 280;
  const OUTPUT_SIZE = 512;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const minDim = Math.min(img.width, img.height);
      const initialZoom = (SIZE * 0.85) / minDim;
      setZoom(initialZoom);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const drawW = img.width * zoom;
    const drawH = img.height * zoom;
    const dx = cx - drawW / 2 + offset.x;
    const dy = cy - drawH / 2 + offset.y;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
  };

  const handlePointerUp = () => setDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(Math.max(z * delta, 0.3), 5));
  };

  const handleReset = () => {
    const img = imgRef.current;
    if (!img) return;
    const minDim = Math.min(img.width, img.height);
    setZoom((SIZE * 0.85) / minDim);
    setOffset({ x: 0, y: 0 });
  };

  const handleCrop = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const out = document.createElement('canvas');
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    const cx = OUTPUT_SIZE / 2;
    const cy = OUTPUT_SIZE / 2;
    const scale = OUTPUT_SIZE / SIZE;
    const drawW = img.width * zoom * scale;
    const drawH = img.height * zoom * scale;
    const dx = cx - drawW / 2 + offset.x * scale;
    const dy = cy - drawH / 2 + offset.y * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, drawW, drawH);
    out.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Crop Photo</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-center py-6">
          <div
            ref={containerRef}
            className="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
            style={{ width: SIZE, height: SIZE, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas ref={canvasRef} width={SIZE} height={SIZE} className="rounded-full" />
            <div className="absolute inset-0 rounded-full border-4 border-white/30 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-4 pb-4">
          <button
            onClick={() => setZoom(z => Math.min(z * 1.2, 5))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={30}
            max={500}
            value={zoom * 100}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-32 accent-blue-600"
          />
          <button
            onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Check className="w-4 h-4" />
            Choose
          </button>
        </div>
      </div>
    </div>
  );
}
