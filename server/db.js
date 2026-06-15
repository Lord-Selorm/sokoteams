const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.resolve(__dirname, 'sokoteams.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    migrateSchema();
    seedIfEmpty();
  }
  return db;
}

function migrateSchema() {
  const channels = db.prepare("PRAGMA table_info(channels)").all();
  if (!channels.some(c => c.name === 'auto_delete')) {
    db.exec("ALTER TABLE channels ADD COLUMN auto_delete TEXT DEFAULT NULL");
  }
  const messages = db.prepare("PRAGMA table_info(messages)").all();
  if (!messages.some(c => c.name === 'auto_delete_at')) {
    db.exec("ALTER TABLE messages ADD COLUMN auto_delete_at TEXT DEFAULT NULL");
  }

  const users = db.prepare("PRAGMA table_info(users)").all();
  if (!users.some(c => c.name === 'lastSeen')) {
    db.exec("ALTER TABLE users ADD COLUMN lastSeen TEXT DEFAULT NULL");
  }

  const channelsInfo = db.prepare("PRAGMA table_info(channels)").all();
  if (!channelsInfo.some(c => c.name === 'createdBy')) {
    db.exec("ALTER TABLE channels ADD COLUMN createdBy TEXT DEFAULT ''");
  }
  if (!channelsInfo.some(c => c.name === 'avatar')) {
    db.exec("ALTER TABLE channels ADD COLUMN avatar TEXT DEFAULT ''");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      userId TEXT NOT NULL,
      blockedUserId TEXT NOT NULL,
      blockedAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (userId, blockedUserId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blockedUserId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_members (
      channelId TEXT NOT NULL,
      userId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'approved',
      joinedAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (channelId, userId),
      FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default members for channels that have no members
  const channelCount = db.prepare('SELECT COUNT(*) as cnt FROM channel_members').get();
  if (channelCount.cnt === 0) {
    const chs = db.prepare('SELECT id FROM channels').all();
    const users = db.prepare('SELECT id FROM users').all();
    const insertMember = db.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)');
    for (const ch of chs) {
      for (let i = 0; i < users.length; i++) {
        insertMember.run(ch.id, users[i].id, i === 0 ? 'admin' : 'member', 'approved');
      }
    }
  }

  // Recreate tasks table with foreign key on projectId
  const tasksFks = db.prepare("PRAGMA table_info(tasks)").all();
  if (!tasksFks.some(c => c.name === 'projectId' && c.dflt_value === undefined)) {
    // Check if foreign key already exists
    const fks = db.prepare("PRAGMA foreign_key_list(tasks)").all();
    if (!fks.some(f => f.from === 'projectId')) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS tasks_new (
          id TEXT PRIMARY KEY,
          projectId TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          priority TEXT NOT NULL DEFAULT 'Medium',
          status TEXT NOT NULL DEFAULT 'Todo',
          dueDate TEXT DEFAULT '',
          startDate TEXT DEFAULT '',
          assignedUserId TEXT DEFAULT '',
          tags TEXT DEFAULT '[]',
          estimatedHours REAL DEFAULT 0,
          actualHours REAL DEFAULT 0,
          completedAt TEXT DEFAULT '',
          createdAt TEXT DEFAULT (datetime('now')),
          updatedAt TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
        );
        INSERT INTO tasks_new SELECT * FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
        CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assignedUserId);
      `);
    }
  }

  const tasksArchived = db.prepare("PRAGMA table_info(tasks)").all();
  if (!tasksArchived.some(c => c.name === 'isArchived')) {
    db.exec("ALTER TABLE tasks ADD COLUMN isArchived INTEGER DEFAULT 0");
    db.exec("ALTER TABLE tasks ADD COLUMN archivedAt TEXT DEFAULT NULL");
  }

  const projectsArchived = db.prepare("PRAGMA table_info(projects)").all();
  if (!projectsArchived.some(c => c.name === 'isArchived')) {
    db.exec("ALTER TABLE projects ADD COLUMN isArchived INTEGER DEFAULT 0");
    db.exec("ALTER TABLE projects ADD COLUMN archivedAt TEXT DEFAULT NULL");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      userId TEXT NOT NULL,
      blockedUserId TEXT NOT NULL,
      blockedAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (userId, blockedUserId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (blockedUserId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS dm_settings (
      userId TEXT NOT NULL,
      otherUserId TEXT NOT NULL,
      auto_delete TEXT DEFAULT NULL,
      isMuted INTEGER DEFAULT 0,
      PRIMARY KEY (userId, otherUserId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (otherUserId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS typing_indicators (
      channelId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      PRIMARY KEY (channelId, userId)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT DEFAULT '',
      details TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      channelId TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT DEFAULT '',
      events TEXT DEFAULT '[]',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      taskId TEXT NOT NULL,
      dependsOnId TEXT NOT NULL,
      PRIMARY KEY (taskId, dependsOnId),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (dependsOnId) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  const usersCols = db.prepare("PRAGMA table_info(users)").all();
  if (!usersCols.some(c => c.name === 'status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT ''");
  }
  if (!usersCols.some(c => c.name === 'statusEmoji')) {
    db.exec("ALTER TABLE users ADD COLUMN statusEmoji TEXT DEFAULT ''");
  }
  if (!usersCols.some(c => c.name === 'twoFactorSecret')) {
    db.exec("ALTER TABLE users ADD COLUMN twoFactorSecret TEXT DEFAULT NULL");
  }
  if (!usersCols.some(c => c.name === 'twoFactorEnabled')) {
    db.exec("ALTER TABLE users ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0");
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_typing_channel ON typing_indicators(channelId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(createdAt)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_webhooks_channel ON webhooks(channelId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(taskId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(dependsOnId)`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_messages (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      messageId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      savedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#3b82f6',
      createdBy TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_group_members (
      groupId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (groupId, userId),
      FOREIGN KEY (groupId) REFERENCES user_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      channelId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL DEFAULT '[]',
      votes TEXT NOT NULL DEFAULT '{}',
      isClosed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      expiresAt TEXT DEFAULT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS message_edit_history (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL,
      userId TEXT NOT NULL,
      oldContent TEXT NOT NULL,
      newContent TEXT NOT NULL,
      editedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      invitedBy TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT (datetime('now')),
      expiresAt TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      link TEXT DEFAULT '',
      isRead INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const tasksCols = db.prepare("PRAGMA table_info(tasks)").all();
  if (!tasksCols.some(c => c.name === 'isRecurring')) {
    db.exec("ALTER TABLE tasks ADD COLUMN isRecurring INTEGER DEFAULT 0");
    db.exec("ALTER TABLE tasks ADD COLUMN recurringInterval TEXT DEFAULT NULL");
    db.exec("ALTER TABLE tasks ADD COLUMN timeLogged REAL DEFAULT 0");
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_messages(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_polls_channel ON polls(channelId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_msg_edit_msg ON message_edit_history(messageId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(userId, isRead)`);
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'user',
      department TEXT DEFAULT '',
      passwordHash TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      completionPercentage INTEGER DEFAULT 0,
      dueDate TEXT DEFAULT '',
      startDate TEXT DEFAULT '',
      color TEXT DEFAULT 'blue',
      icon TEXT DEFAULT '',
      ownerId TEXT DEFAULT '',
      workspaceId TEXT DEFAULT 'default',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_members (
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      projectRole TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (projectId, userId),
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'Todo',
      dueDate TEXT DEFAULT '',
      startDate TEXT DEFAULT '',
      assignedUserId TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      estimatedHours REAL DEFAULT 0,
      actualHours REAL DEFAULT 0,
      completedAt TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_followers (
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (taskId, userId),
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'public',
      workspaceId TEXT DEFAULT '1',
      description TEXT DEFAULT '',
      topic TEXT DEFAULT '',
      icon TEXT DEFAULT '',
      lastMessageAt TEXT DEFAULT '',
      lastMessagePreview TEXT DEFAULT '',
      pinned INTEGER DEFAULT 0,
      auto_delete TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channelId TEXT NOT NULL,
      parentId TEXT DEFAULT NULL,
      replyToId TEXT DEFAULT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      userAvatar TEXT DEFAULT '',
      content TEXT NOT NULL,
      attachments TEXT DEFAULT '[]',
      isEdited INTEGER DEFAULT 0,
      editedAt TEXT DEFAULT NULL,
      isDeleted INTEGER DEFAULT 0,
      deletedAt TEXT DEFAULT NULL,
      isPinned INTEGER DEFAULT 0,
      pinnedAt TEXT DEFAULT NULL,
      pinnedBy TEXT DEFAULT NULL,
      isStarred INTEGER DEFAULT 0,
      forwardedFrom TEXT DEFAULT NULL,
      auto_delete_at TEXT DEFAULT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS message_reads (
      messageId TEXT NOT NULL,
      userId TEXT NOT NULL,
      readAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (messageId, userId),
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL,
      emoji TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      title TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      assigneeId TEXT DEFAULT '',
      dueDate TEXT DEFAULT '',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channelId);
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parentId);
    CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(replyToId);
    CREATE INDEX IF NOT EXISTS idx_messages_content ON messages(content);
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(messageId);
    CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(messageId);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assignedUserId);
    CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(taskId);
  `);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return;

  const hash = bcrypt.hashSync('admin123', 10);

  const insertUser = db.prepare('INSERT INTO users (id, username, name, email, avatar, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertUser.run('1', 'admin', 'Admin User', 'admin@corp.com', '', 'admin', 'Engineering', hash);

  const insertChannel = db.prepare('INSERT INTO channels (id, name, type, workspaceId, description, topic, lastMessageAt, lastMessagePreview, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertChannel.run('general', 'general', 'public', '1', 'Company-wide announcements and team discussions', 'Welcome to SokoTeams!', '', '', '1');
  insertChannel.run('random', 'random', 'public', '1', 'Off-topic conversations, memes, and fun', 'Water cooler chat', '', '', '1');

  const insertChannelMember = db.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)');
  insertChannelMember.run('general', '1', 'admin', 'approved');
  insertChannelMember.run('random', '1', 'admin', 'approved');

  console.log('  Database seeded with admin user');
}

module.exports = { getDb };
