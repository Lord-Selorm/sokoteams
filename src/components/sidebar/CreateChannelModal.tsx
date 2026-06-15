import { useState, useEffect, useRef } from 'react';
import { X, Hash, Lock, Globe, ArrowRight, CheckCircle2, Check, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/lib/utils';

const CHANNEL_COLORS = [
  { name: 'Purple', value: '#7c3aed', bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-600' },
  { name: 'Blue', value: '#2563eb', bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-600' },
  { name: 'Teal', value: '#0d9488', bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-600' },
  { name: 'Green', value: '#16a34a', bg: 'bg-green-500', light: 'bg-green-100', text: 'text-green-600' },
  { name: 'Amber', value: '#d97706', bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-600' },
  { name: 'Orange', value: '#ea580c', bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-600' },
  { name: 'Red', value: '#dc2626', bg: 'bg-red-500', light: 'bg-red-100', text: 'text-red-600' },
  { name: 'Pink', value: '#db2777', bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-600' },
];

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channelId: string) => void;
}

export default function CreateChannelModal({ isOpen, onClose, onChannelCreated }: CreateChannelModalProps) {
  const { token } = useAuthStore();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [channelType, setChannelType] = useState<'public' | 'private'>('public');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(CHANNEL_COLORS[0]);
  const [avatarMode, setAvatarMode] = useState<'color' | 'upload'>('color');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('type');
      setChannelType('public');
      setName('');
      setDescription('');
      setSelectedColor(CHANNEL_COLORS[0]);
      setAvatarMode('color');
      setAvatarPreview('');
      setAvatarFile(null);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'details' && nameRef.current) nameRef.current.focus();
  }, [step]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarMode('upload');
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      let avatarUrl = selectedColor.value;

      if (avatarMode === 'upload' && avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadRes = await fetch(`${API_URL}/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          avatarUrl = uploadData.url || `/api/uploads/${uploadData.filename}`;
        }
      }

      const res = await fetch(`${API_URL}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          description: description.trim(),
          type: channelType,
          avatar: avatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create channel');
        setLoading(false);
        return;
      }

      const channel = await res.json();
      onChannelCreated(channel.id);
      onClose();
    } catch {
      setError('Failed to create channel');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* ── Step 1: Choose Type ── */}
        {step === 'type' && (
          <>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create a channel</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Channels are where your team communicates.</p>
            </div>

            <div className="px-6 pb-6 space-y-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Choose type</p>

              <button type="button" onClick={() => setChannelType('public')}
                className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                  channelType === 'public' ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', channelType === 'public' ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-gray-800')}>
                  <Globe className={cn('w-6 h-6', channelType === 'public' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold', channelType === 'public' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-gray-100')}>Public</span>
                    {channelType === 'public' && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Anyone can find and join</p>
                </div>
                <ArrowRight className={cn('w-4 h-4', channelType === 'public' ? 'text-purple-400' : 'text-gray-300 dark:text-gray-600')} />
              </button>

              <button type="button" onClick={() => setChannelType('private')}
                className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                  channelType === 'private' ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', channelType === 'private' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-gray-100 dark:bg-gray-800')}>
                  <Lock className={cn('w-6 h-6', channelType === 'private' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold', channelType === 'private' ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-gray-100')}>Private</span>
                    {channelType === 'private' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Only invited members can join</p>
                </div>
                <ArrowRight className={cn('w-4 h-4', channelType === 'private' ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600')} />
              </button>
            </div>

            <div className="px-6 pb-6">
              <button onClick={() => setStep('details')}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 shadow-sm transition-all">
                Continue
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Details + Avatar ── */}
        {step === 'details' && (
          <form onSubmit={handleSubmit}>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Channel details</h2>
                <button onClick={onClose} type="button" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button type="button" onClick={() => setStep('type')} className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">← Back</button>
                <span className="text-xs text-gray-400">•</span>
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md',
                  channelType === 'public' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                )}>
                  {channelType === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {channelType === 'public' ? 'Public' : 'Private'}
                </span>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">{error}</div>
              )}

              {/* Channel Avatar / Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Channel Icon</label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="relative flex-shrink-0">
                    {avatarMode === 'upload' && avatarPreview ? (
                      <img src={avatarPreview} alt="" className="w-16 h-16 rounded-2xl object-cover shadow-lg" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ backgroundColor: selectedColor.value }}>
                        {name.trim() ? name.trim().charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Camera className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Mode tabs */}
                    <div className="flex items-center gap-1 mb-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                      <button type="button" onClick={() => setAvatarMode('color')}
                        className={cn('flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', avatarMode === 'color' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                        Colors
                      </button>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className={cn('flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors', avatarMode === 'upload' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                        Upload
                      </button>
                    </div>

                    {/* Color grid */}
                    {avatarMode === 'color' && (
                      <div className="flex flex-wrap gap-2">
                        {CHANNEL_COLORS.map(color => (
                          <button key={color.value} type="button" onClick={() => setSelectedColor(color)}
                            className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all', color.bg, selectedColor.value === color.value ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110' : 'hover:scale-110')}
                            title={color.name}>
                            {selectedColor.value === color.value && <Check className="w-4 h-4 text-white" />}
                          </button>
                        ))}
                      </div>
                    )}

                    {avatarMode === 'upload' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {avatarFile ? (
                          <div className="flex items-center gap-2">
                            <span className="truncate">{avatarFile.name}</span>
                            <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(''); setAvatarMode('color'); }} className="text-red-500 hover:underline">Remove</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => fileRef.current?.click()} className="text-purple-600 dark:text-purple-400 hover:underline">Choose an image</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Channel Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channel name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    {channelType === 'public' ? <Hash className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </span>
                  <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={channelType === 'public' ? 'e.g. project-updates' : 'e.g. leadership-team'}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
                </div>
                {name.trim() && (
                  <p className="text-xs text-gray-400 mt-1.5">Channel will be <span className="font-medium text-gray-600 dark:text-gray-300">#{name.trim().toLowerCase().replace(/\s+/g, '-')}</span></p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" />
              </div>

              {/* Create */}
              <button type="submit" disabled={loading || !name.trim()}
                className={cn('w-full py-3 rounded-xl text-sm font-semibold transition-all',
                  name.trim() ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                )}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...
                  </span>
                ) : `Create ${channelType === 'public' ? 'Public' : 'Private'} Channel`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
