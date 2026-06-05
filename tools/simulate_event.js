const { db, initDatabase } = require('../backend/database');

// Initialize DB (migrations)
initDatabase();

(async () => {
  try {
    // Pick a user (seeded admin or first user)
    const user = db.prepare('SELECT id, username FROM users ORDER BY id LIMIT 1').get();
    if (!user) {
      console.error('No users found in database.');
      process.exit(1);
    }

    // Pick or create a forum
    let forum = db.prepare('SELECT id FROM forums ORDER BY id LIMIT 1').get();
    if (!forum) {
      const token = `sim-${Date.now()}`;
      db.prepare('INSERT INTO forums (title, project, token, created_by) VALUES (?, ?, ?, ?)').run('Simulated Forum', 'sim', token, user.id);
      forum = db.prepare('SELECT id FROM forums WHERE token = ?').get(token);
      db.prepare('INSERT INTO forum_members (forum_id, user_id) VALUES (?, ?)').run(forum.id, user.id);
    }

    const forumId = forum.id;

    // Create an event starting in 5 minutes
    const startAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const res = db.prepare(`INSERT INTO messages (
      forum_id, user_id, content, is_event, event_name, event_description, event_start_at, event_end_at, event_location, event_call_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(forumId, user.id, '', 1, 'Simulated Reminder Event', 'Auto-generated for test', startAt, null, 'Ruang Test', '');

    const messageId = res.lastInsertRowid;

    // Prepare reminders: 1 minute before start for all forum members except sender
    const members = db.prepare('SELECT DISTINCT user_id FROM forum_members WHERE forum_id = ? AND user_id != ?').all(forumId, user.id);
    if (members.length === 0) {
      // If no other members, create for creator to observe worker behavior
      const remindAt = new Date(Date.now() + 60 * 1000).toISOString();
      db.prepare('INSERT INTO reminders (message_id, user_id, method, offset_minutes, remind_at) VALUES (?, ?, ?, ?, ?)')
        .run(messageId, user.id, 'push', 1, remindAt);
      console.log('Inserted reminder for creator only, messageId:', messageId);
    } else {
      for (const m of members) {
        const remindAt = new Date(new Date(startAt).getTime() - (1 * 60 * 1000)).toISOString();
        db.prepare('INSERT INTO reminders (message_id, user_id, method, offset_minutes, remind_at) VALUES (?, ?, ?, ?, ?)')
          .run(messageId, m.user_id, 'push', 1, remindAt);
      }
      console.log('Inserted reminders for members, messageId:', messageId, 'count:', members.length);
    }

    process.exit(0);
  } catch (err) {
    console.error('Simulation failed:', err);
    process.exit(1);
  }
})();
