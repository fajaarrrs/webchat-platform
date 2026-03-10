const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'webchat.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

function initDatabase() {
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
      content TEXT NOT NULL DEFAULT '',
      is_pinned INTEGER DEFAULT 0,
      reply_to_id INTEGER,
      file_url TEXT,
      file_name TEXT,
      file_size INTEGER,
      file_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (forum_id) REFERENCES forums(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reply_to_id) REFERENCES messages(id)
    );
  `);

  // Migrations for existing databases
  const msgCols = db.prepare('PRAGMA table_info(messages)').all().map(c => c.name);
  if (!msgCols.includes('is_pinned')) {
    db.exec('ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0');
  }
  if (!msgCols.includes('reply_to_id')) {
    db.exec('ALTER TABLE messages ADD COLUMN reply_to_id INTEGER');
  }
  if (!msgCols.includes('file_url')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_url TEXT');
  }
  if (!msgCols.includes('file_name')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_name TEXT');
  }
  if (!msgCols.includes('file_size')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_size INTEGER');
  }
  if (!msgCols.includes('file_type')) {
    db.exec('ALTER TABLE messages ADD COLUMN file_type TEXT');
  }

  // Seed admin user if none exists
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('adminchat', 10);
    db.prepare(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
    ).run('admin', 'admin@webcare.com', hash);
    console.log('✅ Admin seeded — email: admin@webcare.com | password: adminchat');
  }
}

module.exports = { db, initDatabase };
