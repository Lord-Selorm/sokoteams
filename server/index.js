require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, initDb } = require('./db');

const app = express();

// CORS — restrict in production
const allowedOrigins = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== 'value'
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://sokoteams.vercel.app',
      'https://sokoteams-48vfmbrux-lord-selorm1.vercel.app',
      'https://sokoteams-lord-selorm1.vercel.app',
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'sokoteams-dev-secret-change-in-production';

// Database will be initialized asynchronously below
let db;

// ─── Helpers ──────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email, department: user.department },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(row) {
  if (!row) return null;
  const { passwordHash, ...rest } = row;
  return rest;
}

function parseJsonField(val) {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

async function taskFromRow(row) {
  if (!row) return null;
  const user = row.assignedUserId
    ? await db.get('SELECT * FROM users WHERE id = ?', row.assignedUserId)
    : null;
  const subtasks = await db.all('SELECT * FROM subtasks WHERE taskId = ?', row.id);
  const followers = (await db.all('SELECT u.* FROM task_followers tf JOIN users u ON u.id = tf.userId WHERE tf.taskId = ?', row.id)).map(safeUser);
  return {
    ...row,
    assignedUser: user ? safeUser(user) : { id: '0', name: 'Unassigned', email: '', avatar: '', role: 'user' },
    tags: parseJsonField(row.tags),
    subtasks,
    dependencies: [],
    dependentTasks: [],
    followers,
  };
}

async function projectFromRow(row) {
  if (!row) return null;
  const members = (await db.all('SELECT pm.*, u.id as uid, u.name, u.email, u.avatar, u.role FROM project_members pm JOIN users u ON u.id = pm.userId WHERE pm.projectId = ?', row.id))
    .map(m => ({
      user: { id: m.uid, name: m.name, email: m.email, avatar: m.avatar, role: m.role },
      projectRole: m.projectRole,
    }));
  return { ...row, members };
}

// ─── Auth Middleware ──────────────────────────────────────
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing or invalid token' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

// ─── Auth Endpoints ───────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  const key = username.toLowerCase().trim();
  const user = await db.get('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?', key, key);
  if (!user) return res.status(401).json({ success: false, error: 'Invalid username or password' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ success: false, error: 'Invalid username or password' });
  const token = signToken(user);
  res.json({ success: true, token, user: safeUser(user) });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, name, email, department } = req.body;
  if (!username || !password || !name || !email) {
    return res.status(400).json({ success: false, error: 'All fields required' });
  }
  const key = username.toLowerCase().trim();
  const exists = await db.get('SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?', key, email.toLowerCase());
  if (exists) return res.status(409).json({ success: false, error: 'Username or email already taken' });
  const countRow = await db.get('SELECT COUNT(*) as c FROM users');
  const count = countRow.c;
  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  await db.run('INSERT INTO users (id, username, name, email, avatar, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, key, name, email, avatar, count === 0 ? 'admin' : 'user', department || '', passwordHash);
  const user = await db.get('SELECT * FROM users WHERE id = ?', id);
  const token = signToken(user);
  res.json({ success: true, token, user: safeUser(user) });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user: safeUser(user) });
});

// ─── Users (authenticated) ────────────────────────────────
app.get('/api/users', async (_req, res) => {
  const users = (await db.all('SELECT * FROM users')).map(safeUser);
  res.json(users);
});

app.get('/api/users/blocked', authenticate, async (req, res) => {
  const rows = await db.all(`
    SELECT u.id, u.username, u.name, u.email, u.avatar, u.role, u.department
    FROM blocked_users bu
    JOIN users u ON bu.blockedUserId = u.id
    WHERE bu.userId = ?
  `, req.user.id);
  res.json(rows.map(safeUser));
});

app.get('/api/users/:id', async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json(safeUser(user));
});

app.patch('/api/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user', 'guest'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  await db.run(`UPDATE users SET role = ?, updatedAt = NOW() WHERE id = ?`, role, req.params.id);
  const updated = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
  res.json(safeUser(updated));
});

app.patch('/api/users/:id', authenticate, async (req, res) => {
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Cannot edit other users' });
  }
  const email = req.body.email || user.email;
  const name = req.body.name || user.name;
  const department = req.body.department !== undefined ? req.body.department : user.department;
  const avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
  await db.run(`UPDATE users SET email = ?, name = ?, department = ?, avatar = ?, updatedAt = NOW() WHERE id = ?`,
    email, name, department, avatar, req.params.id);
  const updated = await db.get('SELECT * FROM users WHERE id = ?', req.params.id);
  res.json(safeUser(updated));
});

// ─── Change Password ───────────────────────────────────────
app.post('/api/users/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  const user = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const valid = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run("UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE id = ?", hash, req.user.id);
  res.json({ success: true });
});

