const Database = require('better-sqlite3');
const path = require('path');

try {
  const db = new Database(path.join(__dirname, 'backend', 'webchat.db'));
  const columns = db.prepare('PRAGMA table_info(messages)').all();
  console.log('Columns in messages table:');
  console.log(columns.map(c => c.name).join(', '));

  const events = db.prepare('SELECT id, is_event, event_name, content FROM messages WHERE is_event = 1 ORDER BY id DESC LIMIT 5').all();
  console.log('\nRecent events:');
  console.log(events);
} catch (e) {
  console.error(e);
}
