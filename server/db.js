const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

let pool = null;
let dbInstance = null;

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function quoteIdentifiers(sql) {
  return sql.replace(/\b([a-z]+[A-Z][a-zA-Z]*)\b/g, '"$1"');
}

class DbHelper {
  async all(sql, ...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const converted = convertPlaceholders(quoteIdentifiers(sql));
    const result = await pool.query(converted, flatParams);
    return result.rows;
  }

  async get(sql, ...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const converted = convertPlaceholders(quoteIdentifiers(sql));
    const result = await pool.query(converted, flatParams);
    return result.rows[0] || null;
  }

  async run(sql, ...params) {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const converted = convertPlaceholders(quoteIdentifiers(sql));
    const result = await pool.query(converted, flatParams);
    return { changes: result.rowCount, lastInsertRowid: result.rows[0] ? result.rows[0].id : null };
  }

  async exec(sql) {
    await pool.query(quoteIdentifiers(sql));
  }
}

function createTablesSql() {
  return `
    CREATE TABLE IF NOT EXISTS "users" (
      "id" TEXT PRIMARY KEY,
      "username" TEXT UNIQUE NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "avatar" TEXT DEFAULT '',
      "role" TEXT NOT NULL DEFAULT 'user',
      "department" TEXT DEFAULT '',
      "passwordHash" TEXT NOT NULL,
      "createdAt" TEXT DEFAULT NOW(),
      "updatedAt" TEXT DEFAULT NOW(),
      "lastSeen" TEXT DEFAULT NULL,
      "status" TEXT DEFAULT '',
      "statusEmoji" TEXT DEFAULT '',
      "twoFactorSecret" TEXT DEFAULT NULL,
      "twoFactorEnabled" INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS "projects" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "description" TEXT DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'active',
      "completionPercentage" INTEGER DEFAULT 0,
      "dueDate" TEXT DEFAULT '',
      "startDate" TEXT DEFAULT '',
      "color" TEXT DEFAULT 'blue',
      "icon" TEXT DEFAULT '',
      "ownerId" TEXT DEFAULT '',
      "workspaceId" TEXT DEFAULT 'default',
      "createdAt" TEXT DEFAULT NOW(),
      "updatedAt" TEXT DEFAULT NOW(),
      "isArchived" INTEGER DEFAULT 0,
      "archivedAt" TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS "project_members" (
      "projectId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "projectRole" TEXT NOT NULL DEFAULT 'member',
      PRIMARY KEY ("projectId", "userId")
    );

    CREATE TABLE IF NOT EXISTS "tasks" (
      "id" TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT DEFAULT '',
      "priority" TEXT NOT NULL DEFAULT 'Medium',
      "status" TEXT NOT NULL DEFAULT 'Todo',
      "dueDate" TEXT DEFAULT '',
      "startDate" TEXT DEFAULT '',
      "assignedUserId" TEXT DEFAULT '',
      "tags" TEXT DEFAULT '[]',
      "estimatedHours" REAL DEFAULT 0,
      "actualHours" REAL DEFAULT 0,
      "completedAt" TEXT DEFAULT '',
      "createdAt" TEXT DEFAULT NOW(),
      "updatedAt" TEXT DEFAULT NOW(),
      "isArchived" INTEGER DEFAULT 0,
      "archivedAt" TEXT DEFAULT NULL,
      "isRecurring" INTEGER DEFAULT 0,
      "recurringInterval" TEXT DEFAULT NULL,
      "timeLogged" REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS "task_followers" (
      "taskId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      PRIMARY KEY ("taskId", "userId")
    );

    CREATE TABLE IF NOT EXISTS "channels" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'public',
      "workspaceId" TEXT DEFAULT '1',
      "description" TEXT DEFAULT '',
      "topic" TEXT DEFAULT '',
      "icon" TEXT DEFAULT '',
      "lastMessageAt" TEXT DEFAULT '',
      "lastMessagePreview" TEXT DEFAULT '',
      "pinned" INTEGER DEFAULT 0,
      "auto_delete" TEXT DEFAULT NULL,
      "createdBy" TEXT DEFAULT '',
      "avatar" TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS "messages" (
      "id" TEXT PRIMARY KEY,
      "channelId" TEXT NOT NULL,
      "parentId" TEXT DEFAULT NULL,
      "replyToId" TEXT DEFAULT NULL,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      "userAvatar" TEXT DEFAULT '',
      "content" TEXT NOT NULL,
      "attachments" TEXT DEFAULT '[]',
      "isEdited" INTEGER DEFAULT 0,
      "editedAt" TEXT DEFAULT NULL,
      "isDeleted" INTEGER DEFAULT 0,
      "deletedAt" TEXT DEFAULT NULL,
      "isPinned" INTEGER DEFAULT 0,
      "pinnedAt" TEXT DEFAULT NULL,
      "pinnedBy" TEXT DEFAULT NULL,
      "isStarred" INTEGER DEFAULT 0,
      "forwardedFrom" TEXT DEFAULT NULL,
      "auto_delete_at" TEXT DEFAULT NULL,
      "createdAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "message_reads" (
      "messageId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "readAt" TEXT DEFAULT NOW(),
      PRIMARY KEY ("messageId", "userId")
    );

    CREATE TABLE IF NOT EXISTS "reactions" (
      "id" TEXT PRIMARY KEY,
      "messageId" TEXT NOT NULL,
      "emoji" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "comments" (
      "id" TEXT PRIMARY KEY,
      "taskId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "subtasks" (
      "id" TEXT PRIMARY KEY,
      "taskId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "completed" INTEGER DEFAULT 0,
      "assigneeId" TEXT DEFAULT '',
      "dueDate" TEXT DEFAULT '',
      "createdAt" TEXT DEFAULT NOW(),
      "updatedAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "blocked_users" (
      "userId" TEXT NOT NULL,
      "blockedUserId" TEXT NOT NULL,
      "blockedAt" TEXT DEFAULT NOW(),
      PRIMARY KEY ("userId", "blockedUserId")
    );

    CREATE TABLE IF NOT EXISTS "channel_members" (
      "channelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userName" TEXT DEFAULT '',
      "role" TEXT NOT NULL DEFAULT 'member',
      "status" TEXT NOT NULL DEFAULT 'approved',
      "joinedAt" TEXT DEFAULT NOW(),
      PRIMARY KEY ("channelId", "userId")
    );

    CREATE TABLE IF NOT EXISTS "dm_settings" (
      "userId" TEXT NOT NULL,
      "otherUserId" TEXT NOT NULL,
      "auto_delete" TEXT DEFAULT NULL,
      "isMuted" INTEGER DEFAULT 0,
      PRIMARY KEY ("userId", "otherUserId")
    );

    CREATE TABLE IF NOT EXISTS "typing_indicators" (
      "channelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      "expiresAt" TEXT NOT NULL,
      PRIMARY KEY ("channelId", "userId")
    );

    CREATE TABLE IF NOT EXISTS "audit_log" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "target" TEXT DEFAULT '',
      "details" TEXT DEFAULT '',
      "createdAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "task_dependencies" (
      "taskId" TEXT NOT NULL,
      "dependsOnId" TEXT NOT NULL,
      PRIMARY KEY ("taskId", "dependsOnId")
    );

    CREATE TABLE IF NOT EXISTS "saved_messages" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "messageId" TEXT NOT NULL,
      "channelId" TEXT NOT NULL,
      "savedAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "user_groups" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT DEFAULT '',
      "color" TEXT DEFAULT '#3b82f6',
      "createdBy" TEXT NOT NULL,
      "createdAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "user_group_members" (
      "groupId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      PRIMARY KEY ("groupId", "userId")
    );

    CREATE TABLE IF NOT EXISTS "polls" (
      "id" TEXT PRIMARY KEY,
      "channelId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      "question" TEXT NOT NULL,
      "options" TEXT NOT NULL DEFAULT '[]',
      "votes" TEXT NOT NULL DEFAULT '{}',
      "isClosed" INTEGER DEFAULT 0,
      "createdAt" TEXT DEFAULT NOW(),
      "expiresAt" TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS "message_edit_history" (
      "id" TEXT PRIMARY KEY,
      "messageId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "oldContent" TEXT NOT NULL,
      "newContent" TEXT NOT NULL,
      "editedAt" TEXT DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "invites" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL,
      "invitedBy" TEXT NOT NULL,
      "role" TEXT DEFAULT 'user',
      "status" TEXT DEFAULT 'pending',
      "createdAt" TEXT DEFAULT NOW(),
      "expiresAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT DEFAULT '',
      "link" TEXT DEFAULT '',
      "isRead" INTEGER DEFAULT 0,
      "createdAt" TEXT DEFAULT NOW()
    );
  `;
}

