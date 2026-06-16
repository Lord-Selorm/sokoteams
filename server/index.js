require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, initDb } = require('./db');

const app = express();

// CORS — restrict in production
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

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

function taskFromRow(row) {
  if (!row) return null;
  const user = row.assignedUserId
    ? db.prepare('SELECT * FROM users WHERE id = ?').get(row.assignedUserId)
    : null;
  return {
    ...row,
    assignedUser: user ? safeUser(user) : { id: '0', name: 'Unassigned', email: '', avatar: '', role: 'user' },
    tags: parseJsonField(row.tags),
    subtasks: db.prepare('SELECT * FROM subtasks WHERE taskId = ?').all(row.id),
    dependencies: [],
    dependentTasks: [],
    followers: db.prepare('SELECT u.* FROM task_followers tf JOIN users u ON u.id = tf.userId WHERE tf.taskId = ?').all(row.id).map(safeUser),
  };
}

function projectFromRow(row) {
  if (!row) return null;
  const members = db.prepare('SELECT pm.*, u.id as uid, u.name, u.email, u.avatar, u.role FROM project_members pm JOIN users u ON u.id = pm.userId WHERE pm.projectId = ?')
    .all(row.id)
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
  const user = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?').get(key, key);
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
  const exists = db.prepare('SELECT id FROM users WHERE lower(username) = ? OR lower(email) = ?').get(key, email.toLowerCase());
  if (exists) return res.status(409).json({ success: false, error: 'Username or email already taken' });
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  db.prepare('INSERT INTO users (id, username, name, email, avatar, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, key, name, email, avatar, count === 0 ? 'admin' : 'user', department || '', passwordHash);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.json({ success: true, token, user: safeUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({ success: true, user: safeUser(user) });
});

// ─── Users (authenticated) ────────────────────────────────
app.get('/api/users', (_req, res) => {
  const users = db.prepare('SELECT * FROM users').all().map(safeUser);
  res.json(users);
});

