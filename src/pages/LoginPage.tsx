import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, LogIn, ArrowRight, Play, Check, MessageSquare, Circle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTutorialStore } from '@/store/tutorialStore';
import FormInput from '@/components/common/FormInput';
import PreLoginTutorial from '@/components/tutorial/PreLoginTutorial';

/* ─── UAV (Drone) Animation ─────────────────────────────────── */
function UAVAnimation() {
  const [scanLine, setScanLine] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setScanLine(s => (s + 1) % 100), 30);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
        animate={{ top: `${scanLine}%` }}
        transition={{ duration: 0.03, ease: 'linear' }}
      />

      {/* Orbiting ring 1 */}
      <motion.div
        className="absolute w-64 h-64 rounded-full border border-white/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-400/60 rounded-full shadow-lg shadow-cyan-400/30" />
      </motion.div>

      {/* Orbiting ring 2 */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border border-white/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-blue-400/60 rounded-full shadow-lg shadow-blue-400/30" />
      </motion.div>

      {/* UAV Drone SVG */}
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, scale: 0.5, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1, type: 'spring', damping: 15 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body */}
            <rect x="52" y="55" width="36" height="18" rx="6" fill="url(#bodyGrad)" />
            <rect x="54" y="57" width="32" height="14" rx="5" fill="#1e3a5f" opacity="0.5" />

            {/* Camera lens */}
            <circle cx="70" cy="68" r="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <motion.circle
              cx="70" cy="68" r="2"
              fill="#38bdf8"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Arms */}
            <line x1="52" y1="60" x2="30" y2="48" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="88" y1="60" x2="110" y2="48" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="52" y1="68" x2="30" y2="80" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
            <line x1="88" y1="68" x2="110" y2="80" stroke="#475569" strokeWidth="3" strokeLinecap="round" />

            {/* Propellers */}
            {[[30, 48], [110, 48], [30, 80], [110, 80]].map(([x, y], i) => (
              <motion.g key={i} animate={{ rotate: 360 }} transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: `${x}px ${y}px` }}>
                <ellipse cx={x} cy={y} rx="12" ry="2.5" fill="rgba(148,163,184,0.4)" />
              </motion.g>
            ))}

            {/* Propeller hubs */}
            {[[30, 48], [110, 48], [30, 80], [110, 80]].map(([x, y], i) => (
              <circle key={`h${i}`} cx={x} cy={y} r="3" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
            ))}

            {/* Landing skids */}
            <line x1="58" y1="73" x2="55" y2="82" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            <line x1="82" y1="73" x2="85" y2="82" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
            <line x1="52" y1="82" x2="88" y2="82" stroke="#475569" strokeWidth="2" strokeLinecap="round" />

            {/* Status LEDs */}
            <motion.circle cx="55" cy="58" r="1.5" fill="#22c55e"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.circle cx="85" cy="58" r="1.5" fill="#ef4444"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            />

            <defs>
              <linearGradient id="bodyGrad" x1="52" y1="55" x2="88" y2="73" gradientUnits="userSpaceOnUse">
                <stop stopColor="#334155" />
                <stop offset="1" stopColor="#1e293b" />
              </linearGradient>
            </defs>
          </svg>

          {/* Scan beam */}
          <motion.div
            className="absolute top-full left-1/2 -translate-x-1/2"
            animate={{ opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-px h-16 bg-gradient-to-b from-cyan-400/60 to-transparent mx-auto" />
            <div className="w-24 h-24 rounded-full border border-cyan-400/10 -mt-4 mx-auto" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating data nodes */}
      {[
        { x: '15%', y: '20%', delay: 0.8, color: 'bg-cyan-400' },
        { x: '80%', y: '25%', delay: 1.2, color: 'bg-blue-400' },
        { x: '20%', y: '75%', delay: 1.6, color: 'bg-indigo-400' },
        { x: '75%', y: '70%', delay: 2.0, color: 'bg-violet-400' },
      ].map((node, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: node.x, top: node.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: node.delay, duration: 0.5, type: 'spring' }}
        >
          <motion.div
            animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          >
            <div className={`w-2 h-2 ${node.color} rounded-full shadow-lg`} />
            <div className={`w-8 h-8 ${node.color}/10 rounded-full -mt-5 -ml-3`} />
          </motion.div>
        </motion.div>
      ))}

      {/* Connection lines (decorative) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.06]">
        <motion.line x1="15%" y1="20%" x2="50%" y2="50%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        />
        <motion.line x1="80%" y1="25%" x2="50%" y2="50%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        />
        <motion.line x1="20%" y1="75%" x2="50%" y2="50%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 2 }}
        />
        <motion.line x1="75%" y1="70%" x2="50%" y2="50%" stroke="white" strokeWidth="0.5" strokeDasharray="4 4"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: 2.5 }}
        />
      </svg>
    </div>
  );
}

/* ─── Chat Animation ────────────────────────────────────────── */
function ChatAnimation() {
  const [step, setStep] = useState(0);
  const messages = [
    { name: 'Sarah', text: 'Designs are ready for review', color: 'bg-violet-500' },
    { name: 'James', text: "Great! I'll check them now", color: 'bg-blue-500' },
    { name: 'Sarah', text: 'Also updated the task board', color: 'bg-violet-500' },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % (messages.length + 1)), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-2">
      {messages.slice(0, step).map((msg, i) => (
        <motion.div key={i} className="flex items-start gap-2"
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div className={`w-6 h-6 rounded-full ${msg.color} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white text-[9px] font-bold">{msg.name[0]}</span>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl rounded-tl-sm px-3 py-1.5 max-w-[200px]">
            <p className="text-white/90 text-[11px]">{msg.text}</p>
          </div>
        </motion.div>
      ))}
      {step < messages.length && (
        <motion.div className="flex items-center gap-1.5 ml-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-1 bg-white/10 rounded-full px-2.5 py-1">
            {[0, 0.2, 0.4].map((d, i) => (
              <motion.span key={i} className="w-1.5 h-1.5 bg-white/60 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: d }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ─── Kanban Animation ──────────────────────────────────────── */
function KanbanAnimation() {
  const [activeCol, setActiveCol] = useState(0);
  const columns = ['To Do', 'In Progress', 'Done'];
  const tasks = [
    { title: 'Landing page', tag: 'Design', tagColor: 'bg-violet-400' },
    { title: 'API integration', tag: 'Dev', tagColor: 'bg-blue-400' },
    { title: 'User auth', tag: 'Backend', tagColor: 'bg-emerald-400' },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveCol(c => (c + 1) % 3), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex gap-2">
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">{col}</div>
          <div className="space-y-1.5">
            {tasks.map((task, ti) => {
              const isActive = ci === activeCol && ti === 0;
              return (
                <motion.div key={ti}
                  className={`bg-white/10 backdrop-blur-sm rounded-lg p-2 border ${isActive ? 'border-white/30' : 'border-white/5'}`}
                  animate={isActive ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <p className="text-white/90 text-[10px] font-medium truncate">{task.title}</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 ${task.tagColor} rounded text-[8px] text-white font-medium`}>{task.tag}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Task Check Animation ──────────────────────────────────── */
function TaskCheckAnimation() {
  const [checked, setChecked] = useState(-1);
  const tasks = ['Set up project repository', 'Design database schema', 'Build authentication flow', 'Create dashboard UI'];

  useEffect(() => {
    const t = setInterval(() => setChecked(c => (c + 1) % (tasks.length + 1)), 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-1.5">
      {tasks.map((task, i) => (
        <motion.div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5"
          initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${i < checked ? 'bg-emerald-500' : 'border border-white/20'}`}>
            {i < checked && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
                <Check className="w-2.5 h-2.5 text-white" />
              </motion.div>
            )}
          </div>
          <span className={`text-[10px] ${i < checked ? 'text-white/50 line-through' : 'text-white/80'}`}>{task}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Presence Animation ────────────────────────────────────── */
function PresenceAnimation() {
  const [online, setOnline] = useState([false, false, false, false]);
  const names = ['Alex', 'Maria', 'Tom', 'Lisa'];
  const colors = ['bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      setOnline(prev => { const n = [...prev]; n[i % 4] = true; return n; });
      i++;
    }, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-1.5">
      {names.map((name, i) => (
        <motion.div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5"
          initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className={`w-5 h-5 rounded-full ${colors[i]} flex items-center justify-center`}>
            <span className="text-white text-[8px] font-bold">{name[0]}</span>
          </div>
          <span className="text-[10px] text-white/80 flex-1">{name}</span>
          {online[i] && (
            <motion.div className="w-2 h-2 rounded-full bg-emerald-400"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Features ──────────────────────────────────────────────── */
const features = [
  { icon: MessageSquare, text: 'Real-time team chat with channels & DMs' },
  { icon: Circle, text: 'Kanban boards with drag-and-drop' },
  { icon: Circle, text: 'Project management & analytics' },
  { icon: Circle, text: 'File sharing & voice notes' },
];

/* ─── Main Login Page ───────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const startTutorial = useTutorialStore((s) => s.startTutorial);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveDemo(d => (d + 1) % 4), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter your username and password'); return; }
    setLoading(true);
    setError('');
    try { await login(username, password); navigate('/dashboard'); }
    catch (err: any) { setError(err.message || 'Authentication failed'); }
    finally { setLoading(false); }
  };

  const demos = [
    { label: 'Chat', component: <ChatAnimation /> },
    { label: 'Kanban', component: <KanbanAnimation /> },
    { label: 'Tasks', component: <TaskCheckAnimation /> },
    { label: 'Team', component: <PresenceAnimation /> },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left panel — UAV showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-[#0d1f3c]">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Gradient orbs */}
        <div className="absolute top-16 left-16 w-80 h-80 bg-cyan-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-16 right-16 w-72 h-72 bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px]" />

        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-14 w-full">
          {/* Brand */}
          <motion.div
            className="flex items-center gap-3 mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-white text-lg font-bold tracking-tight">ST</span>
            </div>
            <div>
              <span className="text-white/90 text-lg font-semibold tracking-tight">SokoTeams</span>
              <div className="text-[10px] text-cyan-400/50 font-medium tracking-widest uppercase">Enterprise Platform</div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-3">
              Where teams
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">get things done</span>
            </h1>
            <p className="text-blue-200/40 text-base mb-8 max-w-md leading-relaxed">
              Project management, real-time chat, and collaboration — all in one workspace.
            </p>
          </motion.div>

          {/* UAV Animation Area */}
          <motion.div
            className="mb-8 h-64"
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <UAVAnimation />
          </motion.div>

          {/* Feature list */}
          <motion.div
            className="flex flex-wrap gap-x-5 gap-y-2 mb-6"
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
          >
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-blue-200/30">
                <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
                <span className="text-[11px]">{f.text}</span>
              </div>
            ))}
          </motion.div>

          {/* Tour button */}
          <motion.button
            onClick={() => startTutorial()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm font-medium backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all w-fit"
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-3.5 h-3.5" />
            Take a tour
          </motion.button>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/25"
              initial={{ scale: 0, rotate: -180 }}
              animate={mounted ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            >
              <span className="text-white text-xl font-bold">ST</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">SokoTeams</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 tracking-widest uppercase font-medium">Enterprise Platform</p>
          </div>

          <div className="text-center mb-7">
            <motion.h2
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
            >
              Welcome back
            </motion.h2>
            <motion.p
              className="text-sm text-gray-500 dark:text-gray-400 mt-1.5"
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 0.4 }}
            >
              Sign in to your workspace
            </motion.p>
          </div>

          <motion.div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5 }}>
                <FormInput label="Username" id="username" value={username} onChange={setUsername} placeholder="Enter your username" required autoComplete="username" />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.6 }}>
                <FormInput label="Password" id="password" type="password" value={password} onChange={setPassword} placeholder="Enter your password" required autoComplete="current-password" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.7 }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign in
                    </>
                  )}
                </button>
              </motion.div>
            </form>

            <motion.p
              className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={mounted ? { opacity: 1 } : {}}
              transition={{ delay: 0.8 }}
            >
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 group">
                Create one
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.p>
          </motion.div>

          <motion.p
            className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500"
            initial={{ opacity: 0 }}
            animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.9 }}
          >
            &copy; {new Date().getFullYear()} SokoTeams. All rights reserved.
          </motion.p>
        </motion.div>
      </div>

      <PreLoginTutorial />
    </div>
  );
}