function migrateTablesSql() {
  return `
    ALTER TABLE "channel_members" ADD COLUMN IF NOT EXISTS "userName" TEXT DEFAULT '';
  `;
}

function createIndexesSql() {
  return `
    CREATE INDEX IF NOT EXISTS idx_messages_channel ON "messages"("channelId");
    CREATE INDEX IF NOT EXISTS idx_messages_parent ON "messages"("parentId");
    CREATE INDEX IF NOT EXISTS idx_messages_reply ON "messages"("replyToId");
    CREATE INDEX IF NOT EXISTS idx_messages_content ON "messages"("content");
    CREATE INDEX IF NOT EXISTS idx_reactions_message ON "reactions"("messageId");
    CREATE INDEX IF NOT EXISTS idx_message_reads_message ON "message_reads"("messageId");
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON "tasks"("projectId");
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON "tasks"("assignedUserId");
    CREATE INDEX IF NOT EXISTS idx_comments_task ON "comments"("taskId");
    CREATE INDEX IF NOT EXISTS idx_typing_channel ON "typing_indicators"("channelId");
    CREATE INDEX IF NOT EXISTS idx_audit_user ON "audit_log"("userId");
    CREATE INDEX IF NOT EXISTS idx_audit_created ON "audit_log"("createdAt");
    CREATE INDEX IF NOT EXISTS idx_task_deps_task ON "task_dependencies"("taskId");
    CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON "task_dependencies"("dependsOnId");
    CREATE INDEX IF NOT EXISTS idx_saved_user ON "saved_messages"("userId");
    CREATE INDEX IF NOT EXISTS idx_polls_channel ON "polls"("channelId");
    CREATE INDEX IF NOT EXISTS idx_msg_edit_msg ON "message_edit_history"("messageId");
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON "notifications"("userId");
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON "notifications"("userId", "isRead");
  `;
}