// ─── Delete Account ────────────────────────────────────────
app.delete('/api/users/me', authenticate, async (req, res) => {
  const userId = req.user.id;
  const fs = require('fs');
  const path = require('path');
  const msgs = await db.all('SELECT id, attachments FROM messages WHERE userId = ?', userId);
  for (const m of msgs) {
    try {
      const attachments = JSON.parse(m.attachments || '[]');
      for (const att of attachments) {
        if (att.url && att.url.startsWith('/api/uploads/')) {
          const filePath = path.join(__dirname, att.url.replace('/api/uploads/', 'uploads/'));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
    } catch {}
  }
  await db.run('DELETE FROM reactions WHERE userId = ?', userId);
  await db.run('DELETE FROM message_reads WHERE userId = ?', userId);
  await db.run("UPDATE messages SET isDeleted = 1, content = '[deleted user]' WHERE userId = ?", userId);
  await db.run('DELETE FROM comments WHERE userId = ?', userId);
  await db.run('DELETE FROM subtasks WHERE assigneeId = ?', userId);
  await db.run('DELETE FROM project_members WHERE userId = ?', userId);
  await db.run('DELETE FROM channel_members WHERE userId = ?', userId);
  await db.run('DELETE FROM blocked_users WHERE userId = ? OR blockedUserId = ?', userId, userId);
  await db.run('DELETE FROM dm_settings WHERE userId = ? OR otherUserId = ?', userId, userId);
  await db.run('DELETE FROM users WHERE id = ?', userId);
  res.json({ success: true });
});

// ─── DM Settings ───────────────────────────────────────────
app.get('/api/dm-settings/:otherUserId', authenticate, async (req, res) => {
  const row = await db.get('SELECT * FROM dm_settings WHERE userId = ? AND otherUserId = ?', req.user.id, req.params.otherUserId);
  res.json(row || { auto_delete: null, isMuted: 0 });
});

app.patch('/api/dm-settings/:otherUserId', authenticate, async (req, res) => {
  const { auto_delete, isMuted } = req.body;
  const existing = await db.get('SELECT * FROM dm_settings WHERE userId = ? AND otherUserId = ?', req.user.id, req.params.otherUserId);
  if (existing) {
    const updates = [];
    const params = [];
    if (auto_delete !== undefined) { updates.push('auto_delete = ?'); params.push(auto_delete); }
    if (isMuted !== undefined) { updates.push('isMuted = ?'); params.push(isMuted); }
    if (updates.length > 0) {
      params.push(req.user.id, req.params.otherUserId);
      await db.run(`UPDATE dm_settings SET ${updates.join(', ')} WHERE userId = ? AND otherUserId = ?`, ...params);
    }
  } else {
    await db.run('INSERT INTO dm_settings (userId, otherUserId, auto_delete, isMuted) VALUES (?, ?, ?, ?)',
      req.user.id, req.params.otherUserId, auto_delete || null, isMuted || 0);
  }
  const updated = await db.get('SELECT * FROM dm_settings WHERE userId = ? AND otherUserId = ?', req.user.id, req.params.otherUserId);
  res.json(updated);
});

app.delete('/api/dm/:otherUserId/messages', authenticate, async (req, res) => {
  const sorted = [req.user.id, req.params.otherUserId].sort();
  const channelId = `dm-${sorted[0]}-${sorted[1]}`;
  const msgs = await db.all('SELECT id, attachments FROM messages WHERE channelId = ?', channelId);
  const fs = require('fs');
  const path = require('path');
  for (const m of msgs) {
    try {
      const attachments = JSON.parse(m.attachments || '[]');
      for (const att of attachments) {
        if (att.url && att.url.startsWith('/api/uploads/')) {
          const filePath = path.join(__dirname, att.url.replace('/api/uploads/', 'uploads/'));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
    } catch {}
  }
  await db.run('DELETE FROM reactions WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)', channelId);
  await db.run('DELETE FROM message_reads WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)', channelId);
  await db.run('DELETE FROM messages WHERE channelId = ?', channelId);
  res.json({ success: true });
});

// ─── Block/Unblock Users ────────────────────────────────────
app.post('/api/users/:id/block', authenticate, async (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot block yourself' });
  const user = await db.get('SELECT id FROM users WHERE id = ?', req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await db.run('INSERT INTO blocked_users (userId, blockedUserId) VALUES (?, ?) ON CONFLICT DO NOTHING', req.user.id, req.params.id);
  res.json({ success: true });
});

app.delete('/api/users/:id/block', authenticate, async (req, res) => {
  await db.run('DELETE FROM blocked_users WHERE userId = ? AND blockedUserId = ?', req.user.id, req.params.id);
  res.json({ success: true });
});

app.get('/api/users/:id/block-status', authenticate, async (req, res) => {
  const blockedByMe = await db.get('SELECT 1 FROM blocked_users WHERE userId = ? AND blockedUserId = ?', req.user.id, req.params.id);
  const iAmBlockedBy = await db.get('SELECT 1 FROM blocked_users WHERE userId = ? AND blockedUserId = ?', req.params.id, req.user.id);
  res.json({ blockedByMe: !!blockedByMe, blockedByThem: !!iAmBlockedBy });
});

// ─── Projects (authenticated) ─────────────────────────────
app.get('/api/projects', async (req, res) => {
  const includeArchived = req.query.archived === '1';
  const rows = await db.all('SELECT * FROM projects WHERE isArchived = ?', includeArchived ? 1 : 0);
  res.json(await Promise.all(rows.map(projectFromRow)));
});

app.get('/api/projects/:id', async (req, res) => {
  const row = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Project not found' });
  res.json(await projectFromRow(row));
});

app.post('/api/projects', authenticate, async (req, res) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const p = req.body;
  await db.run('INSERT INTO projects (id, title, description, status, completionPercentage, dueDate, startDate, color, icon, ownerId, workspaceId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, p.title || '', p.description || '', p.status || 'active', p.completionPercentage || 0, p.dueDate || '', p.startDate || '', p.color || 'blue', p.icon || '', p.ownerId || '', p.workspaceId || 'default', now, now);
  if (Array.isArray(p.members)) {
    for (const m of p.members) {
      if (m.user?.id) await db.run('INSERT INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)', id, m.user.id, m.projectRole || 'member');
    }
  }
  const row = await db.get('SELECT * FROM projects WHERE id = ?', id);
  res.json(await projectFromRow(row));
});

app.patch('/api/projects/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Project not found' });
  const p = req.body;
  await db.run(`UPDATE projects SET title=?, description=?, status=?, completionPercentage=?, dueDate=?, startDate=?, color=?, icon=?, ownerId=?, workspaceId=?, updatedAt=NOW() WHERE id=?`,
    p.title ?? existing.title, p.description ?? existing.description, p.status ?? existing.status, p.completionPercentage ?? existing.completionPercentage, p.dueDate ?? existing.dueDate, p.startDate ?? existing.startDate, p.color ?? existing.color, p.icon ?? existing.icon, p.ownerId ?? existing.ownerId, p.workspaceId ?? existing.workspaceId, req.params.id);
  if (Array.isArray(p.members)) {
    await db.run('DELETE FROM project_members WHERE projectId = ?', req.params.id);
    for (const m of p.members) {
      if (m.user?.id) await db.run('INSERT INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)', req.params.id, m.user.id, m.projectRole || 'member');
    }
  }
  const row = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
  res.json(await projectFromRow(row));
});

app.delete('/api/projects/:id', authenticate, async (req, res) => {
  const r = await db.run('DELETE FROM projects WHERE id = ?', req.params.id);
  if (r.changes === 0) return res.status(404).json({ success: false, error: 'Project not found' });
  res.json({ success: true });
});

app.patch('/api/projects/:id/members', authenticate, async (req, res) => {
  const { members } = req.body;
  if (!Array.isArray(members)) return res.status(400).json({ success: false, error: 'members must be an array' });
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  const isLead = await db.get('SELECT 1 FROM project_members WHERE projectId = ? AND userId = ? AND projectRole = "lead"', req.params.id, req.user.id);
  if (req.user.role !== 'admin' && !isLead) {
    return res.status(403).json({ success: false, error: 'Only admins and project leads can modify roles' });
  }
  await db.run('DELETE FROM project_members WHERE projectId = ?', req.params.id);
  for (const m of members) {
    if (m.user?.id) await db.run('INSERT INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)', req.params.id, m.user.id, m.projectRole || 'member');
  }
  const row = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
  res.json(await projectFromRow(row));
});

// ─── Tasks (authenticated) ────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  const includeArchived = req.query.archived === '1';
  let rows;
  if (req.query.projectId) {
    rows = await db.all('SELECT * FROM tasks WHERE projectId = ? AND isArchived = ?', req.query.projectId, includeArchived ? 1 : 0);
  } else if (req.query.assignedUserId) {
    rows = await db.all('SELECT * FROM tasks WHERE assignedUserId = ? AND isArchived = ?', req.query.assignedUserId, includeArchived ? 1 : 0);
  } else {
    rows = await db.all('SELECT * FROM tasks WHERE isArchived = ?', includeArchived ? 1 : 0);
  }
  res.json(await Promise.all(rows.map(taskFromRow)));
});

app.get('/api/tasks/:id', async (req, res) => {
  const row = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json(await taskFromRow(row));
});

app.post('/api/tasks', authenticate, async (req, res) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const t = req.body;

  // Validate title
  if (!t.title || !t.title.trim()) {
    return res.status(400).json({ success: false, error: 'Task title is required' });
  }

  // Validate projectId exists
  const projectId = t.projectId || '';
  if (projectId) {
    const project = await db.get('SELECT id FROM projects WHERE id = ?', projectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }
  }

  // Validate assignedUserId exists
  const assignedUserId = t.assignedUser?.id || '';
  if (assignedUserId) {
    const user = await db.get('SELECT id FROM users WHERE id = ?', assignedUserId);
    if (!user) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }
  }

  await db.run('INSERT INTO tasks (id, projectId, title, description, priority, status, dueDate, startDate, assignedUserId, tags, estimatedHours, actualHours, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, projectId, t.title.trim(), t.description || '', t.priority || 'Medium', t.status || 'Todo', t.dueDate || '', t.startDate || '', assignedUserId, JSON.stringify(t.tags || []), t.estimatedHours || 0, t.actualHours || 0, t.completedAt || '', now, now);
  const row = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  res.json(await taskFromRow(row));
});

