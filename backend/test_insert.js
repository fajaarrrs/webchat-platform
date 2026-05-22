const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'webchat.db'));

try {
  const result = db.prepare(
    `INSERT INTO messages (
      forum_id, user_id, content, reply_to_id,
      reply_preview_username, reply_preview_content, reply_preview_file_name, reply_preview_file_url, reply_preview_file_type,
      is_event, event_name, event_description, event_start_at, event_end_at, event_location, event_call_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    1, // Replace with valid forum_id
    1, // Replace with valid user_id
    '',
    null,
    null,
    null,
    null,
    null,
    null,
    1,
    'Test Event',
    'Test Desc',
    '2026-05-04T10:00:00.000Z',
    null,
    'Room 1',
    ''
  );
  console.log('Insert successful:', result);
} catch (e) {
  console.error('Insert failed:', e);
}
