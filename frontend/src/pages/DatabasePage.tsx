import { useState, useEffect, useMemo } from 'react';
import { Database, Edit3, Trash2, Plus, Save, X, ArrowLeft, Search, ChevronLeft, ChevronRight, RefreshCw, Table, Users, FolderKanban, CheckSquare, MessageCircle, Hash, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Navigate, useNavigate } from 'react-router-dom';
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

type ResourceType = 'users' | 'projects' | 'tasks' | 'channels' | 'messages' | 'comments' | 'subtasks' | 'channel_members';

const RESOURCES: { key: ResourceType; label: string; icon: typeof Users; color: string }[] = [
  { key: 'users', label: 'Users', icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  { key: 'channels', label: 'Channels', icon: Hash, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
  { key: 'messages', label: 'Messages', icon: MessageCircle, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' },
  { key: 'comments', label: 'Comments', icon: MessageCircle, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' },
  { key: 'subtasks', label: 'Subtasks', icon: CheckSquare, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  { key: 'channel_members', label: 'Members', icon: Users, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
];

const PAGE_SIZE = 12;

const SKELETON_ROWS = Array.from({ length: 6 });

export default function DatabasePage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const [resource, setResource] = useState<ResourceType>('users');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [newRow, setNewRow] = useState(false);
  const [newData, setNewData] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchResource();
    setPage(1);
    setSearch('');
    setEditingId(null);
    setNewRow(false);
    setExpandedId(null);
  }, [resource]);

  async function fetchResource() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/${resource}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to fetch data');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`${API_URL}/${resource}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      setShowConfirmDelete(null);
      fetchResource();
    } catch {
      setError('Failed to delete');
    }
  }

  function startEdit(row: any) {
    setEditingId(row.id);
    setEditData(JSON.parse(JSON.stringify(row)));
    setNewRow(false);
    setExpandedId(null);
  }

  async function saveEdit() {
    if (!editData) return;
    try {
      await fetch(`${API_URL}/${resource}/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(editData),
      });
      setEditingId(null);
      setEditData(null);
      fetchResource();
    } catch {
      setError('Failed to update');
    }
  }

  function startNew() {
    setNewData({});
    setNewRow(true);
    setEditingId(null);
    setExpandedId(null);
  }

  async function saveNew() {
    if (!newData) return;
    try {
      await fetch(`${API_URL}/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ...newData, id: crypto.randomUUID() }),
      });
      setNewRow(false);
      setNewData(null);
      fetchResource();
    } catch {
      setError('Failed to create');
    }
  }

  function formatValue(val: any): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 50) + (JSON.stringify(val).length > 50 ? '...' : '');
    const s = String(val);
    if (s.length > 60) return s.slice(0, 60) + '...';
    return s;
  }

  function getColumns(rows: any[]): string[] {
    if (rows.length === 0) return [];
    const allKeys = new Set<string>();
    rows.forEach(r => Object.keys(r).forEach(k => allKeys.add(k)));
    return Array.from(allKeys);
  }

  if (!isAdmin()) return <Navigate to="/dashboard" replace />;

  const allColumns = getColumns(rows);
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const columns = allColumns.filter(k => k !== 'id');
  const visibleCols = columns.slice(0, 6);
  const currentResource = RESOURCES.find(r => r.key === resource)!;
  const Icon = currentResource.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className={`p-1.5 rounded-lg ${currentResource.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Database Explorer</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{filteredRows.length} records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchResource} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Refresh">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" /> New Record
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Table Tabs */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {RESOURCES.map(r => {
            const RIcon = r.icon;
            return (
              <button
                key={r.key}
                onClick={() => setResource(r.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${resource === r.key ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'}`}
              >
                <RIcon className="w-3.5 h-3.5" />
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Search + Stats */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search records..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {SKELETON_ROWS.map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  {visibleCols.map((_, j) => (
                    <div key={j} className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ animationDelay: `${i * 50 + j * 30}ms` }} />
                  ))}
                  <div className="w-16 h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : paginatedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className={`p-3 rounded-2xl ${currentResource.color} mb-3`}>
                <Icon className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{search ? 'No matching records' : 'No records yet'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{search ? 'Try a different search term' : `Create your first ${resource.slice(0, -1)} record`}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10">#</th>
                    {visibleCols.map(col => (
                      <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider max-w-[180px] truncate">
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {newRow && (
                    <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                      <td className="px-5 py-2.5 text-xs font-medium text-blue-500">+</td>
                      {visibleCols.map(col => (
                        <td key={col} className="px-4 py-2.5">
                          <input
                            type="text"
                            value={typeof newData?.[col] === 'object' ? JSON.stringify(newData[col] ?? '') : (newData?.[col] ?? '')}
                            onChange={e => setNewData?.({ ...newData, [col]: e.target.value })}
                            placeholder={col}
                            className="w-full px-2.5 py-1.5 text-xs border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                          />
                        </td>
                      ))}
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={saveNew} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors" title="Save">
                            <Save className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setNewRow(false); setNewData(null); }} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors" title="Cancel">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {paginatedRows.map((row, idx) => {
                    const isEditing = editingId === row.id;
                    const data = isEditing ? editData : row;
                    const setData = isEditing ? setEditData : undefined;
                    const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;

                    return (
                      <tr key={row.id} className={`group transition-colors ${isEditing ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                        <td className="px-5 py-2.5 text-xs text-gray-400 dark:text-gray-500 font-medium">{globalIdx}</td>
                        {visibleCols.map(col => (
                          <td key={col} className="px-4 py-2.5 max-w-[180px]">
                            {isEditing ? (
                              <input
                                type="text"
                                value={typeof data?.[col] === 'object' ? JSON.stringify(data[col] ?? '') : (data?.[col] ?? '')}
                                onChange={e => setData?.({ ...data, [col]: e.target.value })}
                                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                              />
                            ) : (
                              <span className={`text-xs truncate block ${col === 'id' ? 'font-mono text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {formatValue(row[col])}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {columns.length > visibleCols.length && (
                              <button
                                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Show all fields"
                              >
                                <Table className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isEditing ? (
                              <>
                                <button onClick={saveEdit} className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors" title="Save">
                                  <Save className="w-3 h-3" />
                                </button>
                                <button onClick={() => { setEditingId(null); setEditData(null); }} className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors" title="Cancel">
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setShowConfirmDelete(row.id)} className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredRows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, i, arr) => (
                  <span key={p} className="flex items-center">
                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-gray-300 dark:text-gray-600">...</span>}
                    <button onClick={() => setPage(p)} className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                      {p}
                    </button>
                  </span>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expanded Fields Panel */}
        {expandedId && (
          <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">All Fields — Record #{rows.findIndex(r => r.id === expandedId) + 1}</h3>
              <button onClick={() => setExpandedId(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allColumns.map(col => {
                const val = rows.find(r => r.id === expandedId)?.[col];
                const isEditing = editingId === expandedId;
                return (
                  <div key={col} className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{col.replace(/([A-Z])/g, ' $1').trim()}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={typeof editData?.[col] === 'object' ? JSON.stringify(editData[col] ?? '') : (editData?.[col] ?? '')}
                        onChange={e => setEditData?.({ ...editData, [col]: e.target.value })}
                        className="px-2.5 py-1.5 text-xs border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    ) : (
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all">{formatValue(val)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowConfirmDelete(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete Record</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              Are you sure you want to delete this {resource.slice(0, -1)} record? All associated data will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(showConfirmDelete)} className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
