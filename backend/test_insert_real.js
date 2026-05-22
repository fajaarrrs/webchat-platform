const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'webchat.db'));

try {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  const forum = db.prepare('SELECT id FROM forums LIMIT 1').get();
  
  if (!user || !forum) {
    console.log('No user or forum found, cannot test insert.');
    process.exit(0);
  }

  const result = db.prepare(
    `INSERT INTO messages (
      forum_id, user_id, content, reply_to_id,
      reply_preview_username, reply_preview_content, reply_preview_file_name, reply_preview_file_url, reply_preview_file_type,
      is_event, event_name, event_description, event_start_at, event_end_at, event_location, event_call_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    forum.id,
    user.id,
    '',
    null,
    null,
    null,
    null,
    null,
    null,
    1,
    'Test Event Real',
    'Desc',
    '2026-05-04T10:00:00.000Z',
    null,
    'Loc',
    ''
  );
  console.log('Insert successful:', result);
  
  const events = db.prepare('SELECT * FROM messages WHERE is_event = 1').all();
  console.log('Inserted Event Rows:', events);
} catch (e) {
  console.error('Insert failed:', e);
}