app.patch('/api/tasks/:id', authenticate, async (req, res) => {
  const existing = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Task not found' });
  const t = req.body;

  const projectId = t.projectId ?? existing.projectId;
  const assignedUserId = t.assignedUser?.id !== undefined ? t.assignedUser.id : existing.assignedUserId;

  // Validate projectId exists
  if (projectId) {
    const project = await db.get('SELECT id FROM projects WHERE id = ?', projectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }
  }

  // Validate assignedUserId exists
  if (assignedUserId) {
    const user = await db.get('SELECT id FROM users WHERE id = ?', assignedUserId);
    if (!user) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }
  }

  await db.run(`UPDATE tasks SET projectId=?, title=?, description=?, priority=?, status=?, dueDate=?, startDate=?, assignedUserId=?, tags=?, estimatedHours=?, actualHours=?, completedAt=?, updatedAt=NOW() WHERE id=?`,
    projectId, t.title ?? existing.title, t.description ?? existing.description, t.priority ?? existing.priority, t.status ?? existing.status, t.dueDate ?? existing.dueDate, t.startDate ?? existing.startDate, assignedUserId, JSON.stringify(t.tags ?? parseJsonField(existing.tags)), t.estimatedHours ?? existing.estimatedHours, t.actualHours ?? existing.actualHours, t.completedAt ?? existing.completedAt, req.params.id);
  const row = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
  res.json(await taskFromRow(row));
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  const r = await db.run('DELETE FROM tasks WHERE id = ?', req.params.id);
  if (r.changes === 0) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true });
});

app.patch('/api/tasks/:id/archive', authenticate, async (req, res) => {
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const archived = task.isArchived ? 0 : 1;
  await db.run('UPDATE tasks SET isArchived = ?, archivedAt = ? WHERE id = ?',
    archived, archived ? new Date().toISOString() : null, req.params.id);
  res.json(await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id));
});

app.patch('/api/projects/:id/archive', authenticate, async (req, res) => {
  const project = await db.get('SELECT * FROM projects WHERE id = ?', req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const archived = project.isArchived ? 0 : 1;
  await db.run('UPDATE projects SET isArchived = ?, archivedAt = ? WHERE id = ?',
    archived, archived ? new Date().toISOString() : null, req.params.id);
  res.json(await db.get('SELECT * FROM projects WHERE id = ?', req.params.id));
});

// ─── Channels ─────────────────────────────────────────────
app.get('/api/channels', async (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }
  if (userId) {
    const channels = await db.all(`
      SELECT c.* FROM channels c
      JOIN channel_members cm ON c.id = cm.channelId
      WHERE cm.userId = ? AND cm.status = 'approved'
      ORDER BY c.pinned DESC, c.lastMessageAt DESC
    `, userId);
    res.json(channels);
  } else {
    const allChannels = await db.all('SELECT * FROM channels ORDER BY pinned DESC, lastMessageAt DESC');
    res.json(allChannels);
  }
});

app.get('/api/channels/all', async (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }
  if (userId) {
    const channels = await db.all(`
      SELECT c.*, 
        CASE WHEN cm.status = 'approved' THEN 1 ELSE 0 END as isMember,
        COALESCE(cm.status, 'none') as membershipStatus
      FROM channels c
      LEFT JOIN channel_members cm ON c.id = cm.channelId AND cm.userId = ?
      WHERE c.type = 'public' OR cm.status = 'approved' OR cm.status = 'pending'
      ORDER BY c.pinned DESC, c.lastMessageAt DESC
    `, userId);
    res.json(channels);
  } else {
    const pubChannels = await db.all("SELECT * FROM channels WHERE type = 'public' ORDER BY pinned DESC, lastMessageAt DESC");
    res.json(pubChannels);
  }
});

app.get('/api/channels/:id', async (req, res) => {
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json(ch);
});

app.post('/api/channels', authenticate, async (req, res) => {
  const { id, name, type, workspaceId, description, topic, avatar } = req.body;
  const cid = id || name.toLowerCase().replace(/\s+/g, '-');
  await db.run('INSERT INTO channels (id, name, type, workspaceId, description, topic, createdBy, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, workspaceId = EXCLUDED.workspaceId, description = EXCLUDED.description, topic = EXCLUDED.topic, createdBy = EXCLUDED.createdBy, avatar = EXCLUDED.avatar',
    cid, name, type || 'public', workspaceId || '1', description || '', topic || '', req.user.id, avatar || '');
  await db.run('INSERT INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', cid, req.user.id, 'admin', 'approved');
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', cid);
  res.json(ch);
});

app.patch('/api/channels/:id', authenticate, async (req, res) => {
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const { name, description, topic, pinned, avatar } = req.body;
  await db.run('UPDATE channels SET name=?, description=?, topic=?, pinned=?, avatar=? WHERE id=?',
    name ?? ch.name, description ?? ch.description, topic ?? ch.topic, pinned ?? ch.pinned, avatar ?? ch.avatar, req.params.id);
  const updated = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  res.json(updated);
});

app.delete('/api/channels/:id', async (req, res) => {
  await db.run('DELETE FROM channels WHERE id = ?', req.params.id);
  res.json({ success: true });
});

app.post('/api/channels/:id/avatar', authenticate, (req, res) => {
  db.get('SELECT * FROM channels WHERE id = ?', req.params.id).then(ch => {
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    upload.single('avatar')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const avatarUrl = `/api/uploads/${req.file.filename}`;
      db.run('UPDATE channels SET avatar = ? WHERE id = ?', avatarUrl, req.params.id).then(() => {
        res.json({ avatar: avatarUrl });
      });
    });
  });
});

app.patch('/api/channels/:id/auto-delete', authenticate, async (req, res) => {
  const { auto_delete } = req.body;
  if (auto_delete && !['24h', '7d', '30d'].includes(auto_delete)) {
    return res.status(400).json({ error: 'Invalid auto_delete value. Use: 24h, 7d, 30d, or null to disable.' });
  }
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  await db.run('UPDATE channels SET auto_delete = ? WHERE id = ?', auto_delete || null, req.params.id);
  if (auto_delete) {
    const msgs = await db.all('SELECT id, createdAt FROM messages WHERE channelId = ? AND isDeleted = 0 AND auto_delete_at IS NULL', req.params.id);
    const durationMs = auto_delete === '24h' ? 86400000 : auto_delete === '7d' ? 604800000 : 2592000000;
    for (const m of msgs) {
      const deleteAt = new Date(new Date(m.createdAt).getTime() + durationMs).toISOString();
      await db.run('UPDATE messages SET auto_delete_at = ? WHERE id = ?', deleteAt, m.id);
    }
  }
  const result = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  res.json(result);
});

