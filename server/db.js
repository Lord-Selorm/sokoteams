const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.resolve(__dirname, 'sokoteams.db');
let sqlJsDb = null;
let dbInstance = null;

function saveToDisk() {
  if (!sqlJsDb) return;
  try {
    const data = sqlJsDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('  Failed to save database:', e.message);
  }
}

class PreparedLike {
  constructor(sql, isWrite) {
    this.sql = sql;
    this.isWrite = isWrite;
  }

  all(...params) {
    const results = [];
    let stmt;
    try {
      stmt = sqlJsDb.prepare(this.sql);
      if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        stmt.bind(params[0]);
      } else if (params.length > 0) {
        stmt.bind(params);
      }
      while (stmt.step()) {
        const obj = stmt.getAsObject();
        results.push(obj);
      }
    } catch (e) {
      console.error('  DB all() error:', e.message, 'SQL:', this.sql.substring(0, 80));
      throw e;
    } finally {
      if (stmt) stmt.free();
    }
    return results;
  }

  get(...params) {
    let result = null;
    let stmt;
    try {
      stmt = sqlJsDb.prepare(this.sql);
      if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        stmt.bind(params[0]);
      } else if (params.length > 0) {
        stmt.bind(params);
      }
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
    } catch (e) {
      console.error('  DB get() error:', e.message, 'SQL:', this.sql.substring(0, 80));
      throw e;
    } finally {
      if (stmt) stmt.free();
    }
    return result;
  }

  run(...params) {
    try {
      if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        sqlJsDb.run(this.sql, params[0]);
      } else if (params.length > 0) {
        sqlJsDb.run(this.sql, params);
      } else {
        sqlJsDb.run(this.sql);
      }
      const changes = sqlJsDb.getRowsModified();
      let lastInsertRowid = null;
      try {
        const res = sqlJsDb.exec('SELECT last_insert_rowid() as id');
        if (res.length > 0 && res[0].values.length > 0) {
          lastInsertRowid = res[0].values[0][0];
        }
      } catch (_) {}
      saveToDisk();
      return { changes, lastInsertRowid };
    } catch (e) {
      console.error('  DB run() error:', e.message, 'SQL:', this.sql.substring(0, 80));
      throw e;
    }
  }

  iterate(...params) {
    let stmt;
    try {
      stmt = sqlJsDb.prepare(this.sql);
      if (params.length === 1 && typeof params[0] === 'object' && params[0] !== null && !Array.isArray(params[0])) {
        stmt.bind(params[0]);
      } else if (params.length > 0) {
        stmt.bind(params);
      }
      return {
        *[Symbol.iterator]() {
          try {
            while (stmt.step()) {
              yield stmt.getAsObject();
            }
          } finally {
            stmt.free();
          }
        }
      };
    } catch (e) {
      if (stmt) stmt.free();
      throw e;
    }
  }
}

class DatabaseWrapper {
  prepare(sql) {
    return new PreparedLike(sql);
  }

  exec(sql) {
    try {
      sqlJsDb.exec(sql);
      saveToDisk();
    } catch (e) {
      console.error('  DB exec() error:', e.message, 'SQL:', sql.substring(0, 80));
      throw e;
    }
  }

  pragma(str) {
    try {
      sqlJsDb.run('PRAGMA ' + str);
    } catch (e) {
      // Ignore pragma errors
    }
  }

  transaction(fn) {
    return (...args) => {
      sqlJsDb.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        sqlJsDb.run('COMMIT');
        saveToDisk();
        return result;
      } catch (e) {
        sqlJsDb.run('ROLLBACK');
        throw e;
      }
    };
  }
}

async function initDb() {
  const SQL = await initSqlJs();
  let fileBuffer = null;
  if (fs.existsSync(DB_PATH)) {
    fileBuffer = fs.readFileSync(DB_PATH);
  }
  sqlJsDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
  dbInstance = new DatabaseWrapper();
  initSchema();
  migrateSchema();
  seedIfEmpty();
  saveToDisk();
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}

