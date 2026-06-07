const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'webchat.db'));

try {
  const info = db.prepare("INSERT OR IGNORE INTO forum_members (forum_id, user_id) SELECT f.id, u.id FROM forums f JOIN users u ON u.role = 'admin'").run();
  console.log('Inserted rows (estimated):', info.changes);
} catch (err) {
  console.error('Failed to ensure admin members:', err.message || err);
} finally {
  db.close();
}