app.post('/api/channels/:id/clear-messages', authenticate, async (req, res) => {
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const messages = await db.all('SELECT id, attachments FROM messages WHERE channelId = ?', req.params.id);
  for (const msg of messages) {
    try {
      const atts = JSON.parse(msg.attachments || '[]');
      for (const att of atts) {
        if (att.url) {
          const filename = att.url.split('/').pop();
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
      }
    } catch {}
  }
  await db.run('DELETE FROM reactions WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)', req.params.id);
  await db.run('DELETE FROM message_reads WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)', req.params.id);
  await db.run('DELETE FROM messages WHERE channelId = ?', req.params.id);
  await db.run('UPDATE channels SET lastMessageAt = ?, lastMessagePreview = ? WHERE id = ?', null, '', req.params.id);
  res.json({ success: true });
});

// ─── Channel Membership ───────────────────────────────────
app.get('/api/channels/:id/members', async (req, res) => {
  const members = await db.all(`
    SELECT cm.*, u.name, u.email, u.avatar, u.role as systemRole
    FROM channel_members cm
    JOIN users u ON cm.userId = u.id
    WHERE cm.channelId = ?
  `, req.params.id);
  res.json(members);
});

app.post('/api/channels/:id/members', authenticate, async (req, res) => {
  const { userId } = req.body;
  const channelId = req.params.id;
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const existing = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?', channelId, userId);
  if (existing) return res.status(400).json({ error: 'Already a member or pending' });

  await db.run('INSERT INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)', channelId, userId, 'member', 'approved');
  res.json({ success: true });
});

app.post('/api/channels/:id/join', authenticate, async (req, res) => {
  const channelId = req.params.id;
  const userId = req.user.id;
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const existing = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?', channelId, userId);
  if (existing) {
    if (existing.status === 'approved') return res.status(400).json({ error: 'Already a member' });
    if (existing.status === 'pending') return res.status(400).json({ error: 'Request already pending' });
  }

  // Public channels auto-approve, private channels require approval
  const status = ch.type === 'public' ? 'approved' : 'pending';
  await db.run('INSERT INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?) ON CONFLICT (channelId, userId) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status', channelId, userId, 'member', status);
  res.json({ success: true, status });
});

app.post('/api/channels/:id/approve', authenticate, async (req, res) => {
  const channelId = req.params.id;
  const { userId } = req.body;
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const approver = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?', channelId, req.user.id, 'admin');
  if (!approver) return res.status(403).json({ error: 'Only channel admins can approve' });

  await db.run('UPDATE channel_members SET status = ? WHERE channelId = ? AND userId = ?', 'approved', channelId, userId);
  res.json({ success: true });
});

app.post('/api/channels/:id/deny', authenticate, async (req, res) => {
  const channelId = req.params.id;
  const { userId } = req.body;
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const denyer = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?', channelId, req.user.id, 'admin');
  if (!denyer) return res.status(403).json({ error: 'Only channel admins can deny' });

  await db.run('DELETE FROM channel_members WHERE channelId = ? AND userId = ?', channelId, userId);
  res.json({ success: true });
});

app.delete('/api/channels/:id/members/:userId', authenticate, async (req, res) => {
  const channelId = req.params.id;
  const targetUserId = req.params.userId;

  const remover = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?', channelId, req.user.id, 'admin');
  if (!remover && req.user.id !== targetUserId) return res.status(403).json({ error: 'Only channel admins can remove others' });

  await db.run('DELETE FROM channel_members WHERE channelId = ? AND userId = ?', channelId, targetUserId);
  res.json({ success: true });
});

app.get('/api/channels/:id/pending', authenticate, async (req, res) => {
  const channelId = req.params.id;
  const admin = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?', channelId, req.user.id, 'admin');
  if (!admin) return res.status(403).json({ error: 'Only channel admins can view pending requests' });

  const pending = await db.all(`
    SELECT cm.*, u.name, u.email, u.avatar
    FROM channel_members cm
    JOIN users u ON cm.userId = u.id
    WHERE cm.channelId = ? AND cm.status = 'pending'
  `, channelId);
  res.json(pending);
});

app.get('/api/channels/:id/membership', authenticate, async (req, res) => {
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  if (ch.type === 'public') return res.json({ isMember: true, status: 'approved' });
  const m = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?', req.params.id, req.user.id);
  res.json({ isMember: !!m && m.status === 'approved', status: m ? m.status : 'none' });
});

// ─── Auto-delete cleanup (runs every 60s) ────────────────
async function cleanupExpiredMessages() {
  try {
    const expired = await db.all("SELECT id, channelId, attachments FROM messages WHERE auto_delete_at IS NOT NULL AND auto_delete_at::timestamptz <= NOW() AND isDeleted = 0");
    if (expired.length === 0) return;
    for (const msg of expired) {
      try {
        const atts = JSON.parse(msg.attachments || '[]');
        for (const att of atts) {
          if (att.url) {
            const filename = att.url.split('/').pop();
            const filePath = path.join(uploadsDir, filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          }
        }
      } catch {}
    }
    const ids = expired.map(m => m.id);
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM reactions WHERE messageId IN (${placeholders})`, ...ids);
    await db.run(`DELETE FROM message_reads WHERE messageId IN (${placeholders})`, ...ids);
    await db.run(`DELETE FROM messages WHERE id IN (${placeholders})`, ...ids);
    console.log(`[AUTO-DELETE] Cleaned up ${expired.length} expired message(s)`);
  } catch (err) {
    console.error('[AUTO-DELETE] Cleanup error:', err.message);
  }
}
setInterval(cleanupExpiredMessages, 60000);

// ─── Messages ─────────────────────────────────────────────
app.get('/api/messages', async (req, res) => {
  if (req.query.channelId) {
    const ch = await db.get('SELECT type FROM channels WHERE id = ?', req.query.channelId);
    if (ch && ch.type === 'private') {
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try { const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET); userId = decoded.id; } catch {}
      }
      if (userId) {
        const m = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND status = ?', req.query.channelId, userId, 'approved');
        if (!m) return res.json([]);
      } else {
        return res.json([]);
      }
    }
  }
  let rows;
  if (req.query.channelId && req.query.parentId) {
    const pv = req.query.parentId === 'null' ? null : req.query.parentId;
    if (pv === null) {
      rows = await db.all('SELECT * FROM messages WHERE channelId = ? AND parentId IS NULL AND isDeleted = 0 ORDER BY createdAt ASC', req.query.channelId);
    } else {
      rows = await db.all('SELECT * FROM messages WHERE channelId = ? AND parentId = ? AND isDeleted = 0 ORDER BY createdAt ASC', req.query.channelId, pv);
    }
  } else if (req.query.channelId) {
    rows = await db.all('SELECT * FROM messages WHERE channelId = ? AND parentId IS NULL AND isDeleted = 0 ORDER BY createdAt ASC', req.query.channelId);
  } else if (req.query.parentId) {
    const pv = req.query.parentId === 'null' ? null : req.query.parentId;
    if (pv === null) {
      rows = await db.all('SELECT * FROM messages WHERE parentId IS NULL AND isDeleted = 0 ORDER BY createdAt ASC');
    } else {
      rows = await db.all('SELECT * FROM messages WHERE parentId = ? AND isDeleted = 0 ORDER BY createdAt ASC', pv);
    }
  } else {
    rows = await db.all('SELECT * FROM messages WHERE isDeleted = 0 ORDER BY createdAt ASC');
  }
  if (req.query.channelId && req.query.since) {
    rows = rows.filter(r => new Date(r.createdAt).getTime() > new Date(req.query.since).getTime());
  }
  res.json(rows);
});

app.get('/api/messages/search', async (req, res) => {
  const { q, channelId } = req.query;
  if (!q) return res.json([]);
  const pattern = `%${q}%`;
  let rows;
  if (channelId) {
    rows = await db.all("SELECT * FROM messages WHERE channelId = ? AND content LIKE ? AND isDeleted = 0 AND parentId IS NULL ORDER BY createdAt DESC LIMIT 50", channelId, pattern);
  } else {
    rows = await db.all("SELECT * FROM messages WHERE content LIKE ? AND isDeleted = 0 AND parentId IS NULL ORDER BY createdAt DESC LIMIT 50", pattern);
  }
  res.json(rows);
});

app.get('/api/messages/pinned/:channelId', async (req, res) => {
  const rows = await db.all("SELECT * FROM messages WHERE channelId = ? AND isPinned = 1 AND isDeleted = 0 ORDER BY pinnedAt DESC", req.params.channelId);
  res.json(rows);
});

app.get('/api/messages/starred', authenticate, async (req, res) => {
  const rows = await db.all("SELECT * FROM messages WHERE isStarred = 1 AND isDeleted = 0 ORDER BY createdAt DESC");
  res.json(rows);
});

app.post('/api/messages', async (req, res) => {
  const id = crypto.randomUUID();
  const { channelId, parentId, replyToId, userId, userName, userAvatar, content, attachments, createdAt } = req.body;

  if (channelId && !channelId.startsWith('dm-')) {
    const ch = await db.get('SELECT * FROM channels WHERE id = ?', channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (ch.type === 'private') {
      const authHeader = req.headers.authorization;
      let senderId = userId;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try { const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET); senderId = decoded.id; } catch {}
      }
      const m = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND status = ?', channelId, senderId, 'approved');
      if (!m) return res.status(403).json({ error: 'Not a member of this private channel' });
    }
  }
  let autoDeleteAt = null;
  if (channelId) {
    const ch = await db.get('SELECT auto_delete FROM channels WHERE id = ?', channelId);
    if (ch && ch.auto_delete) {
      const now = new Date();
      const durationMs = ch.auto_delete === '24h' ? 86400000 : ch.auto_delete === '7d' ? 604800000 : 2592000000;
      autoDeleteAt = new Date(now.getTime() + durationMs).toISOString();
    } else if (channelId.startsWith('dm-') && userId) {
      const parts = channelId.split('-');
      if (parts.length >= 3) {
        const otherId = parts.slice(2).join('-');
        if (otherId !== 'self') {
          const dmSet = await db.get('SELECT auto_delete FROM dm_settings WHERE userId = ? AND otherUserId = ?', userId, otherId);
          if (dmSet && dmSet.auto_delete) {
            const now = new Date();
            const durationMs = dmSet.auto_delete === '24h' ? 86400000 : dmSet.auto_delete === '7d' ? 604800000 : 2592000000;
            autoDeleteAt = new Date(now.getTime() + durationMs).toISOString();
          }
        }
      }
    }
  }
  await db.run('INSERT INTO messages (id, channelId, parentId, replyToId, userId, userName, userAvatar, content, attachments, auto_delete_at, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, channelId || '', parentId || null, replyToId || null, userId || '', userName || '', userAvatar || '', content || '', JSON.stringify(attachments || []), autoDeleteAt, createdAt || new Date().toISOString());
  if (channelId && !channelId.startsWith('dm-')) {
    await db.run("UPDATE channels SET lastMessageAt = ?, lastMessagePreview = ? WHERE id = ?",
      new Date().toISOString(), (content || '').substring(0, 100), channelId);
  }
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', id);
  res.json(msg);
});

app.patch('/api/messages/:id', authenticate, async (req, res) => {
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Cannot edit this message' });
  const { content } = req.body;
  await db.run(`UPDATE messages SET content = ?, isEdited = 1, editedAt = NOW() WHERE id = ?`,
    content || msg.content, req.params.id);
  const updated = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  res.json(updated);
});

app.delete('/api/messages/:id', authenticate, async (req, res) => {
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Cannot delete this message' });
  await db.run(`UPDATE messages SET isDeleted = 1, deletedAt = NOW(), content = 'This message was deleted' WHERE id = ?`,
    req.params.id);
  res.json({ success: true });
});

app.post('/api/messages/:id/pin', authenticate, async (req, res) => {
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  await db.run(`UPDATE messages SET isPinned = 1, pinnedAt = NOW(), pinnedBy = ? WHERE id = ?`,
    req.user.id, req.params.id);
  const updated = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  res.json(updated);
});

app.post('/api/messages/:id/unpin', authenticate, async (req, res) => {
  await db.run('UPDATE messages SET isPinned = 0, pinnedAt = NULL, pinnedBy = NULL WHERE id = ?',
    req.params.id);
  const updated = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  res.json(updated);
});

app.post('/api/messages/:id/star', authenticate, async (req, res) => {
  await db.run('UPDATE messages SET isStarred = 1 WHERE id = ?', req.params.id);
  const updated = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  res.json(updated);
});

app.post('/api/messages/:id/unstar', authenticate, async (req, res) => {
  await db.run('UPDATE messages SET isStarred = 0 WHERE id = ?', req.params.id);
  const updated = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  res.json(updated);
});

app.post('/api/messages/:id/forward', authenticate, async (req, res) => {
  const { channelId, targetChannelId, userId, userName, userAvatar } = req.body;
  const target = channelId || targetChannelId;
  if (!target) return res.status(400).json({ error: 'channelId required' });
  const original = await db.get('SELECT * FROM messages WHERE id = ?', req.params.id);
  if (!original) return res.status(404).json({ error: 'Message not found' });
  const id = crypto.randomUUID();
  await db.run('INSERT INTO messages (id, channelId, userId, userName, userAvatar, content, attachments, forwardedFrom, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id, target, userId || original.userId, userName || original.userName, userAvatar || original.userAvatar, original.content, original.attachments || '[]', original.userName, new Date().toISOString());
  await db.run("UPDATE channels SET lastMessageAt = ?, lastMessagePreview = ? WHERE id = ?",
    new Date().toISOString(), (original.content || '').substring(0, 100), target);
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', id);
  res.json(msg);
});

app.post('/api/messages/:id/read', authenticate, async (req, res) => {
  const existing = await db.get('SELECT * FROM message_reads WHERE messageId = ? AND userId = ?', req.params.id, req.user.id);
  if (!existing) {
    await db.run(`INSERT INTO message_reads (messageId, userId, readAt) VALUES (?, ?, NOW())`,
      req.params.id, req.user.id);
  }
  res.json({ success: true });
});

app.post('/api/messages/read-channel/:channelId', authenticate, async (req, res) => {
  const unread = await db.all('SELECT m.id FROM messages m LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ? WHERE m.channelId = ? AND m.parentId IS NULL AND m.isDeleted = 0 AND mr.messageId IS NULL',
    req.user.id, req.params.channelId);
  for (const msg of unread) {
    await db.run(`INSERT INTO message_reads (messageId, userId, readAt) VALUES (?, ?, NOW()) ON CONFLICT DO NOTHING`, msg.id, req.user.id);
  }
  res.json({ success: true, marked: unread.length });
});

app.get('/api/messages/unread/:channelId', authenticate, async (req, res) => {
  const count = await db.get('SELECT COUNT(*) as c FROM messages m LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ? WHERE m.channelId = ? AND m.parentId IS NULL AND m.isDeleted = 0 AND mr.messageId IS NULL',
    req.user.id, req.params.channelId);
  res.json({ count: count.c });
});

app.get('/api/messages/unread-all', authenticate, async (req, res) => {
  const rows = await db.all('SELECT m.channelId, COUNT(*) as count FROM messages m LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ? WHERE m.parentId IS NULL AND m.isDeleted = 0 AND mr.messageId IS NULL GROUP BY m.channelId',
    req.user.id);
  const result = {};
  for (const r of rows) result[r.channelId] = r.count;
  res.json(result);
});

app.get('/api/messages/read-by/:messageId', async (req, res) => {
  const rows = await db.all('SELECT mr.userId, mr.readAt, u.name, u.avatar FROM message_reads mr JOIN users u ON u.id = mr.userId WHERE mr.messageId = ?',
    req.params.messageId);
  res.json(rows);
});

app.get('/api/messages/status/:messageId', async (req, res) => {
  const msg = await db.get('SELECT * FROM messages WHERE id = ?', req.params.messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const reads = await db.get('SELECT COUNT(*) as c FROM message_reads WHERE messageId = ?', req.params.messageId);
  const totalUsers = await db.get('SELECT COUNT(*) as c FROM users');
  res.json({
    sent: true,
    delivered: reads.c > 0,
    read: reads.c >= Math.max(1, totalUsers.c - 1),
    readCount: reads.c,
    totalUsers: totalUsers.c - 1,
  });
});

app.get('/api/messages/batch-status', async (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json({});
  const idList = ids.split(',').filter(Boolean);
  const result = {};
  for (const id of idList) {
    const reads = await db.get('SELECT COUNT(*) as c FROM message_reads WHERE messageId = ?', id);
    const totalUsers = await db.get('SELECT COUNT(*) as c FROM users');
    result[id] = {
      sent: true,
      delivered: reads.c > 0,
      read: reads.c >= Math.max(1, totalUsers.c - 1),
      readCount: reads.c,
    };
  }
  res.json(result);
});

// ─── Reactions ────────────────────────────────────────────
app.get('/api/reactions', async (req, res) => {
  if (req.query.messageId) {
    res.json(await db.all('SELECT * FROM reactions WHERE messageId = ?', req.query.messageId));
  } else {
    res.json(await db.all('SELECT * FROM reactions'));
  }
});

app.post('/api/reactions', async (req, res) => {
  const id = crypto.randomUUID();
  const { messageId, emoji, userName } = req.body;
  const userId = req.user?.id || req.body.userId || '';
  await db.run('INSERT INTO reactions (id, messageId, emoji, userId, userName) VALUES (?, ?, ?, ?, ?)',
    id, messageId, emoji, userId, userName || '');
  const reaction = await db.get('SELECT * FROM reactions WHERE id = ?', id);
  res.json(reaction);
});

app.delete('/api/reactions/:id', async (req, res) => {
  await db.run('DELETE FROM reactions WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// ─── Comments ─────────────────────────────────────────────
app.get('/api/comments', async (req, res) => {
  if (req.query.taskId) {
    res.json(await db.all('SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC', req.query.taskId));
  } else {
    res.json(await db.all('SELECT * FROM comments ORDER BY createdAt ASC'));
  }
});

app.post('/api/comments', async (req, res) => {
  const id = crypto.randomUUID();
  const { taskId, userId, userName, content, createdAt } = req.body;
  await db.run('INSERT INTO comments (id, taskId, userId, userName, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    id, taskId || '', userId || '', userName || '', content || '', createdAt || new Date().toISOString());
  const comment = await db.get('SELECT * FROM comments WHERE id = ?', id);
  res.json(comment);
});

// ─── File Uploads ────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|zip|mp3|wav|ogg|webm|m4a|aac|opus/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = file.mimetype.startsWith('image/') || file.mimetype.startsWith('text/') || file.mimetype.startsWith('application/') || file.mimetype.startsWith('audio/');
    cb(null, ext || mime);
  },
});

app.post('/api/uploads', authenticate, upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const files = req.files.map((f) => ({
    id: f.filename,
    name: f.originalname,
    size: f.size,
    type: f.mimetype,
      url: `/api/uploads/${f.filename}`,
    uploadedBy: req.user.id,
    uploadedAt: new Date().toISOString(),
  }));
  res.json(files);
});

app.get('/api/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.webm': 'audio/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
    '.opus': 'audio/opus', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif', '.pdf': 'application/pdf',
    '.txt': 'text/plain', '.csv': 'text/csv',
  };
  const mime = mimeMap[ext];
  if (mime) res.setHeader('Content-Type', mime);
  res.sendFile(filePath);
});

app.delete('/api/uploads/:filename', authenticate, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ success: true });
});

// ─── Typing Indicators ─────────────────────────────────────
app.post('/api/typing', authenticate, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'channelId required' });
  const expiresAt = new Date(Date.now() + 5000).toISOString();
  await db.run('INSERT INTO typing_indicators (channelId, userId, userName, expiresAt) VALUES (?, ?, ?, ?) ON CONFLICT (channelId, userId) DO UPDATE SET userName = EXCLUDED.userName, expiresAt = EXCLUDED.expiresAt',
    channelId, req.user.id, req.user.name, expiresAt);
  res.json({ success: true });
});

app.get('/api/typing/:channelId', async (req, res) => {
  const now = new Date().toISOString();
  await db.run('DELETE FROM typing_indicators WHERE expiresAt < ?', now);
  const rows = await db.all('SELECT userId, userName FROM typing_indicators WHERE channelId = ? AND userId != ?',
    req.params.channelId, req.query.excludeUserId || '');
  res.json(rows);
});

// ─── Read Receipts ─────────────────────────────────────────
app.get('/api/messages/:id/read-status', async (req, res) => {
  const rows = await db.all(`
    SELECT mr.userId, mr.readAt, u.name FROM message_reads mr
    JOIN users u ON mr.userId = u.id WHERE mr.messageId = ?
  `, req.params.id);
  res.json(rows);
});

// ─── Audit Log ─────────────────────────────────────────────
app.post('/api/audit', authenticate, async (req, res) => {
  const { action, target, details } = req.body;
  const id = crypto.randomUUID();
  await db.run('INSERT INTO audit_log (id, userId, userName, action, target, details) VALUES (?, ?, ?, ?, ?, ?)',
    id, req.user.id, req.user.name, action, target || '', details || '');
  res.json({ success: true });
});

app.get('/api/audit', authenticate, requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const rows = await db.all('SELECT * FROM audit_log ORDER BY createdAt DESC LIMIT ? OFFSET ?', limit, offset);
  const totalRow = await db.get('SELECT COUNT(*) as cnt FROM audit_log');
  res.json({ rows, total: totalRow.cnt });
});

// ─── Task Dependencies ─────────────────────────────────────
app.get('/api/tasks/:id/dependencies', async (req, res) => {
  const deps = await db.all(`
    SELECT td.dependsOnId, t.title, t.status FROM task_dependencies td
    JOIN tasks t ON td.dependsOnId = t.id WHERE td.taskId = ?
  `, req.params.id);
  const blockedBy = await db.all(`
    SELECT td.taskId as blockedTaskId, t.title, t.status FROM task_dependencies td
    JOIN tasks t ON td.taskId = t.id WHERE td.dependsOnId = ?
  `, req.params.id);
  res.json({ dependsOn: deps, blockedBy });
});

app.post('/api/tasks/:id/dependencies', authenticate, async (req, res) => {
  const { dependsOnId } = req.body;
  if (!dependsOnId) return res.status(400).json({ error: 'dependsOnId required' });
  if (req.params.id === dependsOnId) return res.status(400).json({ error: 'Cannot depend on self' });
  const exists = await db.get('SELECT 1 FROM tasks WHERE id = ?', dependsOnId);
  if (!exists) return res.status(404).json({ error: 'Task not found' });
  await db.run('INSERT INTO task_dependencies (taskId, dependsOnId) VALUES (?, ?) ON CONFLICT DO NOTHING', req.params.id, dependsOnId);
  res.json({ success: true });
});

app.delete('/api/tasks/:id/dependencies/:depId', authenticate, async (req, res) => {
  await db.run('DELETE FROM task_dependencies WHERE taskId = ? AND dependsOnId = ?', req.params.id, req.params.depId);
  res.json({ success: true });
});

// ─── Channel Description ───────────────────────────────────
app.patch('/api/channels/:id/description', authenticate, async (req, res) => {
  const { description, topic } = req.body;
  const ch = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const member = await db.get('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ? AND status = ?',
    req.params.id, req.user.id, 'admin', 'approved');
  if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Not channel admin' });
  if (description !== undefined) await db.run('UPDATE channels SET description = ? WHERE id = ?', description, req.params.id);
  if (topic !== undefined) await db.run('UPDATE channels SET topic = ? WHERE id = ?', topic, req.params.id);
  const result = await db.get('SELECT * FROM channels WHERE id = ?', req.params.id);
  res.json(result);
});

// ─── Custom Status ─────────────────────────────────────────
app.post('/api/users/status', authenticate, async (req, res) => {
  const { status, statusEmoji } = req.body;
  await db.run("UPDATE users SET status = ?, statusEmoji = ?, updatedAt = NOW() WHERE id = ?",
    status || '', statusEmoji || '', req.user.id);
  const updated = await db.get('SELECT * FROM users WHERE id = ?', req.user.id);
  res.json(safeUser(updated));
});

// ─── Two-Factor Authentication ─────────────────────────────
const crypto2 = require('crypto');
app.post('/api/2fa/setup', authenticate, async (req, res) => {
  const secret = crypto2.randomBytes(20).toString('hex');
  await db.run("UPDATE users SET twoFactorSecret = ?, updatedAt = NOW() WHERE id = ?", secret, req.user.id);
  const otpauth = `otpauth://totp/SokoTeams:${req.user.username}?secret=${secret}&issuer=SokoTeams`;
  res.json({ secret, otpauth });
});

app.post('/api/2fa/verify', authenticate, async (req, res) => {
  const { code } = req.body;
  const user = await db.get('SELECT twoFactorSecret FROM users WHERE id = ?', req.user.id);
  if (!user?.twoFactorSecret) return res.status(400).json({ error: '2FA not set up' });
  const counter = Math.floor(Date.now() / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', Buffer.from(user.twoFactorSecret, 'hex')).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const otp = ((hmac[offset] & 0x7f) << 24 | (hmac[offset+1] & 0xff) << 16 | (hmac[offset+2] & 0xff) << 8 | (hmac[offset+3] & 0xff)) % 1000000;
  const expected = String(otp).padStart(6, '0');
  if (code === expected) {
    await db.run("UPDATE users SET twoFactorEnabled = 1, updatedAt = NOW() WHERE id = ?", req.user.id);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});

app.post('/api/2fa/disable', authenticate, async (req, res) => {
  await db.run("UPDATE users SET twoFactorEnabled = 0, twoFactorSecret = NULL, updatedAt = NOW() WHERE id = ?", req.user.id);
  res.json({ success: true });
});

// ─── Data Export ───────────────────────────────────────────
app.get('/api/export', authenticate, async (req, res) => {
  const format = req.query.format || 'json';
  const tasks = await db.all('SELECT * FROM tasks WHERE assignedUserId = ?', req.user.id);
  const messages = await db.all('SELECT * FROM messages WHERE userId = ?', req.user.id);
  const projects = await db.all('SELECT p.* FROM projects p JOIN project_members pm ON p.id = pm.projectId WHERE pm.userId = ?', req.user.id);
  const data = { user: safeUser(await db.get('SELECT * FROM users WHERE id = ?', req.user.id)), tasks, messages, projects, exportedAt: new Date().toISOString() };
  if (format === 'csv') {
    let csv = 'Type,Id,Title,Status,Priority,CreatedAt\n';
    tasks.forEach(t => { csv += `task,${t.id},"${(t.title||'').replace(/"/g,'""')}",${t.status},${t.priority},${t.createdAt}\n`; });
    projects.forEach(p => { csv += `project,${p.id},"${(p.title||'').replace(/"/g,'""')}",${p.status},,${p.createdAt}\n`; });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sokoteams-export.csv"');
    return res.send(csv);
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="sokoteams-export.json"');
  res.json(data);
});

// ─── Saved Messages ────────────────────────────────────────
app.post('/api/saved-messages', authenticate, async (req, res) => {
  const { messageId, channelId } = req.body;
  if (!messageId || !channelId) return res.status(400).json({ error: 'messageId and channelId required' });
  const existing = await db.get('SELECT id FROM saved_messages WHERE userId = ? AND messageId = ?', req.user.id, messageId);
  if (existing) return res.status(400).json({ error: 'Already saved' });
  const id = crypto.randomUUID();
  await db.run('INSERT INTO saved_messages (id, userId, messageId, channelId) VALUES (?, ?, ?, ?)', id, req.user.id, messageId, channelId);
  res.json({ success: true, id });
});

app.delete('/api/saved-messages/:messageId', authenticate, async (req, res) => {
  await db.run('DELETE FROM saved_messages WHERE userId = ? AND messageId = ?', req.user.id, req.params.messageId);
  res.json({ success: true });
});

app.get('/api/saved-messages', authenticate, async (req, res) => {
  const rows = await db.all(`
    SELECT sm.*, m.content, m.userName, m.createdAt as msgCreatedAt, c.name as channelName
    FROM saved_messages sm
    JOIN messages m ON sm.messageId = m.id
    JOIN channels c ON sm.channelId = c.id
    WHERE sm.userId = ? ORDER BY sm.savedAt DESC
  `, req.user.id);
  res.json(rows);
});

// ─── User Groups ───────────────────────────────────────────
app.get('/api/user-groups', authenticate, async (req, res) => {
  const groups = await db.all('SELECT * FROM user_groups ORDER BY name');
  const result = [];
  for (const g of groups) {
    const members = await db.all('SELECT u.id, u.name, u.avatar FROM user_group_members ugm JOIN users u ON ugm.userId = u.id WHERE ugm.groupId = ?', g.id);
    result.push({ ...g, members });
  }
  res.json(result);
});

app.post('/api/user-groups', authenticate, requireAdmin, async (req, res) => {
  const { name, description, color, memberIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = crypto.randomUUID();
  await db.run('INSERT INTO user_groups (id, name, description, color, createdBy) VALUES (?, ?, ?, ?, ?)', id, name, description || '', color || '#3b82f6', req.user.id);
  if (Array.isArray(memberIds)) {
    for (const uid of memberIds) await db.run('INSERT INTO user_group_members (groupId, userId) VALUES (?, ?) ON CONFLICT DO NOTHING', id, uid);
  }
  const group = await db.get('SELECT * FROM user_groups WHERE id = ?', id);
  res.json(group);
});

app.delete('/api/user-groups/:id', authenticate, requireAdmin, async (req, res) => {
  await db.run('DELETE FROM user_groups WHERE id = ?', req.params.id);
  res.json({ success: true });
});

// ─── Polls ─────────────────────────────────────────────────
app.post('/api/polls', authenticate, async (req, res) => {
  const { channelId, question, options, expiresAt } = req.body;
  if (!channelId || !question || !options?.length) return res.status(400).json({ error: 'channelId, question, and options required' });
  const id = crypto.randomUUID();
  const votes = {};
  options.forEach((_, i) => { votes[i] = []; });
  await db.run('INSERT INTO polls (id, channelId, userId, userName, question, options, votes, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    id, channelId, req.user.id, req.user.name, question, JSON.stringify(options), JSON.stringify(votes), expiresAt || null);
  const poll = await db.get('SELECT * FROM polls WHERE id = ?', id);
  res.json(poll);
});

app.post('/api/polls/:id/vote', authenticate, async (req, res) => {
  const { optionIndex } = req.body;
  const poll = await db.get('SELECT * FROM polls WHERE id = ?', req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.isClosed) return res.status(400).json({ error: 'Poll is closed' });
  const votes = JSON.parse(poll.votes || '{}');
  Object.keys(votes).forEach(k => { votes[k] = votes[k].filter(v => v !== req.user.id); });
  if (!votes[optionIndex]) votes[optionIndex] = [];
  votes[optionIndex].push(req.user.id);
  await db.run('UPDATE polls SET votes = ? WHERE id = ?', JSON.stringify(votes), req.params.id);
  res.json({ success: true });
});

app.post('/api/polls/:id/close', authenticate, async (req, res) => {
  await db.run('UPDATE polls SET isClosed = 1 WHERE id = ? AND userId = ?', req.params.id, req.user.id);
  res.json({ success: true });
});

app.get('/api/polls/:channelId', async (req, res) => {
  const polls = await db.all('SELECT * FROM polls WHERE channelId = ? ORDER BY createdAt DESC LIMIT 10', req.params.channelId);
  res.json(polls);
});

// ─── Message Edit History ──────────────────────────────────
app.get('/api/messages/:id/history', async (req, res) => {
  const rows = await db.all('SELECT * FROM message_edit_history WHERE messageId = ? ORDER BY editedAt DESC', req.params.id);
  res.json(rows);
});

// ─── Notifications ─────────────────────────────────────────
app.get('/api/notifications', authenticate, async (req, res) => {
  const rows = await db.all('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50', req.user.id);
  const unreadRow = await db.get('SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND isRead = 0', req.user.id);
  res.json({ notifications: rows, unread: unreadRow.cnt });
});

app.post('/api/notifications/read', authenticate, async (req, res) => {
  const { ids } = req.body;
  if (ids && Array.isArray(ids)) {
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`UPDATE notifications SET isRead = 1 WHERE id IN (${placeholders}) AND userId = ?`, ...ids, req.user.id);
  } else {
    await db.run('UPDATE notifications SET isRead = 1 WHERE userId = ?', req.user.id);
  }
  res.json({ success: true });
});

// ─── Calendar ──────────────────────────────────────────────
app.get('/api/calendar', authenticate, async (req, res) => {
  const { start, end } = req.query;
  const startDate = start || '2020-01-01';
  const endDate = end || '2030-12-31';
  const tasks = await db.all(`
    SELECT t.*, p.title as projectTitle, p.color as projectColor
    FROM tasks t LEFT JOIN projects p ON t.projectId = p.id
    WHERE t.assignedUserId = ? AND t.isArchived = 0
    AND ((t.dueDate >= ? AND t.dueDate <= ?) OR (t.startDate >= ? AND t.startDate <= ?) OR (t.startDate <= ? AND t.dueDate >= ?))
    ORDER BY t.dueDate ASC
  `, req.user.id, startDate, endDate, startDate, endDate, startDate, endDate);
  res.json(tasks);
});

// ─── Batch Operations ──────────────────────────────────────
app.post('/api/tasks/batch', authenticate, requireAdmin, async (req, res) => {
  const { ids, action, value } = req.body;
  if (!ids?.length || !action) return res.status(400).json({ error: 'ids and action required' });
  const placeholders = ids.map(() => '?').join(',');
  if (action === 'archive') {
    await db.run(`UPDATE tasks SET isArchived = 1, archivedAt = NOW() WHERE id IN (${placeholders})`, ...ids);
  } else if (action === 'restore') {
    await db.run(`UPDATE tasks SET isArchived = 0, archivedAt = NULL WHERE id IN (${placeholders})`, ...ids);
  } else if (action === 'status') {
    await db.run(`UPDATE tasks SET status = ?, updatedAt = NOW() WHERE id IN (${placeholders})`, value, ...ids);
  } else if (action === 'priority') {
    await db.run(`UPDATE tasks SET priority = ?, updatedAt = NOW() WHERE id IN (${placeholders})`, value, ...ids);
  } else if (action === 'delete') {
    await db.run(`DELETE FROM tasks WHERE id IN (${placeholders})`, ...ids);
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
  res.json({ success: true, affected: ids.length });
});

// ─── Invite by Email ───────────────────────────────────────
app.post('/api/invites', authenticate, requireAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  await db.run('INSERT INTO invites (id, email, invitedBy, role, expiresAt) VALUES (?, ?, ?, ?, ?)', id, email, req.user.id, role || 'user', expiresAt);
  const inviteLink = `http://localhost:5173/register?invite=${id}`;
  sendEmail(email, 'You\'re invited to SokoTeams!', `You\'ve been invited to join SokoTeams. Click here to register: ${inviteLink}`).catch(() => {});
  res.json({ success: true, id, inviteLink });
});

app.get('/api/invites', authenticate, requireAdmin, async (req, res) => {
  const rows = await db.all('SELECT i.*, u.name as invitedByName FROM invites i JOIN users u ON i.invitedBy = u.id ORDER BY i.createdAt DESC');
  res.json(rows);
});

// ─── Time Tracking ─────────────────────────────────────────
app.post('/api/tasks/:id/time', authenticate, async (req, res) => {
  const { hours } = req.body;
  if (hours === undefined) return res.status(400).json({ error: 'hours required' });
  await db.run("UPDATE tasks SET timeLogged = timeLogged + ?, updatedAt = NOW() WHERE id = ?", parseFloat(hours), req.params.id);
  const task = await db.get('SELECT timeLogged FROM tasks WHERE id = ?', req.params.id);
  res.json({ success: true, timeLogged: task?.timeLogged || 0 });
});

// ─── Health ───────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({ status: 'ok', database: 'postgresql', smtpConfigured, authEnabled: true });
});

// ─── Email ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' },
});

app.post('/send-email', async (req, res) => {
  const { to_email, to_name, subject, message } = req.body;
  if (!to_email || !subject || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const html = `
    <div style="font-family: sans-serif; max-width:560px; margin:0 auto; padding:24px;">
      <div style="background:#2563eb; padding:16px 24px; border-radius:8px 8px 0 0;">
        <h1 style="color:#fff; margin:0; font-size:18px;">SokoTeams</h1>
      </div>
      <div style="border:1px solid #e5e7eb; border-top:0; padding:24px; border-radius:0 0 8px 8px;">
        <p style="margin:0 0 16px; color:#374151; font-size:14px;">Hi ${to_name || 'there'},</p>
        <p style="margin:0 0 16px; color:#374151; font-size:14px;">${message}</p>
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
        <p style="margin:0; color:#9ca3af; font-size:12px;">Sent from SokoTeams</p>
      </div>
    </div>`;
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'SokoTeams'}" <${process.env.FROM_EMAIL || 'noreply@sokoteams.com'}>`,
      to: `"${to_name}" <${to_email}>`,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] ${info.messageId} -> ${to_email}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('[EMAIL FAILED]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Presence ─────────────────────────────────────────────
app.post('/api/presence/heartbeat', authenticate, async (req, res) => {
  await db.run(`UPDATE users SET lastSeen = NOW() WHERE id = ?`, req.user.id);
  res.json({ ok: true });
});

app.get('/api/presence/status', async (req, res) => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  const users = await db.all(`SELECT id, lastSeen FROM users`);
  const status = {};
  for (const u of users) {
    status[u.id] = u.lastSeen && u.lastSeen > fiveMinAgo ? 'online' : 'offline';
  }
  res.json(status);
});

// ─── Serve frontend in production ─────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

async function start() {
  await initDb();
  db = getDb();
  
  app.listen(PORT, () => {
    console.log(`\n  SokoTeams API Server${isProduction ? ' (production)' : ''}`);
    console.log(`  ─────────────────`);
    console.log(`  Database: PostgreSQL`);
    console.log(`  Port:     ${PORT}`);
    console.log(`  Auth:     /api/auth/login`);
    console.log(`  Users:    /api/users`);
    console.log(`  Projects: /api/projects`);
    console.log(`  Tasks:    /api/tasks`);
    console.log(`  Messages: /api/messages`);
    console.log(`  Health:   /api/health`);
    console.log(`  SMTP:     ${process.env.SMTP_USER ? 'configured' : 'NOT configured'}`);
    console.log(`  CORS:     ${allowedOrigins.join(', ')}`);
    if (isProduction) {
      console.log(`  Frontend: serving from dist/\n`);
    } else {
      console.log(`\n`);
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