function migrateSchema() {
  try {
    const channels = dbInstance.prepare("PRAGMA table_info(channels)").all();
    if (!channels.some(c => c.name === 'auto_delete')) {
      dbInstance.exec("ALTER TABLE channels ADD COLUMN auto_delete TEXT DEFAULT NULL");
    }
    const messages = dbInstance.prepare("PRAGMA table_info(messages)").all();
    if (!messages.some(c => c.name === 'auto_delete_at')) {
      dbInstance.exec("ALTER TABLE messages ADD COLUMN auto_delete_at TEXT DEFAULT NULL");
    }

    const users = dbInstance.prepare("PRAGMA table_info(users)").all();
    if (!users.some(c => c.name === 'lastSeen')) {
      dbInstance.exec("ALTER TABLE users ADD COLUMN lastSeen TEXT DEFAULT NULL");
    }

    const channelsInfo = dbInstance.prepare("PRAGMA table_info(channels)").all();
    if (!channelsInfo.some(c => c.name === 'createdBy')) {
      dbInstance.exec("ALTER TABLE channels ADD COLUMN createdBy TEXT DEFAULT ''");
    }
    if (!channelsInfo.some(c => c.name === 'avatar')) {
      dbInstance.exec("ALTER TABLE channels ADD COLUMN avatar TEXT DEFAULT ''");
    }

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        userId TEXT NOT NULL,
        blockedUserId TEXT NOT NULL,
        blockedAt TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (userId, blockedUserId)
      );
    `);

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS channel_members (
        channelId TEXT NOT NULL,
        userId TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'approved',
        joinedAt TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (channelId, userId)
      );
    `);

    const channelCount = dbInstance.prepare('SELECT COUNT(*) as cnt FROM channel_members').get();
    if (channelCount && channelCount.cnt === 0) {
      const chs = dbInstance.prepare('SELECT id FROM channels').all();
      const usersList = dbInstance.prepare('SELECT id FROM users').all();
      for (const ch of chs) {
        for (let i = 0; i < usersList.length; i++) {
          dbInstance.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)').run(ch.id, usersList[i].id, i === 0 ? 'admin' : 'member', 'approved');
        }
      }
    }

    const tasksFks = dbInstance.prepare("PRAGMA table_info(tasks)").all();
    const tasksHasProjectId = tasksFks.some(c => c.name === 'projectId');
    if (!tasksHasProjectId) {
      try { dbInstance.exec("ALTER TABLE tasks ADD COLUMN projectId TEXT NOT NULL DEFAULT ''"); } catch (_) {}
    }

    const tasksArchived = dbInstance.prepare("PRAGMA table_info(tasks)").all();
    if (!tasksArchived.some(c => c.name === 'isArchived')) {
      try { dbInstance.exec("ALTER TABLE tasks ADD COLUMN isArchived INTEGER DEFAULT 0"); } catch (_) {}
      try { dbInstance.exec("ALTER TABLE tasks ADD COLUMN archivedAt TEXT DEFAULT NULL"); } catch (_) {}
    }

    const projectsArchived = dbInstance.prepare("PRAGMA table_info(projects)").all();
    if (!projectsArchived.some(c => c.name === 'isArchived')) {
      try { dbInstance.exec("ALTER TABLE projects ADD COLUMN isArchived INTEGER DEFAULT 0"); } catch (_) {}
      try { dbInstance.exec("ALTER TABLE projects ADD COLUMN archivedAt TEXT DEFAULT NULL"); } catch (_) {}
    }

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS dm_settings (
        userId TEXT NOT NULL,
        otherUserId TEXT NOT NULL,
        auto_delete TEXT DEFAULT NULL,
        isMuted INTEGER DEFAULT 0,
        PRIMARY KEY (userId, otherUserId)
      );
    `);

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        channelId TEXT NOT NULL,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        expiresAt TEXT NOT NULL,
        PRIMARY KEY (channelId, userId)
      );
    `);

    dbInstance.exec(`
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

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        taskId TEXT NOT NULL,
        dependsOnId TEXT NOT NULL,
        PRIMARY KEY (taskId, dependsOnId)
      );
    `);

    const usersCols = dbInstance.prepare("PRAGMA table_info(users)").all();
    if (!usersCols.some(c => c.name === 'status')) {
      try { dbInstance.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT ''"); } catch (_) {}
    }
    if (!usersCols.some(c => c.name === 'statusEmoji')) {
      try { dbInstance.exec("ALTER TABLE users ADD COLUMN statusEmoji TEXT DEFAULT ''"); } catch (_) {}
    }
    if (!usersCols.some(c => c.name === 'twoFactorSecret')) {
      try { dbInstance.exec("ALTER TABLE users ADD COLUMN twoFactorSecret TEXT DEFAULT NULL"); } catch (_) {}
    }
    if (!usersCols.some(c => c.name === 'twoFactorEnabled')) {
      try { dbInstance.exec("ALTER TABLE users ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0"); } catch (_) {}
    }

    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_typing_channel ON typing_indicators(channelId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(userId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(createdAt)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(taskId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(dependsOnId)`);

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS saved_messages (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        messageId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        savedAt TEXT DEFAULT (datetime('now'))
      );
    `);

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#3b82f6',
        createdBy TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now'))
      );
    `);

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS user_group_members (
        groupId TEXT NOT NULL,
        userId TEXT NOT NULL,
        PRIMARY KEY (groupId, userId)
      );
    `);

    dbInstance.exec(`
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

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS message_edit_history (
        id TEXT PRIMARY KEY,
        messageId TEXT NOT NULL,
        userId TEXT NOT NULL,
        oldContent TEXT NOT NULL,
        newContent TEXT NOT NULL,
        editedAt TEXT DEFAULT (datetime('now'))
      );
    `);

    dbInstance.exec(`
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

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT DEFAULT '',
        link TEXT DEFAULT '',
        isRead INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now'))
      );
    `);

    const tasksCols = dbInstance.prepare("PRAGMA table_info(tasks)").all();
    if (!tasksCols.some(c => c.name === 'isRecurring')) {
      try { dbInstance.exec("ALTER TABLE tasks ADD COLUMN isRecurring INTEGER DEFAULT 0"); } catch (_) {}
      try { dbInstance.exec("ALTER TABLE tasks ADD COLUMN recurringInterval TEXT DEFAULT NULL"); } catch (_) {}
      try { dbInstance.exec("ALTER TABLE tasks ADD COLUMN timeLogged REAL DEFAULT 0"); } catch (_) {}
    }

    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_messages(userId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_polls_channel ON polls(channelId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_msg_edit_msg ON message_edit_history(messageId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)`);
    dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(userId, isRead)`);
  } catch (e) {
    console.error('  Migration error:', e.message);
  }
}