app.get('/api/users/blocked', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.name, u.email, u.avatar, u.role, u.department
    FROM blocked_users bu
    JOIN users u ON bu.blockedUserId = u.id
    WHERE bu.userId = ?
  `).all(req.user.id);
  res.json(rows.map(safeUser));
});

app.get('/api/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json(safeUser(user));
});

app.patch('/api/users/:id/role', authenticate, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user', 'guest'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  db.prepare(`UPDATE users SET role = ?, updatedAt = datetime('now') WHERE id = ?`).run(role, req.params.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(safeUser(updated));
});

app.patch('/api/users/:id', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (req.user.id !== req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Cannot edit other users' });
  }
  const email = req.body.email || user.email;
  const name = req.body.name || user.name;
  const department = req.body.department !== undefined ? req.body.department : user.department;
  const avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
  db.prepare(`UPDATE users SET email = ?, name = ?, department = ?, avatar = ?, updatedAt = datetime('now') WHERE id = ?`)
    .run(email, name, department, avatar, req.params.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(safeUser(updated));
});

// ─── Change Password ───────────────────────────────────────
app.post('/api/users/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const valid = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET passwordHash = ?, updatedAt = datetime('now') WHERE id = ?").run(hash, req.user.id);
  res.json({ success: true });
});

// ─── Delete Account ────────────────────────────────────────
app.delete('/api/users/me', authenticate, (req, res) => {
  const userId = req.user.id;
  const fs = require('fs');
  const path = require('path');
  const msgs = db.prepare('SELECT id, attachments FROM messages WHERE userId = ?').all(userId);
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
  db.prepare('DELETE FROM reactions WHERE userId = ?').run(userId);
  db.prepare('DELETE FROM message_reads WHERE userId = ?').run(userId);
  db.prepare("UPDATE messages SET isDeleted = 1, content = '[deleted user]' WHERE userId = ?").run(userId);
  db.prepare('DELETE FROM comments WHERE userId = ?').run(userId);
  db.prepare('DELETE FROM subtasks WHERE assigneeId = ?').run(userId);
  db.prepare('DELETE FROM project_members WHERE userId = ?').run(userId);
  db.prepare('DELETE FROM channel_members WHERE userId = ?').run(userId);
  db.prepare('DELETE FROM blocked_users WHERE userId = ? OR blockedUserId = ?').run(userId, userId);
  db.prepare('DELETE FROM dm_settings WHERE userId = ? OR otherUserId = ?').run(userId, userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ success: true });
});

// ─── DM Settings ───────────────────────────────────────────
app.get('/api/dm-settings/:otherUserId', authenticate, (req, res) => {
  const row = db.prepare('SELECT * FROM dm_settings WHERE userId = ? AND otherUserId = ?').get(req.user.id, req.params.otherUserId);
  res.json(row || { auto_delete: null, isMuted: 0 });
});

app.patch('/api/dm-settings/:otherUserId', authenticate, (req, res) => {
  const { auto_delete, isMuted } = req.body;
  const existing = db.prepare('SELECT * FROM dm_settings WHERE userId = ? AND otherUserId = ?').get(req.user.id, req.params.otherUserId);
  if (existing) {
    const updates = [];
    const params = [];
    if (auto_delete !== undefined) { updates.push('auto_delete = ?'); params.push(auto_delete); }
    if (isMuted !== undefined) { updates.push('isMuted = ?'); params.push(isMuted); }
    if (updates.length > 0) {
      params.push(req.user.id, req.params.otherUserId);
      db.prepare(`UPDATE dm_settings SET ${updates.join(', ')} WHERE userId = ? AND otherUserId = ?`).run(...params);
    }
  } else {
    db.prepare('INSERT INTO dm_settings (userId, otherUserId, auto_delete, isMuted) VALUES (?, ?, ?, ?)').run(
      req.user.id, req.params.otherUserId, auto_delete || null, isMuted || 0
    );
  }
  const updated = db.prepare('SELECT * FROM dm_settings WHERE userId = ? AND otherUserId = ?').get(req.user.id, req.params.otherUserId);
  res.json(updated);
});

app.delete('/api/dm/:otherUserId/messages', authenticate, (req, res) => {
  const sorted = [req.user.id, req.params.otherUserId].sort();
  const channelId = `dm-${sorted[0]}-${sorted[1]}`;
  const msgs = db.prepare('SELECT id, attachments FROM messages WHERE channelId = ?').all(channelId);
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
  db.prepare('DELETE FROM reactions WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)').run(channelId);
  db.prepare('DELETE FROM message_reads WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)').run(channelId);
  db.prepare('DELETE FROM messages WHERE channelId = ?').run(channelId);
  res.json({ success: true });
});

// ─── Block/Unblock Users ────────────────────────────────────
app.post('/api/users/:id/block', authenticate, (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'Cannot block yourself' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('INSERT OR IGNORE INTO blocked_users (userId, blockedUserId) VALUES (?, ?)').run(req.user.id, req.params.id);
  res.json({ success: true });
});

app.delete('/api/users/:id/block', authenticate, (req, res) => {
  db.prepare('DELETE FROM blocked_users WHERE userId = ? AND blockedUserId = ?').run(req.user.id, req.params.id);
  res.json({ success: true });
});

app.get('/api/users/:id/block-status', authenticate, (req, res) => {
  const blockedByMe = db.prepare('SELECT 1 FROM blocked_users WHERE userId = ? AND blockedUserId = ?').get(req.user.id, req.params.id);
  const iAmBlockedBy = db.prepare('SELECT 1 FROM blocked_users WHERE userId = ? AND blockedUserId = ?').get(req.params.id, req.user.id);
  res.json({ blockedByMe: !!blockedByMe, blockedByThem: !!iAmBlockedBy });
});

// ─── Projects (authenticated) ─────────────────────────────
app.get('/api/projects', (req, res) => {
  const includeArchived = req.query.archived === '1';
  const rows = db.prepare('SELECT * FROM projects WHERE isArchived = ?').all(includeArchived ? 1 : 0);
  res.json(rows.map(projectFromRow));
});

app.get('/api/projects/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Project not found' });
  res.json(projectFromRow(row));
});

app.post('/api/projects', authenticate, (req, res) => {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const p = req.body;
  db.prepare('INSERT INTO projects (id, title, description, status, completionPercentage, dueDate, startDate, color, icon, ownerId, workspaceId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, p.title || '', p.description || '', p.status || 'active', p.completionPercentage || 0, p.dueDate || '', p.startDate || '', p.color || 'blue', p.icon || '', p.ownerId || '', p.workspaceId || 'default', now, now);
  if (Array.isArray(p.members)) {
    const ins = db.prepare('INSERT INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)');
    for (const m of p.members) {
      if (m.user?.id) ins.run(id, m.user.id, m.projectRole || 'member');
    }
  }
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.json(projectFromRow(row));
});

app.patch('/api/projects/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Project not found' });
  const p = req.body;
  db.prepare(`UPDATE projects SET title=?, description=?, status=?, completionPercentage=?, dueDate=?, startDate=?, color=?, icon=?, ownerId=?, workspaceId=?, updatedAt=datetime('now') WHERE id=?`)
    .run(p.title ?? existing.title, p.description ?? existing.description, p.status ?? existing.status, p.completionPercentage ?? existing.completionPercentage, p.dueDate ?? existing.dueDate, p.startDate ?? existing.startDate, p.color ?? existing.color, p.icon ?? existing.icon, p.ownerId ?? existing.ownerId, p.workspaceId ?? existing.workspaceId, req.params.id);
  if (Array.isArray(p.members)) {
    db.prepare('DELETE FROM project_members WHERE projectId = ?').run(req.params.id);
    const ins = db.prepare('INSERT INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)');
    for (const m of p.members) {
      if (m.user?.id) ins.run(req.params.id, m.user.id, m.projectRole || 'member');
    }
  }
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(projectFromRow(row));
});

app.delete('/api/projects/:id', authenticate, (req, res) => {
  const r = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ success: false, error: 'Project not found' });
  res.json({ success: true });
});

app.patch('/api/projects/:id/members', authenticate, (req, res) => {
  const { members } = req.body;
  if (!Array.isArray(members)) return res.status(400).json({ success: false, error: 'members must be an array' });
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  const isLead = db.prepare('SELECT 1 FROM project_members WHERE projectId = ? AND userId = ? AND projectRole = "lead"').get(req.params.id, req.user.id);
  if (req.user.role !== 'admin' && !isLead) {
    return res.status(403).json({ success: false, error: 'Only admins and project leads can modify roles' });
  }
  db.prepare('DELETE FROM project_members WHERE projectId = ?').run(req.params.id);
  const ins = db.prepare('INSERT INTO project_members (projectId, userId, projectRole) VALUES (?, ?, ?)');
  for (const m of members) {
    if (m.user?.id) ins.run(req.params.id, m.user.id, m.projectRole || 'member');
  }
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(projectFromRow(row));
});

// ─── Tasks (authenticated) ────────────────────────────────
app.get('/api/tasks', (req, res) => {
  const includeArchived = req.query.archived === '1';
  let rows;
  if (req.query.projectId) {
    rows = db.prepare('SELECT * FROM tasks WHERE projectId = ? AND isArchived = ?').all(req.query.projectId, includeArchived ? 1 : 0);
  } else if (req.query.assignedUserId) {
    rows = db.prepare('SELECT * FROM tasks WHERE assignedUserId = ? AND isArchived = ?').all(req.query.assignedUserId, includeArchived ? 1 : 0);
  } else {
    rows = db.prepare('SELECT * FROM tasks WHERE isArchived = ?').all(includeArchived ? 1 : 0);
  }
  res.json(rows.map(taskFromRow));
});

app.get('/api/tasks/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json(taskFromRow(row));
});

app.post('/api/tasks', authenticate, (req, res) => {
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
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }
  }

  // Validate assignedUserId exists
  const assignedUserId = t.assignedUser?.id || '';
  if (assignedUserId) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedUserId);
    if (!user) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }
  }

  db.prepare('INSERT INTO tasks (id, projectId, title, description, priority, status, dueDate, startDate, assignedUserId, tags, estimatedHours, actualHours, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, projectId, t.title.trim(), t.description || '', t.priority || 'Medium', t.status || 'Todo', t.dueDate || '', t.startDate || '', assignedUserId, JSON.stringify(t.tags || []), t.estimatedHours || 0, t.actualHours || 0, t.completedAt || '', now, now);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(taskFromRow(row));
});

app.patch('/api/tasks/:id', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Task not found' });
  const t = req.body;

  const projectId = t.projectId ?? existing.projectId;
  const assignedUserId = t.assignedUser?.id !== undefined ? t.assignedUser.id : existing.assignedUserId;

  // Validate projectId exists
  if (projectId) {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }
  }

  // Validate assignedUserId exists
  if (assignedUserId) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedUserId);
    if (!user) {
      return res.status(400).json({ success: false, error: 'User not found' });
    }
  }

  db.prepare(`UPDATE tasks SET projectId=?, title=?, description=?, priority=?, status=?, dueDate=?, startDate=?, assignedUserId=?, tags=?, estimatedHours=?, actualHours=?, completedAt=?, updatedAt=datetime('now') WHERE id=?`)
    .run(projectId, t.title ?? existing.title, t.description ?? existing.description, t.priority ?? existing.priority, t.status ?? existing.status, t.dueDate ?? existing.dueDate, t.startDate ?? existing.startDate, assignedUserId, JSON.stringify(t.tags ?? parseJsonField(existing.tags)), t.estimatedHours ?? existing.estimatedHours, t.actualHours ?? existing.actualHours, t.completedAt ?? existing.completedAt, req.params.id);
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(taskFromRow(row));
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  const r = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true });
});

app.patch('/api/tasks/:id/archive', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const archived = task.isArchived ? 0 : 1;
  db.prepare('UPDATE tasks SET isArchived = ?, archivedAt = ? WHERE id = ?')
    .run(archived, archived ? new Date().toISOString() : null, req.params.id);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id));
});

app.patch('/api/projects/:id/archive', authenticate, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const archived = project.isArchived ? 0 : 1;
  db.prepare('UPDATE projects SET isArchived = ?, archivedAt = ? WHERE id = ?')
    .run(archived, archived ? new Date().toISOString() : null, req.params.id);
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

// ─── Channels ─────────────────────────────────────────────
app.get('/api/channels', (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }
  if (userId) {
    const channels = db.prepare(`
      SELECT c.* FROM channels c
      JOIN channel_members cm ON c.id = cm.channelId
      WHERE cm.userId = ? AND cm.status = 'approved'
      ORDER BY c.pinned DESC, c.lastMessageAt DESC
    `).all(userId);
    res.json(channels);
  } else {
    res.json(db.prepare('SELECT * FROM channels ORDER BY pinned DESC, lastMessageAt DESC').all());
  }
});

app.get('/api/channels/all', (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }
  if (userId) {
    const channels = db.prepare(`
      SELECT c.*, 
        CASE WHEN cm.status = 'approved' THEN 1 ELSE 0 END as isMember,
        COALESCE(cm.status, 'none') as membershipStatus
      FROM channels c
      LEFT JOIN channel_members cm ON c.id = cm.channelId AND cm.userId = ?
      WHERE c.type = 'public' OR cm.status = 'approved' OR cm.status = 'pending'
      ORDER BY c.pinned DESC, c.lastMessageAt DESC
    `).all(userId);
    res.json(channels);
  } else {
    res.json(db.prepare("SELECT * FROM channels WHERE type = 'public' ORDER BY pinned DESC, lastMessageAt DESC").all());
  }
});

app.get('/api/channels/:id', (req, res) => {
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json(ch);
});

app.post('/api/channels', authenticate, (req, res) => {
  const { id, name, type, workspaceId, description, topic, avatar } = req.body;
  const cid = id || name.toLowerCase().replace(/\s+/g, '-');
  db.prepare('INSERT OR REPLACE INTO channels (id, name, type, workspaceId, description, topic, createdBy, avatar) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(cid, name, type || 'public', workspaceId || '1', description || '', topic || '', req.user.id, avatar || '');
  db.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)').run(cid, req.user.id, 'admin', 'approved');
  res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(cid));
});

app.patch('/api/channels/:id', authenticate, (req, res) => {
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const { name, description, topic, pinned, avatar } = req.body;
  db.prepare('UPDATE channels SET name=?, description=?, topic=?, pinned=?, avatar=? WHERE id=?')
    .run(name ?? ch.name, description ?? ch.description, topic ?? ch.topic, pinned ?? ch.pinned, avatar ?? ch.avatar, req.params.id);
  res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id));
});

app.delete('/api/channels/:id', (req, res) => {
  db.prepare('DELETE FROM channels WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/channels/:id/avatar', authenticate, (req, res) => {
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  upload.single('avatar')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `/api/uploads/${req.file.filename}`;
    db.prepare('UPDATE channels SET avatar = ? WHERE id = ?').run(avatarUrl, req.params.id);
    res.json({ avatar: avatarUrl });
  });
});

app.patch('/api/channels/:id/auto-delete', authenticate, (req, res) => {
  const { auto_delete } = req.body;
  if (auto_delete && !['24h', '7d', '30d'].includes(auto_delete)) {
    return res.status(400).json({ error: 'Invalid auto_delete value. Use: 24h, 7d, 30d, or null to disable.' });
  }
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  db.prepare('UPDATE channels SET auto_delete = ? WHERE id = ?').run(auto_delete || null, req.params.id);
  if (auto_delete) {
    const msgs = db.prepare('SELECT id, createdAt FROM messages WHERE channelId = ? AND isDeleted = 0 AND auto_delete_at IS NULL').all(req.params.id);
    const durationMs = auto_delete === '24h' ? 86400000 : auto_delete === '7d' ? 604800000 : 2592000000;
    const update = db.prepare('UPDATE messages SET auto_delete_at = ? WHERE id = ?');
    for (const m of msgs) {
      const deleteAt = new Date(new Date(m.createdAt).getTime() + durationMs).toISOString();
      update.run(deleteAt, m.id);
    }
  }
  res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id));
});

app.post('/api/channels/:id/clear-messages', authenticate, (req, res) => {
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const messages = db.prepare('SELECT id, attachments FROM messages WHERE channelId = ?').all(req.params.id);
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
  db.prepare('DELETE FROM reactions WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)').run(req.params.id);
  db.prepare('DELETE FROM message_reads WHERE messageId IN (SELECT id FROM messages WHERE channelId = ?)').run(req.params.id);
  db.prepare('DELETE FROM messages WHERE channelId = ?').run(req.params.id);
  db.prepare('UPDATE channels SET lastMessageAt = ?, lastMessagePreview = ? WHERE id = ?').run(null, '', req.params.id);
  res.json({ success: true });
});

// ─── Channel Membership ───────────────────────────────────
app.get('/api/channels/:id/members', (req, res) => {
  const members = db.prepare(`
    SELECT cm.*, u.name, u.email, u.avatar, u.role as systemRole
    FROM channel_members cm
    JOIN users u ON cm.userId = u.id
    WHERE cm.channelId = ?
  `).all(req.params.id);
  res.json(members);
});

app.post('/api/channels/:id/members', authenticate, (req, res) => {
  const { userId } = req.body;
  const channelId = req.params.id;
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const existing = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?').get(channelId, userId);
  if (existing) return res.status(400).json({ error: 'Already a member or pending' });

  db.prepare('INSERT INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)').run(channelId, userId, 'member', 'approved');
  res.json({ success: true });
});

app.post('/api/channels/:id/join', authenticate, (req, res) => {
  const channelId = req.params.id;
  const userId = req.user.id;
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const existing = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?').get(channelId, userId);
  if (existing) {
    if (existing.status === 'approved') return res.status(400).json({ error: 'Already a member' });
    if (existing.status === 'pending') return res.status(400).json({ error: 'Request already pending' });
  }

  // Public channels auto-approve, private channels require approval
  const status = ch.type === 'public' ? 'approved' : 'pending';
  db.prepare('INSERT OR REPLACE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)').run(channelId, userId, 'member', status);
  res.json({ success: true, status });
});

app.post('/api/channels/:id/approve', authenticate, (req, res) => {
  const channelId = req.params.id;
  const { userId } = req.body;
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const approver = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?').get(channelId, req.user.id, 'admin');
  if (!approver) return res.status(403).json({ error: 'Only channel admins can approve' });

  db.prepare('UPDATE channel_members SET status = ? WHERE channelId = ? AND userId = ?').run('approved', channelId, userId);
  res.json({ success: true });
});

app.post('/api/channels/:id/deny', authenticate, (req, res) => {
  const channelId = req.params.id;
  const { userId } = req.body;
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const denyer = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?').get(channelId, req.user.id, 'admin');
  if (!denyer) return res.status(403).json({ error: 'Only channel admins can deny' });

  db.prepare('DELETE FROM channel_members WHERE channelId = ? AND userId = ?').run(channelId, userId);
  res.json({ success: true });
});

app.delete('/api/channels/:id/members/:userId', authenticate, (req, res) => {
  const channelId = req.params.id;
  const targetUserId = req.params.userId;

  const remover = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?').get(channelId, req.user.id, 'admin');
  if (!remover && req.user.id !== targetUserId) return res.status(403).json({ error: 'Only channel admins can remove others' });

  db.prepare('DELETE FROM channel_members WHERE channelId = ? AND userId = ?').run(channelId, targetUserId);
  res.json({ success: true });
});

app.get('/api/channels/:id/pending', authenticate, (req, res) => {
  const channelId = req.params.id;
  const admin = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ?').get(channelId, req.user.id, 'admin');
  if (!admin) return res.status(403).json({ error: 'Only channel admins can view pending requests' });

  const pending = db.prepare(`
    SELECT cm.*, u.name, u.email, u.avatar
    FROM channel_members cm
    JOIN users u ON cm.userId = u.id
    WHERE cm.channelId = ? AND cm.status = 'pending'
  `).all(channelId);
  res.json(pending);
});

app.get('/api/channels/:id/membership', authenticate, (req, res) => {
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  if (ch.type === 'public') return res.json({ isMember: true, status: 'approved' });
  const m = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ?').get(req.params.id, req.user.id);
  res.json({ isMember: !!m && m.status === 'approved', status: m ? m.status : 'none' });
});

// ─── Auto-delete cleanup (runs every 60s) ────────────────
function cleanupExpiredMessages() {
  try {
    const expired = db.prepare('SELECT id, channelId, attachments FROM messages WHERE auto_delete_at IS NOT NULL AND auto_delete_at <= datetime(\'now\') AND isDeleted = 0').all();
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
    db.prepare(`DELETE FROM reactions WHERE messageId IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM message_reads WHERE messageId IN (${placeholders})`).run(...ids);
    db.prepare(`DELETE FROM messages WHERE id IN (${placeholders})`).run(...ids);
    console.log(`[AUTO-DELETE] Cleaned up ${expired.length} expired message(s)`);
  } catch (err) {
    console.error('[AUTO-DELETE] Cleanup error:', err.message);
  }
}
setInterval(cleanupExpiredMessages, 60000);

// ─── Messages ─────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  if (req.query.channelId) {
    const ch = db.prepare('SELECT type FROM channels WHERE id = ?').get(req.query.channelId);
    if (ch && ch.type === 'private') {
      let userId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try { const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET); userId = decoded.id; } catch {}
      }
      if (userId) {
        const m = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND status = ?').get(req.query.channelId, userId, 'approved');
        if (!m) return res.json([]);
      } else {
        return res.json([]);
      }
    }
  }
  let rows;
  if (req.query.channelId && req.query.parentId) {
    rows = db.prepare('SELECT * FROM messages WHERE channelId = ? AND parentId IS ? AND isDeleted = 0 ORDER BY createdAt ASC').all(req.query.channelId, req.query.parentId === 'null' ? null : req.query.parentId);
  } else if (req.query.channelId) {
    rows = db.prepare('SELECT * FROM messages WHERE channelId = ? AND parentId IS NULL AND isDeleted = 0 ORDER BY createdAt ASC').all(req.query.channelId);
  } else if (req.query.parentId) {
    rows = db.prepare('SELECT * FROM messages WHERE parentId IS ? AND isDeleted = 0 ORDER BY createdAt ASC').all(req.query.parentId === 'null' ? null : req.query.parentId);
  } else {
    rows = db.prepare('SELECT * FROM messages WHERE isDeleted = 0 ORDER BY createdAt ASC').all();
  }
  if (req.query.channelId && req.query.since) {
    rows = rows.filter(r => new Date(r.createdAt).getTime() > new Date(req.query.since).getTime());
  }
  res.json(rows);
});

app.get('/api/messages/search', (req, res) => {
  const { q, channelId } = req.query;
  if (!q) return res.json([]);
  const pattern = `%${q}%`;
  let rows;
  if (channelId) {
    rows = db.prepare("SELECT * FROM messages WHERE channelId = ? AND content LIKE ? AND isDeleted = 0 AND parentId IS NULL ORDER BY createdAt DESC LIMIT 50").all(channelId, pattern);
  } else {
    rows = db.prepare("SELECT * FROM messages WHERE content LIKE ? AND isDeleted = 0 AND parentId IS NULL ORDER BY createdAt DESC LIMIT 50").all(pattern);
  }
  res.json(rows);
});

app.get('/api/messages/pinned/:channelId', (req, res) => {
  const rows = db.prepare("SELECT * FROM messages WHERE channelId = ? AND isPinned = 1 AND isDeleted = 0 ORDER BY pinnedAt DESC").all(req.params.channelId);
  res.json(rows);
});

app.get('/api/messages/starred', authenticate, (req, res) => {
  const rows = db.prepare("SELECT * FROM messages WHERE isStarred = 1 AND isDeleted = 0 ORDER BY createdAt DESC").all();
  res.json(rows);
});

app.post('/api/messages', (req, res) => {
  const id = crypto.randomUUID();
  const { channelId, parentId, replyToId, userId, userName, userAvatar, content, attachments, createdAt } = req.body;

  if (channelId && !channelId.startsWith('dm-')) {
    const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    if (ch.type === 'private') {
      const authHeader = req.headers.authorization;
      let senderId = userId;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try { const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET); senderId = decoded.id; } catch {}
      }
      const m = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND status = ?').get(channelId, senderId, 'approved');
      if (!m) return res.status(403).json({ error: 'Not a member of this private channel' });
    }
  }
  let autoDeleteAt = null;
  if (channelId) {
    const ch = db.prepare('SELECT auto_delete FROM channels WHERE id = ?').get(channelId);
    if (ch && ch.auto_delete) {
      const now = new Date();
      const durationMs = ch.auto_delete === '24h' ? 86400000 : ch.auto_delete === '7d' ? 604800000 : 2592000000;
      autoDeleteAt = new Date(now.getTime() + durationMs).toISOString();
    } else if (channelId.startsWith('dm-') && userId) {
      const parts = channelId.split('-');
      if (parts.length >= 3) {
        const otherId = parts.slice(2).join('-');
        if (otherId !== 'self') {
          const dmSet = db.prepare('SELECT auto_delete FROM dm_settings WHERE userId = ? AND otherUserId = ?').get(userId, otherId);
          if (dmSet && dmSet.auto_delete) {
            const now = new Date();
            const durationMs = dmSet.auto_delete === '24h' ? 86400000 : dmSet.auto_delete === '7d' ? 604800000 : 2592000000;
            autoDeleteAt = new Date(now.getTime() + durationMs).toISOString();
          }
        }
      }
    }
  }
  db.prepare('INSERT INTO messages (id, channelId, parentId, replyToId, userId, userName, userAvatar, content, attachments, auto_delete_at, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, channelId || '', parentId || null, replyToId || null, userId || '', userName || '', userAvatar || '', content || '', JSON.stringify(attachments || []), autoDeleteAt, createdAt || new Date().toISOString());
  if (channelId && !channelId.startsWith('dm-')) {
    db.prepare("UPDATE channels SET lastMessageAt = ?, lastMessagePreview = ? WHERE id = ?")
      .run(new Date().toISOString(), (content || '').substring(0, 100), channelId);
  }
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(id));
});

app.patch('/api/messages/:id', authenticate, (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Cannot edit this message' });
  const { content } = req.body;
  db.prepare(`UPDATE messages SET content = ?, isEdited = 1, editedAt = datetime('now') WHERE id = ?`)
    .run(content || msg.content, req.params.id);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id));
});

app.delete('/api/messages/:id', authenticate, (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (msg.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Cannot delete this message' });
  db.prepare(`UPDATE messages SET isDeleted = 1, deletedAt = datetime('now'), content = 'This message was deleted' WHERE id = ?`)
    .run(req.params.id);
  res.json({ success: true });
});

app.post('/api/messages/:id/pin', authenticate, (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  db.prepare(`UPDATE messages SET isPinned = 1, pinnedAt = datetime('now'), pinnedBy = ? WHERE id = ?`)
    .run(req.user.id, req.params.id);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id));
});

app.post('/api/messages/:id/unpin', authenticate, (req, res) => {
  db.prepare('UPDATE messages SET isPinned = 0, pinnedAt = NULL, pinnedBy = NULL WHERE id = ?')
    .run(req.params.id);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id));
});

app.post('/api/messages/:id/star', authenticate, (req, res) => {
  db.prepare('UPDATE messages SET isStarred = 1 WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id));
});

app.post('/api/messages/:id/unstar', authenticate, (req, res) => {
  db.prepare('UPDATE messages SET isStarred = 0 WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id));
});

app.post('/api/messages/:id/forward', authenticate, (req, res) => {
  const { channelId, targetChannelId, userId, userName, userAvatar } = req.body;
  const target = channelId || targetChannelId;
  if (!target) return res.status(400).json({ error: 'channelId required' });
  const original = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Message not found' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO messages (id, channelId, userId, userName, userAvatar, content, attachments, forwardedFrom, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, target, userId || original.userId, userName || original.userName, userAvatar || original.userAvatar, original.content, original.attachments || '[]', original.userName, new Date().toISOString());
  db.prepare("UPDATE channels SET lastMessageAt = ?, lastMessagePreview = ? WHERE id = ?")
    .run(new Date().toISOString(), (original.content || '').substring(0, 100), target);
  res.json(db.prepare('SELECT * FROM messages WHERE id = ?').get(id));
});

app.post('/api/messages/:id/read', authenticate, (req, res) => {
  const existing = db.prepare('SELECT * FROM message_reads WHERE messageId = ? AND userId = ?').get(req.params.id, req.user.id);
  if (!existing) {
    db.prepare(`INSERT INTO message_reads (messageId, userId, readAt) VALUES (?, ?, datetime('now'))`)
      .run(req.params.id, req.user.id);
  }
  res.json({ success: true });
});

app.post('/api/messages/read-channel/:channelId', authenticate, (req, res) => {
  const unread = db.prepare('SELECT m.id FROM messages m LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ? WHERE m.channelId = ? AND m.parentId IS NULL AND m.isDeleted = 0 AND mr.messageId IS NULL')
    .all(req.user.id, req.params.channelId);
  const ins = db.prepare(`INSERT OR IGNORE INTO message_reads (messageId, userId, readAt) VALUES (?, ?, datetime('now'))`);
  for (const msg of unread) {
    ins.run(msg.id, req.user.id);
  }
  res.json({ success: true, marked: unread.length });
});

app.get('/api/messages/unread/:channelId', authenticate, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM messages m LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ? WHERE m.channelId = ? AND m.parentId IS NULL AND m.isDeleted = 0 AND mr.messageId IS NULL')
    .get(req.user.id, req.params.channelId);
  res.json({ count: count.c });
});

app.get('/api/messages/unread-all', authenticate, (req, res) => {
  const rows = db.prepare('SELECT m.channelId, COUNT(*) as count FROM messages m LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ? WHERE m.parentId IS NULL AND m.isDeleted = 0 AND mr.messageId IS NULL GROUP BY m.channelId')
    .all(req.user.id);
  const result = {};
  for (const r of rows) result[r.channelId] = r.count;
  res.json(result);
});

app.get('/api/messages/read-by/:messageId', (req, res) => {
  const rows = db.prepare('SELECT mr.userId, mr.readAt, u.name, u.avatar FROM message_reads mr JOIN users u ON u.id = mr.userId WHERE mr.messageId = ?')
    .all(req.params.messageId);
  res.json(rows);
});

app.get('/api/messages/status/:messageId', (req, res) => {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const reads = db.prepare('SELECT COUNT(*) as c FROM message_reads WHERE messageId = ?').get(req.params.messageId);
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
  res.json({
    sent: true,
    delivered: reads.c > 0,
    read: reads.c >= Math.max(1, totalUsers.c - 1),
    readCount: reads.c,
    totalUsers: totalUsers.c - 1,
  });
});

app.get('/api/messages/batch-status', (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.json({});
  const idList = ids.split(',').filter(Boolean);
  const result = {};
  for (const id of idList) {
    const reads = db.prepare('SELECT COUNT(*) as c FROM message_reads WHERE messageId = ?').get(id);
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
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
app.get('/api/reactions', (req, res) => {
  if (req.query.messageId) {
    res.json(db.prepare('SELECT * FROM reactions WHERE messageId = ?').all(req.query.messageId));
  } else {
    res.json(db.prepare('SELECT * FROM reactions').all());
  }
});

app.post('/api/reactions', (req, res) => {
  const id = crypto.randomUUID();
  const { messageId, emoji, userName } = req.body;
  const userId = req.user?.id || req.body.userId || '';
  db.prepare('INSERT INTO reactions (id, messageId, emoji, userId, userName) VALUES (?, ?, ?, ?, ?)')
    .run(id, messageId, emoji, userId, userName || '');
  res.json(db.prepare('SELECT * FROM reactions WHERE id = ?').get(id));
});

app.delete('/api/reactions/:id', (req, res) => {
  db.prepare('DELETE FROM reactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Comments ─────────────────────────────────────────────
app.get('/api/comments', (req, res) => {
  if (req.query.taskId) {
    res.json(db.prepare('SELECT * FROM comments WHERE taskId = ? ORDER BY createdAt ASC').all(req.query.taskId));
  } else {
    res.json(db.prepare('SELECT * FROM comments ORDER BY createdAt ASC').all());
  }
});

app.post('/api/comments', (req, res) => {
  const id = crypto.randomUUID();
  const { taskId, userId, userName, content, createdAt } = req.body;
  db.prepare('INSERT INTO comments (id, taskId, userId, userName, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, taskId || '', userId || '', userName || '', content || '', createdAt || new Date().toISOString());
  res.json(db.prepare('SELECT * FROM comments WHERE id = ?').get(id));
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
app.post('/api/typing', authenticate, (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'channelId required' });
  const expiresAt = new Date(Date.now() + 5000).toISOString();
  db.prepare('INSERT OR REPLACE INTO typing_indicators (channelId, userId, userName, expiresAt) VALUES (?, ?, ?, ?)')
    .run(channelId, req.user.id, req.user.name, expiresAt);
  res.json({ success: true });
});

app.get('/api/typing/:channelId', (req, res) => {
  const now = new Date().toISOString();
  db.prepare('DELETE FROM typing_indicators WHERE expiresAt < ?').run(now);
  const rows = db.prepare('SELECT userId, userName FROM typing_indicators WHERE channelId = ? AND userId != ?')
    .all(req.params.channelId, req.query.excludeUserId || '');
  res.json(rows);
});

// ─── Read Receipts ─────────────────────────────────────────
app.get('/api/messages/:id/read-status', (req, res) => {
  const rows = db.prepare(`
    SELECT mr.userId, mr.readAt, u.name FROM message_reads mr
    JOIN users u ON mr.userId = u.id WHERE mr.messageId = ?
  `).all(req.params.id);
  res.json(rows);
});

// ─── Audit Log ─────────────────────────────────────────────
app.post('/api/audit', authenticate, (req, res) => {
  const { action, target, details } = req.body;
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO audit_log (id, userId, userName, action, target, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, req.user.name, action, target || '', details || '');
  res.json({ success: true });
});

app.get('/api/audit', authenticate, requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as cnt FROM audit_log').get().cnt;
  res.json({ rows, total });
});

// ─── Task Dependencies ─────────────────────────────────────
app.get('/api/tasks/:id/dependencies', (req, res) => {
  const deps = db.prepare(`
    SELECT td.dependsOnId, t.title, t.status FROM task_dependencies td
    JOIN tasks t ON td.dependsOnId = t.id WHERE td.taskId = ?
  `).all(req.params.id);
  const blockedBy = db.prepare(`
    SELECT td.taskId as blockedTaskId, t.title, t.status FROM task_dependencies td
    JOIN tasks t ON td.taskId = t.id WHERE td.dependsOnId = ?
  `).all(req.params.id);
  res.json({ dependsOn: deps, blockedBy });
});

app.post('/api/tasks/:id/dependencies', authenticate, (req, res) => {
  const { dependsOnId } = req.body;
  if (!dependsOnId) return res.status(400).json({ error: 'dependsOnId required' });
  if (req.params.id === dependsOnId) return res.status(400).json({ error: 'Cannot depend on self' });
  const exists = db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(dependsOnId);
  if (!exists) return res.status(404).json({ error: 'Task not found' });
  db.prepare('INSERT OR IGNORE INTO task_dependencies (taskId, dependsOnId) VALUES (?, ?)').run(req.params.id, dependsOnId);
  res.json({ success: true });
});

app.delete('/api/tasks/:id/dependencies/:depId', authenticate, (req, res) => {
  db.prepare('DELETE FROM task_dependencies WHERE taskId = ? AND dependsOnId = ?').run(req.params.id, req.params.depId);
  res.json({ success: true });
});

// ─── Channel Description ───────────────────────────────────
app.patch('/api/channels/:id/description', authenticate, (req, res) => {
  const { description, topic } = req.body;
  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  const member = db.prepare('SELECT * FROM channel_members WHERE channelId = ? AND userId = ? AND role = ? AND status = ?')
    .get(req.params.id, req.user.id, 'admin', 'approved');
  if (!member && req.user.role !== 'admin') return res.status(403).json({ error: 'Not channel admin' });
  if (description !== undefined) db.prepare('UPDATE channels SET description = ? WHERE id = ?').run(description, req.params.id);
  if (topic !== undefined) db.prepare('UPDATE channels SET topic = ? WHERE id = ?').run(topic, req.params.id);
  res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id));
});

// ─── Custom Status ─────────────────────────────────────────
app.post('/api/users/status', authenticate, (req, res) => {
  const { status, statusEmoji } = req.body;
  db.prepare("UPDATE users SET status = ?, statusEmoji = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(status || '', statusEmoji || '', req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(safeUser(updated));
});

// ─── Two-Factor Authentication ─────────────────────────────
const crypto2 = require('crypto');
app.post('/api/2fa/setup', authenticate, (req, res) => {
  const secret = crypto2.randomBytes(20).toString('hex');
  db.prepare("UPDATE users SET twoFactorSecret = ?, updatedAt = datetime('now') WHERE id = ?").run(secret, req.user.id);
  const otpauth = `otpauth://totp/SokoTeams:${req.user.username}?secret=${secret}&issuer=SokoTeams`;
  res.json({ secret, otpauth });
});

