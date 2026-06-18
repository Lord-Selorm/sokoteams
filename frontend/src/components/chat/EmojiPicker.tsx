import { useState, useMemo, useRef, useEffect } from 'react';

const EMOJI_CATEGORIES = [
  { name: 'Frequently Used', emojis: ['👍', '❤️', '🔥', '🎉', '🚀', '✅', '😂', '💯', '👀', '🙌', '💪', '🤔', '👏', '😍', '🥳', '😎'] },
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'] },
  { name: 'Gestures', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '💪'] },
  { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'] },
  { name: 'Objects', emojis: ['🔥', '⭐', '🌟', '💫', '✨', '⚡', '☀️', '🌤️', '🌈', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎯', '💰', '💎', '🔮', '🔧', '🔨', '🛠️', '📌', '📍', '📎', '🔗', '🔒', '🔑'] },
  { name: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺'] },
  { name: 'Food', emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🍰', '🎂', '☕', '🍵', '🥤', '🍺', '🍷'] },
  { name: 'Activities', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🥊', '🥋', '🎯', '⛳', '🎮', '🎲', '🎭', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎹', '🥁', '🎸', '🎺', '🎻'] },
  { name: 'Flags', emojis: ['🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇨🇦', '🇦🇺', '🇮🇹', '🇪🇸', '🇲🇽', '🇷🇺'] },
  { name: 'Symbols', emojis: ['✅', '❌', '⭕', '❗', '❓', '‼️', '⁉️', '💯', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '💲', '♻️', '🔒', '🔓', '⚠️', '🚫', '🔔', '🎵', '🎶', '▶️', '⏸️', '⏹️', '⏺️', '⏩', '⏪'] },
];

const GIF_CATEGORIES = [
  {
    name: 'Reactions',
    gifs: [
      { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', alt: 'Thumbs Up' },
      { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', alt: 'LOL' },
      { url: 'https://media.giphy.com/media/3oEjI6SII9dNwlhb9W/giphy.gif', alt: 'Mind Blown' },
      { url: 'https://media.giphy.com/media/26ufdipQqU2hNA4Gq/giphy.gif', alt: 'Applause' },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', alt: 'Celebration' },
      { url: 'https://media.giphy.com/media/3o7aCTfyhYawMw0BVu/giphy.gif', alt: 'Eye Roll' },
      { url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', alt: 'Facepalm' },
      { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', alt: 'Yes' },
      { url: 'https://media.giphy.com/media/l4pTdcifPZLpDjSB2/giphy.gif', alt: 'Nope' },
      { url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', alt: 'No' },
      { url: 'https://media.giphy.com/media/3o7aCTfyhYawMw0BVu/giphy.gif', alt: 'Meh' },
      { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', alt: 'Haha' },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', alt: 'Yay' },
      { url: 'https://media.giphy.com/media/3oEjI6SII9dNwlhb9W/giphy.gif', alt: 'Wow' },
      { url: 'https://media.giphy.com/media/26ufdipQqU2hNA4Gq/giphy.gif', alt: 'Nice' },
    ],
  },
  {
    name: 'Emotions',
    gifs: [
      { url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', alt: 'Crying' },
      { url: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif', alt: 'Angry' },
      { url: 'https://media.giphy.com/media/l4FGI2HnlKvO3Cqmc/giphy.gif', alt: 'Confused' },
      { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', alt: 'Sad' },
      { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', alt: 'Scared' },
      { url: 'https://media.giphy.com/media/l4FGI2HnlKvO3Cqmc/giphy.gif', alt: 'Thinking' },
      { url: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif', alt: 'Shocked' },
      { url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', alt: 'Tears' },
      { url: 'https://media.giphy.com/media/l4MYGb1LuZ3n7dRnO/giphy.gif', alt: 'Disappointed' },
      { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', alt: 'Nervous' },
    ],
  },
  {
    name: 'Celebrations',
    gifs: [
      { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', alt: 'Party' },
      { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', alt: 'Confetti' },
      { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', alt: 'Cheers' },
      { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', alt: 'Fireworks' },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', alt: 'Dance' },
      { url: 'https://media.giphy.com/media/26ufdipQqU2hNA4Gq/giphy.gif', alt: 'Trophy' },
      { url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', alt: 'Winner' },
      { url: 'https://media.giphy.com/media/3oEjI6SII9dNwlhb9W/giphy.gif', alt: 'Party Popper' },
    ],
  },
  {
    name: 'Work',
    gifs: [
      { url: 'https://media.giphy.com/media/l4FGI2HnlKvO3Cqmc/giphy.gif', alt: 'Typing' },
      { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', alt: 'Coffee' },
      { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', alt: 'High Five' },
      { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', alt: 'Deadline' },
      { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', alt: 'Working' },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', alt: 'Done' },
    ],
  },
];

const STICKER_CATEGORIES = [
  {
    name: 'Animals',
    stickers: [
      { url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', alt: 'Cat Hello' },
      { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', alt: 'Cat Heart Eyes' },
      { url: 'https://media.giphy.com/media/pcfdfm6hjTvji/giphy.gif', alt: 'Dog Dance' },
      { url: 'https://media.giphy.com/media/nR4L10XlJcSeQ/giphy.gif', alt: 'Dog Thumbs Up' },
      { url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', alt: 'Cat Laugh' },
      { url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', alt: 'Panda Happy' },
      { url: 'https://media.giphy.com/media/l4FGI2HnlKvO3Cqmc/giphy.gif', alt: 'Penguin Wave' },
      { url: 'https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif', alt: 'Raccoon' },
    ],
  },
  {
    name: 'Cute',
    stickers: [
      { url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', alt: 'Bear Love' },
      { url: 'https://media.giphy.com/media/3oEjI6SII9dNwlhb9W/giphy.gif', alt: 'Unicorn' },
      { url: 'https://media.giphy.com/media/26ufdipQqU2hNA4Gq/giphy.gif', alt: 'Rainbow' },
      { url: 'https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif', alt: 'Star' },
      { url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', alt: 'Heart' },
      { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', alt: 'Flower' },
    ],
  },
  {
    name: 'Funny',
    stickers: [
      { url: 'https://media.giphy.com/media/3o7aCTfyhYawMw0BVu/giphy.gif', alt: 'LOL' },
      { url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', alt: 'Haha' },
      { url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', alt: 'Facepalm' },
      { url: 'https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif', alt: 'Shrug' },
      { url: 'https://media.giphy.com/media/l4FGI2HnlKvO3Cqmc/giphy.gif', alt: 'Troll' },
      { url: 'https://media.giphy.com/media/l4MYGb1LuZ3n7dRnO/giphy.gif', alt: 'Nerd' },
    ],
  },
  {
    name: 'Emotions',
    stickers: [
      { url: 'https://media.giphy.com/media/pcfdfm6hjTvji/giphy.gif', alt: 'Love Eyes' },
      { url: 'https://media.giphy.com/media/nR4L10XlJcSeQ/giphy.gif', alt: 'Blowing Kiss' },
      { url: 'https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif', alt: 'Wink' },
      { url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif', alt: 'Cool' },
      { url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', alt: 'Sleepy' },
      { url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', alt: 'Surprised' },
    ],
  },
];

type PickerTab = 'emoji' | 'gifs' | 'stickers';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: 'top' | 'bottom';
}

export default function EmojiPicker({ onSelect, onClose, position = 'top' }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('emoji');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeGifCategory, setActiveGifCategory] = useState(0);
  const [activeStickerCategory, setActiveStickerCategory] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredCategories = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES;
    const q = search.toLowerCase();
    return EMOJI_CATEGORIES.map(cat => ({
      ...cat,
      emojis: cat.emojis.filter(e => e.includes(q)),
    })).filter(cat => cat.emojis.length > 0);
  }, [search]);

  const filteredGifs = useMemo(() => {
    if (!search) return GIF_CATEGORIES[activeGifCategory]?.gifs || [];
    const q = search.toLowerCase();
    return GIF_CATEGORIES.flatMap(c => c.gifs).filter(g => g.alt.toLowerCase().includes(q));
  }, [search, activeGifCategory]);

  const filteredStickers = useMemo(() => {
    if (!search) return STICKER_CATEGORIES[activeStickerCategory]?.stickers || [];
    const q = search.toLowerCase();
    return STICKER_CATEGORIES.flatMap(c => c.stickers).filter(s => s.alt.toLowerCase().includes(q));
  }, [search, activeStickerCategory]);

  const handleGifSelect = (url: string, alt: string) => {
    onSelect(`[GIF:${alt}:${url}]`);
    onClose();
  };

  const handleStickerSelect = (url: string, alt: string) => {
    onSelect(`[STICKER:${alt}:${url}]`);
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden`}
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-700">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeTab === 'emoji' ? 'emoji' : activeTab === 'gifs' ? 'GIFs' : 'stickers'}...`}
          className="w-full px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700">
        {([
          { id: 'emoji' as const, label: '😊', title: 'Emoji' },
          { id: 'gifs' as const, label: 'GIF', title: 'GIFs' },
          { id: 'stickers' as const, label: '🎨', title: 'Stickers' },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title={tab.title}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Emoji Tab */}
      {activeTab === 'emoji' && (
        <>
          <div className="flex gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(i)}
                className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                  activeCategory === i
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredCategories.map((cat, ci) => (
              <div key={cat.name} className="mb-2">
                <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1">
                  {cat.name}
                </div>
                <div className="grid grid-cols-8 gap-0.5">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onSelect(emoji); onClose(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-transform hover:scale-125"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* GIFs Tab */}
      {activeTab === 'gifs' && (
        <>
          <div className="flex gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {GIF_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveGifCategory(i)}
                className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                  activeGifCategory === i
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-1">
              {filteredGifs.map((gif, i) => (
                <button
                  key={`${gif.url}-${i}`}
                  onClick={() => handleGifSelect(gif.url, gif.alt)}
                  className="relative rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all group"
                >
                  <img src={gif.url} alt={gif.alt} className="w-full h-24 object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end">
                    <span className="text-[10px] text-white font-medium px-1.5 pb-1 opacity-0 group-hover:opacity-100 transition-opacity truncate w-full text-left">
                      {gif.alt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {filteredGifs.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-8">No GIFs found</p>
            )}
          </div>
        </>
      )}

      {/* Stickers Tab */}
      {activeTab === 'stickers' && (
        <>
          <div className="flex gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {STICKER_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveStickerCategory(i)}
                className={`px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                  activeStickerCategory === i
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            <div className="grid grid-cols-3 gap-1">
              {filteredStickers.map((sticker, i) => (
                <button
                  key={`${sticker.url}-${i}`}
                  onClick={() => handleStickerSelect(sticker.url, sticker.alt)}
                  className="relative rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all p-1 bg-gray-50 dark:bg-gray-800"
                >
                  <img src={sticker.url} alt={sticker.alt} className="w-full h-20 object-contain" loading="lazy" />
                </button>
              ))}
            </div>
            {filteredStickers.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-8">No stickers found</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