function initSchema() {
  dbInstance.exec(`
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
  `);

  dbInstance.exec(`
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
  `);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS project_members (
      projectId TEXT NOT NULL,
      userId TEXT NOT NULL,
      projectRole TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY (projectId, userId)
    );
  `);

  dbInstance.exec(`
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
  `);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS task_followers (
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      PRIMARY KEY (taskId, userId)
    );
  `);

  dbInstance.exec(`
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
  `);

  dbInstance.exec(`
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
  `);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS message_reads (
      messageId TEXT NOT NULL,
      userId TEXT NOT NULL,
      readAt TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (messageId, userId)
    );
  `);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS reactions (
      id TEXT PRIMARY KEY,
      messageId TEXT NOT NULL,
      emoji TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL
    );
  `);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
  `);

  dbInstance.exec(`
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
  `);

  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channelId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parentId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(replyToId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_messages_content ON messages(content)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_reactions_message ON reactions(messageId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_message_reads_message ON message_reads(messageId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assignedUserId)`);
  dbInstance.exec(`CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(taskId)`);
}

function seedIfEmpty() {
  const countRow = dbInstance.prepare('SELECT COUNT(*) as c FROM users').get();
  if (!countRow || countRow.c > 0) return;

  const hash = bcrypt.hashSync('admin123', 10);

  dbInstance.prepare('INSERT INTO users (id, username, name, email, avatar, role, department, passwordHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('1', 'admin', 'Admin User', 'admin@corp.com', '', 'admin', 'Engineering', hash);

  dbInstance.prepare("INSERT INTO channels (id, name, type, workspaceId, description, topic, lastMessageAt, lastMessagePreview, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run('general', 'general', 'public', '1', 'Company-wide announcements and team discussions', 'Welcome to SokoTeams!', '', '', '1');
  dbInstance.prepare("INSERT INTO channels (id, name, type, workspaceId, description, topic, lastMessageAt, lastMessagePreview, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run('random', 'random', 'public', '1', 'Off-topic conversations, memes, and fun', 'Water cooler chat', '', '', '1');

  dbInstance.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)').run('general', '1', 'admin', 'approved');
  dbInstance.prepare('INSERT OR IGNORE INTO channel_members (channelId, userId, role, status) VALUES (?, ?, ?, ?)').run('random', '1', 'admin', 'approved');

  console.log('  Database seeded with admin user');
}

module.exports = { getDb, initDb };
