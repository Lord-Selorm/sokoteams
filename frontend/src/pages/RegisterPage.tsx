import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, UserPlus, Shield, Check, ArrowRight, Play, BarChart3, Users, FolderKanban } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTutorialStore } from '@/store/tutorialStore';
import FormInput from '@/components/common/FormInput';
import PreLoginTutorial from '@/components/tutorial/PreLoginTutorial';

/* ─── UAV Mini Animation (for register left panel) ──────────── */
function UAVMiniAnimation() {
  const [scanLine, setScanLine] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScanLine(s => (s + 1) % 100), 30);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      <motion.div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
        animate={{ top: `${scanLine}%` }}
        transition={{ duration: 0.03, ease: 'linear' }}
      />

      {/* Orbiting rings */}
      <motion.div className="absolute w-56 h-56 rounded-full border border-white/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-violet-400/60 rounded-full shadow-lg shadow-violet-400/30" />
      </motion.div>

      <motion.div className="absolute w-40 h-40 rounded-full border border-white/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 bg-indigo-400/60 rounded-full shadow-lg shadow-indigo-400/30" />
      </motion.div>

      {/* Mini drone */}
      <motion.div className="relative z-10"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 1, type: 'spring', damping: 15 }}
      >
        <motion.div animate={{ y: [0, -5, 0, 3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          <svg width="100" height="100" viewBox="0 0 140 140" fill="none">
            <rect x="52" y="55" width="36" height="18" rx="6" fill="url(#rg)" />
            <rect x="54" y="57" width="32" height="14" rx="5" fill="#1a1040" opacity="0.5" />
            <circle cx="70" cy="68" r="4" fill="#0f0a2a" stroke="#a78bfa" strokeWidth="1.5" />
            <motion.circle cx="70" cy="68" r="2" fill="#a78bfa" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
            <line x1="52" y1="60" x2="30" y2="48" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
            <line x1="88" y1="60" x2="110" y2="48" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
            <line x1="52" y1="68" x2="30" y2="80" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
            <line x1="88" y1="68" x2="110" y2="80" stroke="#6d28d9" strokeWidth="3" strokeLinecap="round" />
            {[[30, 48], [110, 48], [30, 80], [110, 80]].map(([x, y], i) => (
              <motion.g key={i} animate={{ rotate: 360 }} transition={{ duration: 0.3, repeat: Infinity, ease: 'linear' }} style={{ transformOrigin: `${x}px ${y}px` }}>
                <ellipse cx={x} cy={y} rx="12" ry="2.5" fill="rgba(167,139,250,0.3)" />
              </motion.g>
            ))}
            {[[30, 48], [110, 48], [30, 80], [110, 80]].map(([x, y], i) => (
              <circle key={`h${i}`} cx={x} cy={y} r="3" fill="#7c3aed" stroke="#a78bfa" strokeWidth="1" />
            ))}
            <line x1="58" y1="73" x2="55" y2="82" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" />
            <line x1="82" y1="73" x2="85" y2="82" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" />
            <line x1="52" y1="82" x2="88" y2="82" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" />
            <motion.circle cx="55" cy="58" r="1.5" fill="#22c55e" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
            <motion.circle cx="85" cy="58" r="1.5" fill="#ef4444" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.5 }} />
            <defs>
              <linearGradient id="rg" x1="52" y1="55" x2="88" y2="73" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4c1d95" />
                <stop offset="1" stopColor="#1e1048" />
              </linearGradient>
            </defs>
          </svg>
          <motion.div className="absolute top-full left-1/2 -translate-x-1/2" animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 2, repeat: Infinity }}>
            <div className="w-px h-12 bg-gradient-to-b from-violet-400/60 to-transparent mx-auto" />
            <div className="w-20 h-20 rounded-full border border-violet-400/10 -mt-3 mx-auto" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Floating nodes */}
      {[
        { x: '18%', y: '22%', delay: 0.8, color: 'bg-violet-400' },
        { x: '78%', y: '28%', delay: 1.2, color: 'bg-indigo-400' },
        { x: '22%', y: '72%', delay: 1.6, color: 'bg-purple-400' },
        { x: '72%', y: '68%', delay: 2.0, color: 'bg-fuchsia-400' },
      ].map((node, i) => (
        <motion.div key={i} className="absolute" style={{ left: node.x, top: node.y }}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: node.delay, duration: 0.5, type: 'spring' }}
        >
          <motion.div animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          >
            <div className={`w-2 h-2 ${node.color} rounded-full shadow-lg`} />
            <div className={`w-8 h-8 ${node.color}/10 rounded-full -mt-5 -ml-3`} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Stats Animation ───────────────────────────────────────── */
function StatsAnimation() {
  const [count, setCount] = useState(0);
  const stats = [
    { label: 'Projects', value: 12, icon: FolderKanban, color: 'text-blue-400' },
    { label: 'Team Members', value: 8, icon: Users, color: 'text-emerald-400' },
    { label: 'Tasks Completed', value: 156, icon: Check, color: 'text-violet-400' },
  ];

  useEffect(() => {
    const t = setInterval(() => setCount(c => (c + 1) % 4), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div key={i}
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2, type: 'spring', damping: 20 }}
          >
            <div className={`w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center ${stat.color}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-white/40 font-medium">{stat.label}</p>
              <motion.p className="text-lg font-bold text-white" key={count}
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {stat.value}
              </motion.p>
            </div>
            {i === count && (
              <motion.div className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 0.4 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Role Animation ────────────────────────────────────────── */
function RoleAnimation() {
  const [active, setActive] = useState(0);
  const roles = [
    { role: 'Admin', desc: 'Full access', color: 'bg-rose-500', perms: ['Create projects', 'Manage users'] },
    { role: 'User', desc: 'Standard access', color: 'bg-blue-500', perms: ['View projects', 'Update tasks'] },
    { role: 'Guest', desc: 'Read-only', color: 'bg-amber-500', perms: ['View projects', 'Read-only'] },
  ];

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % 3), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-2">
      {roles.map((r, i) => (
        <motion.div key={i}
          className={`rounded-xl p-3 border transition-all ${i === active ? 'bg-white/10 border-white/20' : 'bg-white/3 border-white/5'}`}
          animate={i === active ? { scale: 1.02 } : { scale: 1 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`w-6 h-6 rounded-full ${r.color} flex items-center justify-center`}>
              <span className="text-white text-[8px] font-bold">{r.role[0]}</span>
            </div>
            <span className="text-[11px] font-semibold text-white">{r.role}</span>
            <span className="text-[9px] text-white/40">{r.desc}</span>
          </div>
          <div className="flex gap-1.5 ml-8">
            {r.perms.map((p, pi) => (
              <span key={pi} className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-white/50">{p}</span>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Onboarding Animation ──────────────────────────────────── */
function OnboardingAnimation() {
  const [step, setStep] = useState(0);
  const steps = [
    { label: 'Create account', done: true },
    { label: 'Set up profile', done: true },
    { label: 'Join workspace', done: false },
    { label: 'Start collaborating', done: false },
  ];

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % (steps.length + 1)), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-white/10" />
      <div className="space-y-3">
        {steps.map((s, i) => (
          <motion.div key={i} className="flex items-center gap-3 relative"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors ${
              i < step ? 'bg-emerald-500' : i === step ? 'bg-blue-500 ring-4 ring-blue-500/20' : 'bg-white/10'
            }`}>
              {i < step ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              ) : i === step ? (
                <motion.div className="w-2 h-2 bg-white rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              ) : (
                <span className="text-[9px] text-white/40 font-medium">{i + 1}</span>
              )}
            </div>
            <span className={`text-[11px] font-medium ${i <= step ? 'text-white/80' : 'text-white/30'}`}>{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Benefits ──────────────────────────────────────────────── */
const benefits = [
  'Create unlimited projects & tasks',
  'Real-time team collaboration',
  'Analytics & performance insights',
  'File sharing & voice messages',
];

/* ─── Main Register Page ────────────────────────────────────── */
export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const startTutorial = useTutorialStore((s) => s.startTutorial);

  const [formData, setFormData] = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const t = setInterval(() => setActiveDemo(d => (d + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(formData.username, formData.password, formData.fullName, formData.email, formData.department);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err: any) { setError(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <motion.div className="w-full max-w-sm text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <motion.div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
          >
            <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <motion.h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Welcome to SokoTeams!
          </motion.h1>
          <motion.p className="text-sm text-gray-500 dark:text-gray-400 mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Account created for <span className="font-medium text-gray-700 dark:text-gray-300">{formData.fullName}</span>. Redirecting...
          </motion.p>
          <motion.div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          />
        </motion.div>
      </div>
    );
  }

  const demos = [
    { label: 'Stats', component: <StatsAnimation /> },
    { label: 'Roles', component: <RoleAnimation /> },
    { label: 'Onboarding', component: <OnboardingAnimation /> },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left panel — UAV showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0f0a28] to-[#1a0d3c]">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        <div className="absolute top-16 left-16 w-80 h-80 bg-violet-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-16 right-16 w-72 h-72 bg-indigo-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-[140px]" />

        <div className="relative z-10 flex flex-col justify-center px-10 xl:px-14 w-full">
          {/* Brand */}
          <motion.div className="flex items-center gap-3 mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-white text-lg font-bold tracking-tight">ST</span>
            </div>
            <div>
              <span className="text-white/90 text-lg font-semibold tracking-tight">SokoTeams</span>
              <div className="text-[10px] text-violet-400/50 font-medium tracking-widest uppercase">Enterprise Platform</div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.7 }}>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-3">
              Start building
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">with your team</span>
            </h1>
            <p className="text-violet-200/40 text-base mb-8 max-w-md leading-relaxed">
              Create your workspace, invite your team, and start shipping faster.
            </p>
          </motion.div>

          {/* UAV Animation */}
          <motion.div className="mb-8 h-56"
            initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <UAVMiniAnimation />
          </motion.div>

          {/* Benefits */}
          <motion.div className="flex flex-wrap gap-x-5 gap-y-2 mb-6"
            initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.7 }}
          >
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-violet-200/30">
                <div className="w-1 h-1 rounded-full bg-violet-400/50" />
                <span className="text-[11px]">{b}</span>
              </div>
            ))}
          </motion.div>

          <motion.button onClick={() => startTutorial()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-sm font-medium backdrop-blur-sm border border-white/5 hover:border-white/10 transition-all w-fit"
            initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}}
            transition={{ delay: 0.9 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          >
            <Play className="w-3.5 h-3.5" />
            Take a tour
          </motion.button>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8">
        <motion.div className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={mounted ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <motion.div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4 shadow-lg shadow-violet-500/25"
              initial={{ scale: 0, rotate: -180 }}
              animate={mounted ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
            >
              <span className="text-white text-xl font-bold">ST</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">SokoTeams</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 tracking-widest uppercase font-medium">Enterprise Platform</p>
          </div>

          <div className="text-center mb-5">
            <motion.h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100"
              initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ delay: 0.3 }}
            >
              Create your account
            </motion.h2>
            <motion.p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5"
              initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}
            >
              First user becomes workspace admin
            </motion.p>
          </div>

          <motion.div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm"
            initial={{ opacity: 0, y: 10 }} animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <AnimatePresence>
              {error && (
                <motion.div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                >
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-3">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.5 }}>
                <FormInput label="Full name" value={formData.fullName} onChange={v => update('fullName', v)} placeholder="John Doe" required />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.55 }}>
                <FormInput label="Email" type="email" value={formData.email} onChange={v => update('email', v)} placeholder="j.doe@company.com" required />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.6 }}>
                <FormInput label="Username" value={formData.username} onChange={v => update('username', v)} placeholder="johndoe" required />
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.65 }}>
                  <FormInput label="Password" type="password" value={formData.password} onChange={v => update('password', v)} placeholder="Min 6 chars" required minLength={6} />
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.7 }}>
                  <FormInput label="Confirm" type="password" value={formData.confirmPassword} onChange={v => update('confirmPassword', v)} placeholder="Re-enter" required />
                </motion.div>
              </div>

              <motion.div initial={{ opacity: 0, x: -10 }} animate={mounted ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.75 }}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select value={formData.department} onChange={e => update('department', e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Select department...</option>
                  {['Software', 'Full Stack', 'Design', 'Engineering', 'DevOps', 'QA', 'Product', 'Management'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </motion.div>

              <motion.div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2"
                initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ delay: 0.8 }}
              >
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  The first person to register becomes the workspace <strong>Admin</strong>.
                  Subsequent members are added as <strong>Users</strong>.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={mounted ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.85 }}>
                <button type="submit" disabled={loading}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create account
                    </>
                  )}
                </button>
              </motion.div>
            </form>

            <motion.p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ delay: 0.9 }}
            >
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 group">
                Sign in
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>

      <PreLoginTutorial />
    </div>
  );
}