async function seedIfEmpty() {
  const countResult = await pool.query('SELECT COUNT(*) as c FROM "users"');
  if (parseInt(countResult.rows[0].c) > 0) return;

  const hash = bcrypt.hashSync('admin123', 10);

  await pool.query(
    'INSERT INTO "users" ("id", "username", "name", "email", "avatar", "role", "department", "passwordHash") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    ['1', 'admin', 'Admin User', 'admin@corp.com', '', 'admin', 'Engineering', hash]
  );

  await pool.query(
    'INSERT INTO "channels" ("id", "name", "type", "workspaceId", "description", "topic", "lastMessageAt", "lastMessagePreview", "createdBy") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    ['general', 'general', 'public', '1', 'Company-wide announcements and team discussions', 'Welcome to SokoTeams!', '', '', '1']
  );

  await pool.query(
    'INSERT INTO "channels" ("id", "name", "type", "workspaceId", "description", "topic", "lastMessageAt", "lastMessagePreview", "createdBy") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    ['random', 'random', 'public', '1', 'Off-topic conversations, memes, and fun', 'Water cooler chat', '', '', '1']
  );

  await pool.query(
    'INSERT INTO "channel_members" ("channelId", "userId", "role", "status") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    ['general', '1', 'admin', 'approved']
  );
  await pool.query(
    'INSERT INTO "channel_members" ("channelId", "userId", "role", "status") VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    ['random', '1', 'admin', 'approved']
  );

  console.log('  Database seeded with admin user');
}

function splitStatements(sql) {
  return sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.match(/^\s*$/));
}

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.error('  DATABASE_URL not set — cannot start without PostgreSQL');
    process.exit(1);
  }

  console.log('  Connecting to PostgreSQL...');
  const needsSsl = !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
    max: 5,
  });

  await pool.query('SELECT 1');
  console.log('  Connected');

  const tableStmts = splitStatements(createTablesSql());
  for (let i = 0; i < tableStmts.length; i++) {
    try {
      await pool.query(tableStmts[i]);
    } catch (e) {
      console.error(`  Failed table ${i + 1}/${tableStmts.length}: ${e.message}`);
      throw e;
    }
  }
  console.log(`  Created ${tableStmts.length} tables`);

  const migrateStmts = splitStatements(migrateTablesSql());
  for (const stmt of migrateStmts) {
    await pool.query(stmt);
  }

  const indexStmts = splitStatements(createIndexesSql());
  for (let i = 0; i < indexStmts.length; i++) {
    await pool.query(indexStmts[i]);
  }
  console.log(`  Created ${indexStmts.length} indexes`);

  await seedIfEmpty();

  dbInstance = new DbHelper();
  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}

module.exports = { getDb, initDb };
