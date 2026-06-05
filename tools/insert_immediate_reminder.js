const { db, initDatabase } = require('../backend/database');
initDatabase();

try {
  const user = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get();
  const message = db.prepare('SELECT id, forum_id FROM messages ORDER BY id DESC LIMIT 1').get();
  if (!user || !message) {
    console.error('No user or message found');
    process.exit(1);
  }
  const remindAt = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
  db.prepare('INSERT INTO reminders (message_id, user_id, method, offset_minutes, remind_at) VALUES (?, ?, ?, ?, ?)')
    .run(message.id, user.id, 'push', 0, remindAt);
  console.log('Inserted immediate reminder for message', message.id, 'user', user.id);
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}
