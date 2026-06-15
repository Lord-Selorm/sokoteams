import { useState, useEffect } from 'react';
import { Sun, Moon, Shield, Mail, ArrowLeft, Lock, Eye, EyeOff, UserX, Trash2, Bell, BellOff, Globe, Clock, Download, AlertTriangle, Check, ChevronRight, ShieldOff, Users, Activity } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import UserAvatar from '@/components/common/UserAvatar';
import { API_URL } from '@/lib/utils';

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('auth-store');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
}

function Section({ title, icon: Icon, iconColor, children, id }: { title: string; icon: typeof Shield; iconColor: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden scroll-mt-20">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className={`p-2 rounded-xl ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">{children}</div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} role="switch" aria-checked={checked}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

function InviteSection() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const { data: invites } = useQuery<any[]>({
    queryKey: ['invites'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/invites`, { headers: getAuthHeaders() });
      return r.ok ? r.json() : [];
    },
  });

  const handleSendInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`${API_URL}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      if (r.ok) {
        setSuccess(true);
        setEmail('');
        queryClient.invalidateQueries({ queryKey: ['invites'] });
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch {} finally {
      setSending(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    await fetch(`${API_URL}/invites/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    queryClient.invalidateQueries({ queryKey: ['invites'] });
  };

  return (
    <Section title="Invite Team Members" icon={Mail} iconColor="bg-orange-50 dark:bg-orange-900/20 text-orange-500">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <select value={role} onChange={e => setRole(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={handleSendInvite} disabled={sending || !email.trim()}
            className="px-4 py-2 text-sm font-medium bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl transition-colors">
            {sending ? 'Sending...' : success ? 'Sent!' : 'Send Invite'}
          </button>
        </div>
        {invites && invites.length > 0 && (
          <div className="space-y-2 mt-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase">Pending Invites</p>
            {invites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{inv.email}</p>
                  <p className="text-[11px] text-gray-400">{inv.role} - {inv.status || 'pending'}</p>
                </div>
                <button onClick={() => handleRevokeInvite(inv.id)} className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useUIStore();
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editDept, setEditDept] = useState(user?.department || '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [desktopNotifs, setDesktopNotifs] = useState(false);

  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFASetupMode, setTwoFASetupMode] = useState(false);
  const [twoFAVerifyCode, setTwoFAVerifyCode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  const { data: blockedUsers } = useQuery<{ id: string; name: string; avatar: string; username: string }[]>({
    queryKey: ['blocked-users-settings'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/users/blocked`, { headers: getAuthHeaders() });
      return r.ok ? r.json() : [];
    },
  });

  const { data: auditData } = useQuery<{ rows: any[]; total: number }>({
    queryKey: ['audit-log'],
    queryFn: async () => {
      const r = await fetch(`${API_URL}/audit?limit=20`, { headers: getAuthHeaders() });
      return r.ok ? r.json() : { rows: [], total: 0 };
    },
    enabled: (user as any)?.role === 'admin',
  });

  useEffect(() => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditDept(user?.department || '');
  }, [user?.name, user?.email, user?.department]);

  async function handleSaveProfile() {
    if (!user) return;
    updateUser({ ...user, name: editName, email: editEmail, department: editDept });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function handleChangePassword() {
    setPassError('');
    setPassSuccess(false);
    if (!currentPass || !newPass) { setPassError('All fields are required'); return; }
    if (newPass.length < 4) { setPassError('Password must be at least 4 characters'); return; }
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return; }
    setPassLoading(true);
    try {
      const r = await fetch(`${API_URL}/users/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await r.json();
      if (!r.ok) { setPassError(data.error || 'Failed'); return; }
      setPassSuccess(true);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassSuccess(false), 3000);
    } catch {
      setPassError('Network error');
    } finally {
      setPassLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== user?.username) return;
    setDeleteLoading(true);
    try {
      const r = await fetch(`${API_URL}/users/me`, { method: 'DELETE', headers: getAuthHeaders() });
      if (r.ok) {
        queryClient.clear();
        logout();
        navigate('/login');
      }
    } catch {} finally {
      setDeleteLoading(false);
    }
  }

  async function handleUnblock(userId: string) {
    try {
      await fetch(`${API_URL}/users/${userId}/block`, { method: 'DELETE', headers: getAuthHeaders() });
      queryClient.invalidateQueries({ queryKey: ['blocked-users-settings'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    } catch {}
  }

  async function handleSetup2FA() {
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const r = await fetch(`${API_URL}/2fa/setup`, { method: 'POST', headers: getAuthHeaders() });
      const data = await r.json();
      if (!r.ok) { setTwoFAError(data.error || 'Failed to setup 2FA'); setTwoFALoading(false); return; }
      setTwoFASecret(data.secret || '');
      setTwoFASetupMode(true);
    } catch { setTwoFAError('Network error'); }
    setTwoFALoading(false);
  }

  async function handleVerify2FA() {
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const r = await fetch(`${API_URL}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code: twoFAVerifyCode, secret: twoFASecret }),
      });
      const data = await r.json();
      if (!r.ok) { setTwoFAError(data.error || 'Invalid code'); setTwoFALoading(false); return; }
      if (user) updateUser({ ...user, twoFactorEnabled: true } as any);
      setTwoFASetupMode(false);
      setTwoFASecret('');
      setTwoFAVerifyCode('');
    } catch { setTwoFAError('Network error'); }
    setTwoFALoading(false);
  }

  async function handleDisable2FA() {
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const r = await fetch(`${API_URL}/2fa/disable`, { method: 'POST', headers: getAuthHeaders() });
      if (r.ok) {
        if (user) updateUser({ ...user, twoFactorEnabled: false } as any);
      }
    } catch {}
    setTwoFALoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        </div>

        {/* Profile */}
        <Section title="Profile" icon={Users} iconColor="bg-blue-50 dark:bg-blue-900/20 text-blue-500">
          <div className="px-5 py-5">
            <div className="flex items-center gap-4 mb-5">
              <UserAvatar user={user} size="xl" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{user?.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
                <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 capitalize">{user?.role}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Display name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" value={editEmail} onChange={e => { setEditEmail(e.target.value); setProfileSaved(false); }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Department</label>
                <input type="text" value={editDept} onChange={e => setEditDept(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
              </div>
              <button onClick={handleSaveProfile}
                className="w-full py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
                {profileSaved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon={darkMode ? Moon : Sun} iconColor="bg-purple-50 dark:bg-purple-900/20 text-purple-500">
          <SettingRow label="Dark mode" desc={darkMode ? 'Dark theme active' : 'Light theme active'}>
            <Toggle checked={darkMode} onChange={toggleDarkMode} />
          </SettingRow>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell} iconColor="bg-amber-50 dark:bg-amber-900/20 text-amber-500">
          <SettingRow label="Email notifications" desc="Receive updates via email">
            <Toggle checked={emailNotifs} onChange={() => setEmailNotifs(!emailNotifs)} />
          </SettingRow>
          <SettingRow label="Push notifications" desc="Receive browser push notifications">
            <Toggle checked={pushNotifs} onChange={() => setPushNotifs(!pushNotifs)} />
          </SettingRow>
          <SettingRow label="Desktop notifications" desc="Show popup notifications on desktop">
            <Toggle checked={desktopNotifs} onChange={() => setDesktopNotifs(!desktopNotifs)} />
          </SettingRow>
        </Section>

        {/* Security */}
        <Section title="Security" icon={Shield} iconColor="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Change Password</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <input type={showCurrentPass ? 'text' : 'password'} value={currentPass} onChange={e => { setCurrentPass(e.target.value); setPassError(''); }}
                  placeholder="Current password"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
                <button onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input type={showNewPass ? 'text' : 'password'} value={newPass} onChange={e => { setNewPass(e.target.value); setPassError(''); }}
                  placeholder="New password"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
                <button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input type="password" value={confirmPass} onChange={e => { setConfirmPass(e.target.value); setPassError(''); }}
                placeholder="Confirm new password"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" />
              {passError && <p className="text-xs text-red-500">{passError}</p>}
              {passSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" /> Password changed successfully</p>}
              <button onClick={handleChangePassword} disabled={passLoading}
                className="w-full py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-sm">
                {passLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
          {/* Two-Factor Authentication */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</p>
            </div>
            {(user as any)?.twoFactorEnabled ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> 2FA is enabled
                </p>
                <button onClick={handleDisable2FA} disabled={twoFALoading}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50">
                  {twoFALoading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            ) : twoFASetupMode ? (
              <div className="space-y-3">
                {twoFASecret && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Your secret key</p>
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{twoFASecret}</p>
                  </div>
                )}
                <input type="text" value={twoFAVerifyCode} onChange={e => { setTwoFAVerifyCode(e.target.value); setTwoFAError(''); }}
                  placeholder="Enter 6-digit code" maxLength={6}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                {twoFAError && <p className="text-xs text-red-500">{twoFAError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setTwoFASetupMode(false); setTwoFASecret(''); setTwoFAVerifyCode(''); }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                  <button onClick={handleVerify2FA} disabled={twoFALoading || twoFAVerifyCode.length < 6}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                    {twoFALoading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</p>
                {twoFAError && <p className="text-xs text-red-500">{twoFAError}</p>}
                <button onClick={handleSetup2FA} disabled={twoFALoading}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50">
                  {twoFALoading ? 'Setting up...' : 'Enable 2FA'}
                </button>
              </div>
            )}
          </div>
          <SettingRow label="Authentication method" desc="Username + password">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">Password</span>
          </SettingRow>
        </Section>

        {/* Privacy */}
        <Section title="Privacy" icon={Shield} iconColor="bg-red-50 dark:bg-red-900/20 text-red-500">
          {blockedUsers && blockedUsers.length > 0 ? (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Blocked Users</p>
              <div className="space-y-2">
                {blockedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={u} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">@{u.username}</p>
                      </div>
                    </div>
                    <button onClick={() => handleUnblock(u.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <SettingRow label="Blocked users" desc="No users blocked">
              <UserX className="w-4 h-4 text-gray-400" />
            </SettingRow>
          )}
        </Section>

        {/* Invite Team Members (Admin only) */}
        {(user as any)?.role === 'admin' && (
          <InviteSection />
        )}

        {/* Data Export */}
        <Section title="Data & Storage" icon={Download} iconColor="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-500">
          <SettingRow label="Export your data" desc="Download all your tasks, messages, and projects">
            <div className="flex gap-2">
              <a href={`${API_URL}/export?format=json`} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                JSON
              </a>
              <a href={`${API_URL}/export?format=csv`} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                CSV
              </a>
            </div>
          </SettingRow>
        </Section>

        {/* Audit Log (Admin only) */}
        {(user as any)?.role === 'admin' && (
          <Section title="Activity Log" icon={Activity} iconColor="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
            {auditData?.rows && auditData.rows.length > 0 ? (
              <div className="px-5 py-4 space-y-2 max-h-64 overflow-y-auto">
                {auditData.rows.map((entry: any, i: number) => (
                  <div key={entry.id || i} className="flex items-start gap-3 py-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{entry.userName || 'System'}</span>
                        {' '}{entry.action}
                        {entry.target && <span className="text-gray-500 dark:text-gray-400"> on {entry.target}</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <SettingRow label="No recent activity" desc="Audit entries will appear here">
                <Activity className="w-4 h-4 text-gray-400" />
              </SettingRow>
            )}
          </Section>
        )}

        {/* Danger Zone */}
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 dark:border-red-900/30">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger Zone</h2>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Permanently delete your account and all data</p>
              </div>
              <button onClick={() => setShowDeleteAccount(true)} className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowDeleteAccount(false); setDeleteConfirm(''); }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete Account</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">This action is irreversible</p>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                <p className="text-sm text-red-700 dark:text-red-400">
                  This will permanently delete your account, all your messages, files, and associated data. This cannot be undone.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Type <span className="font-bold text-red-600 dark:text-red-400">{user?.username}</span> to confirm
                </label>
                <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  placeholder="Enter username" autoFocus />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={() => { setShowDeleteAccount(false); setDeleteConfirm(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirm !== user?.username || deleteLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm">
                {deleteLoading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