app.post('/api/2fa/verify', authenticate, (req, res) => {
  const { code } = req.body;
  const user = db.prepare('SELECT twoFactorSecret FROM users WHERE id = ?').get(req.user.id);
  if (!user?.twoFactorSecret) return res.status(400).json({ error: '2FA not set up' });
  const counter = Math.floor(Date.now() / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', Buffer.from(user.twoFactorSecret, 'hex')).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const otp = ((hmac[offset] & 0x7f) << 24 | (hmac[offset+1] & 0xff) << 16 | (hmac[offset+2] & 0xff) << 8 | (hmac[offset+3] & 0xff)) % 1000000;
  const expected = String(otp).padStart(6, '0');
  if (code === expected) {
    db.prepare("UPDATE users SET twoFactorEnabled = 1, updatedAt = datetime('now') WHERE id = ?").run(req.user.id);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});

app.post('/api/2fa/disable', authenticate, (req, res) => {
  db.prepare("UPDATE users SET twoFactorEnabled = 0, twoFactorSecret = NULL, updatedAt = datetime('now') WHERE id = ?").run(req.user.id);
  res.json({ success: true });
});

// ─── Data Export ───────────────────────────────────────────
app.get('/api/export', authenticate, (req, res) => {
  const format = req.query.format || 'json';
  const tasks = db.prepare('SELECT * FROM tasks WHERE assignedUserId = ?').all(req.user.id);
  const messages = db.prepare('SELECT * FROM messages WHERE userId = ?').all(req.user.id);
  const projects = db.prepare('SELECT p.* FROM projects p JOIN project_members pm ON p.id = pm.projectId WHERE pm.userId = ?').all(req.user.id);
  const data = { user: safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)), tasks, messages, projects, exportedAt: new Date().toISOString() };
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
app.post('/api/saved-messages', authenticate, (req, res) => {
  const { messageId, channelId } = req.body;
  if (!messageId || !channelId) return res.status(400).json({ error: 'messageId and channelId required' });
  const existing = db.prepare('SELECT id FROM saved_messages WHERE userId = ? AND messageId = ?').get(req.user.id, messageId);
  if (existing) return res.status(400).json({ error: 'Already saved' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO saved_messages (id, userId, messageId, channelId) VALUES (?, ?, ?, ?)').run(id, req.user.id, messageId, channelId);
  res.json({ success: true, id });
});

app.delete('/api/saved-messages/:messageId', authenticate, (req, res) => {
  db.prepare('DELETE FROM saved_messages WHERE userId = ? AND messageId = ?').run(req.user.id, req.params.messageId);
  res.json({ success: true });
});

app.get('/api/saved-messages', authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT sm.*, m.content, m.userName, m.createdAt as msgCreatedAt, c.name as channelName
    FROM saved_messages sm
    JOIN messages m ON sm.messageId = m.id
    JOIN channels c ON sm.channelId = c.id
    WHERE sm.userId = ? ORDER BY sm.savedAt DESC
  `).all(req.user.id);
  res.json(rows);
});

// ─── User Groups ───────────────────────────────────────────
app.get('/api/user-groups', authenticate, (req, res) => {
  const groups = db.prepare('SELECT * FROM user_groups ORDER BY name').all();
  const result = groups.map(g => {
    const members = db.prepare('SELECT u.id, u.name, u.avatar FROM user_group_members ugm JOIN users u ON ugm.userId = u.id WHERE ugm.groupId = ?').all(g.id);
    return { ...g, members };
  });
  res.json(result);
});

app.post('/api/user-groups', authenticate, requireAdmin, (req, res) => {
  const { name, description, color, memberIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO user_groups (id, name, description, color, createdBy) VALUES (?, ?, ?, ?, ?)').run(id, name, description || '', color || '#3b82f6', req.user.id);
  if (Array.isArray(memberIds)) {
    const insert = db.prepare('INSERT OR IGNORE INTO user_group_members (groupId, userId) VALUES (?, ?)');
    for (const uid of memberIds) insert.run(id, uid);
  }
  res.json(db.prepare('SELECT * FROM user_groups WHERE id = ?').get(id));
});

app.delete('/api/user-groups/:id', authenticate, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM user_groups WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Polls ─────────────────────────────────────────────────
app.post('/api/polls', authenticate, (req, res) => {
  const { channelId, question, options, expiresAt } = req.body;
  if (!channelId || !question || !options?.length) return res.status(400).json({ error: 'channelId, question, and options required' });
  const id = crypto.randomUUID();
  const votes = {};
  options.forEach((_, i) => { votes[i] = []; });
  db.prepare('INSERT INTO polls (id, channelId, userId, userName, question, options, votes, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, channelId, req.user.id, req.user.name, question, JSON.stringify(options), JSON.stringify(votes), expiresAt || null);
  res.json(db.prepare('SELECT * FROM polls WHERE id = ?').get(id));
});

app.post('/api/polls/:id/vote', authenticate, (req, res) => {
  const { optionIndex } = req.body;
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(req.params.id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.isClosed) return res.status(400).json({ error: 'Poll is closed' });
  const votes = JSON.parse(poll.votes || '{}');
  Object.keys(votes).forEach(k => { votes[k] = votes[k].filter(v => v !== req.user.id); });
  if (!votes[optionIndex]) votes[optionIndex] = [];
  votes[optionIndex].push(req.user.id);
  db.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), req.params.id);
  res.json({ success: true });
});

app.post('/api/polls/:id/close', authenticate, (req, res) => {
  db.prepare('UPDATE polls SET isClosed = 1 WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.get('/api/polls/:channelId', (req, res) => {
  const polls = db.prepare('SELECT * FROM polls WHERE channelId = ? ORDER BY createdAt DESC LIMIT 10').all(req.params.channelId);
  res.json(polls);
});

// ─── Message Edit History ──────────────────────────────────
app.get('/api/messages/:id/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM message_edit_history WHERE messageId = ? ORDER BY editedAt DESC').all(req.params.id);
  res.json(rows);
});

// ─── Notifications ─────────────────────────────────────────
app.get('/api/notifications', authenticate, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE userId = ? AND isRead = 0').get(req.user.id).cnt;
  res.json({ notifications: rows, unread });
});

app.post('/api/notifications/read', authenticate, (req, res) => {
  const { ids } = req.body;
  if (ids && Array.isArray(ids)) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE notifications SET isRead = 1 WHERE id IN (${placeholders}) AND userId = ?`).run(...ids, req.user.id);
  } else {
    db.prepare('UPDATE notifications SET isRead = 1 WHERE userId = ?').run(req.user.id);
  }
  res.json({ success: true });
});

// ─── Calendar ──────────────────────────────────────────────
app.get('/api/calendar', authenticate, (req, res) => {
  const { start, end } = req.query;
  const startDate = start || '2020-01-01';
  const endDate = end || '2030-12-31';
  const tasks = db.prepare(`
    SELECT t.*, p.title as projectTitle, p.color as projectColor
    FROM tasks t LEFT JOIN projects p ON t.projectId = p.id
    WHERE t.assignedUserId = ? AND t.isArchived = 0
    AND ((t.dueDate >= ? AND t.dueDate <= ?) OR (t.startDate >= ? AND t.startDate <= ?) OR (t.startDate <= ? AND t.dueDate >= ?))
    ORDER BY t.dueDate ASC
  `).all(req.user.id, startDate, endDate, startDate, endDate, startDate, endDate);
  res.json(tasks);
});

// ─── Batch Operations ──────────────────────────────────────
app.post('/api/tasks/batch', authenticate, requireAdmin, (req, res) => {
  const { ids, action, value } = req.body;
  if (!ids?.length || !action) return res.status(400).json({ error: 'ids and action required' });
  const placeholders = ids.map(() => '?').join(',');
  if (action === 'archive') {
    db.prepare(`UPDATE tasks SET isArchived = 1, archivedAt = datetime('now') WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'restore') {
    db.prepare(`UPDATE tasks SET isArchived = 0, archivedAt = NULL WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'status') {
    db.prepare(`UPDATE tasks SET status = ?, updatedAt = datetime('now') WHERE id IN (${placeholders})`).run(value, ...ids);
  } else if (action === 'priority') {
    db.prepare(`UPDATE tasks SET priority = ?, updatedAt = datetime('now') WHERE id IN (${placeholders})`).run(value, ...ids);
  } else if (action === 'delete') {
    db.prepare(`DELETE FROM tasks WHERE id IN (${placeholders})`).run(...ids);
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
  res.json({ success: true, affected: ids.length });
});

// ─── Invite by Email ───────────────────────────────────────
app.post('/api/invites', authenticate, requireAdmin, (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: 'User already exists' });
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  db.prepare('INSERT INTO invites (id, email, invitedBy, role, expiresAt) VALUES (?, ?, ?, ?, ?)').run(id, email, req.user.id, role || 'user', expiresAt);
  const inviteLink = `http://localhost:5173/register?invite=${id}`;
  sendEmail(email, 'You\'re invited to SokoTeams!', `You\'ve been invited to join SokoTeams. Click here to register: ${inviteLink}`).catch(() => {});
  res.json({ success: true, id, inviteLink });
});

app.get('/api/invites', authenticate, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT i.*, u.name as invitedByName FROM invites i JOIN users u ON i.invitedBy = u.id ORDER BY i.createdAt DESC').all();
  res.json(rows);
});

// ─── Time Tracking ─────────────────────────────────────────
app.post('/api/tasks/:id/time', authenticate, (req, res) => {
  const { hours } = req.body;
  if (hours === undefined) return res.status(400).json({ error: 'hours required' });
  db.prepare("UPDATE tasks SET timeLogged = timeLogged + ?, updatedAt = datetime('now') WHERE id = ?").run(parseFloat(hours), req.params.id);
  const task = db.prepare('SELECT timeLogged FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ success: true, timeLogged: task?.timeLogged || 0 });
});

// ─── Health ───────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({ status: 'ok', database: 'sqlite', smtpConfigured, authEnabled: true });
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
app.post('/api/presence/heartbeat', authenticate, (req, res) => {
  db.prepare(`UPDATE users SET lastSeen = datetime('now') WHERE id = ?`).run(req.user.id);
  res.json({ ok: true });
});

app.get('/api/presence/status', (req, res) => {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  const users = db.prepare(`SELECT id, lastSeen FROM users`).all();
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
    console.log(`  Database: SQLite (sokoteams.db)`);
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
