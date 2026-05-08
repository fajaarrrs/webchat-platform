const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'webchat.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

function initDatabase() {
  const PRIMARY_ADMIN_USERNAME = 'admin';
  const PRIMARY_ADMIN_EMAIL = 'admin@gmail.com';
  const PRIMARY_ADMIN_PASSWORD = 'admin123';
  const LEGACY_ADMIN_EMAIL = 'admin@webcare.com';

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      project TEXT NOT NULL,
      description TEXT DEFAULT '',
      token TEXT NOT NULL UNIQUE,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS forum_members (
      forum_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (forum_id, user_id),
      FOREIGN KEY (forum_id) REFERENCES forums(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      forum_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      file_url TEXT,
      file_name TEXT,
      file_type TEXT,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      reply_to_id INTEGER,
      reply_preview_username TEXT,
      reply_preview_content TEXT,
      reply_preview_file_name TEXT,
      reply_preview_file_url TEXT,
      reply_preview_file_type TEXT,
      is_event INTEGER NOT NULL DEFAULT 0,
      event_name TEXT,
      event_description TEXT,
      event_start_at DATETIME,
      event_end_at DATETIME,
      event_location TEXT,
      event_call_link TEXT,
      edited_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (forum_id) REFERENCES forums(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reply_to_id) REFERENCES messages(id)
    );
  `);

  // Lightweight migrations for existing databases.
  // ensure `last_online_at` exists on users table
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  const hasUserColumn = (name) => userColumns.some((col) => col.name === name);
  if (!hasUserColumn('last_online_at')) {
    db.exec('ALTER TABLE users ADD COLUMN last_online_at DATETIME');
  }


  const messageColumns = db.prepare('PRAGMA table_info(messages)').all();
  const hasColumn = (name) => messageColumns.some((col) => col.name === name);

  if (!hasColumn('file_url')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_url TEXT');
  }
  if (!hasColumn('file_name')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_name TEXT');
  }
  if (!hasColumn('file_type')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_type TEXT');
  }
  if (!hasColumn('is_pinned')) {
    db.exec('ALTER TABLE messages ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
  }
  if (!hasColumn('reply_to_id')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER');
  }
  if (!hasColumn('reply_preview_username')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_preview_username TEXT');
  }
  if (!hasColumn('reply_preview_content')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_preview_content TEXT');
  }
  if (!hasColumn('reply_preview_file_name')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_preview_file_name TEXT');
  }
  if (!hasColumn('reply_preview_file_url')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_preview_file_url TEXT');
  }
  if (!hasColumn('reply_preview_file_type')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_preview_file_type TEXT');
  }
  if (!hasColumn('edited_at')) {
    db.exec('ALTER TABLE messages ADD COLUMN edited_at DATETIME');
  }
  if (!hasColumn('is_event')) {
    db.exec('ALTER TABLE messages ADD COLUMN is_event INTEGER NOT NULL DEFAULT 0');
  }
  if (!hasColumn('event_name')) {
    db.exec('ALTER TABLE messages ADD COLUMN event_name TEXT');
  }
  if (!hasColumn('event_description')) {
    db.exec('ALTER TABLE messages ADD COLUMN event_description TEXT');
  }
  if (!hasColumn('event_start_at')) {
    db.exec('ALTER TABLE messages ADD COLUMN event_start_at DATETIME');
  }
  if (!hasColumn('event_end_at')) {
    db.exec('ALTER TABLE messages ADD COLUMN event_end_at DATETIME');
  }
  if (!hasColumn('event_location')) {
    db.exec('ALTER TABLE messages ADD COLUMN event_location TEXT');
  }
  if (!hasColumn('event_call_link')) {
    db.exec('ALTER TABLE messages ADD COLUMN event_call_link TEXT');
  }

  // Ensure legacy seeded admin account is migrated to the latest default credentials.
  const legacyAdmin = db
    .prepare("SELECT id, email FROM users WHERE role = 'admin' AND username = ?")
    .get(PRIMARY_ADMIN_USERNAME);

  if (legacyAdmin && legacyAdmin.email === LEGACY_ADMIN_EMAIL) {
    const sameEmailOwner = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(PRIMARY_ADMIN_EMAIL);

    if (!sameEmailOwner || sameEmailOwner.id === legacyAdmin.id) {
      db.prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ?').run(
        PRIMARY_ADMIN_EMAIL,
        bcrypt.hashSync(PRIMARY_ADMIN_PASSWORD, 10),
        legacyAdmin.id,
      );
    }
  }

  // Seed admin user if none exists
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync(PRIMARY_ADMIN_PASSWORD, 10);
    db.prepare(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
    ).run(PRIMARY_ADMIN_USERNAME, PRIMARY_ADMIN_EMAIL, hash);
    console.log('✅ Admin seeded — email: admin@gmail.com | password: admin123');
  }
}

module.exports = { db, initDatabase };
