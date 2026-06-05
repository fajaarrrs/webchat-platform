const MS_PER_MIN = 60 * 1000;

function formatDateSql(d) {
  // returns ISO string acceptable by SQLite (UTC)
  return new Date(d).toISOString();
}

function startReminderWorker(db, sendPushToUser, io) {
  if (!db || !sendPushToUser) return;

  async function tick() {
    try {
      const rows = db.prepare(`SELECT r.id, r.message_id, r.user_id, r.method, r.offset_minutes, r.remind_at, r.sent, m.forum_id, m.event_name, m.event_start_at
        FROM reminders r
        JOIN messages m ON m.id = r.message_id
        WHERE r.sent = 0 AND datetime(r.remind_at) <= datetime('now')
        ORDER BY r.remind_at ASC
        LIMIT 50
      `).all();

      for (const r of rows) {
        try {
          const payload = {
            title: r.event_name ? `Reminder: ${r.event_name}` : 'Event reminder',
            body: r.event_start_at ? `Event starts at ${r.event_start_at}` : 'Upcoming event',
            icon: '/webcare-logo.webp',
            badge: '/webcare-logo.webp',
            tag: `reminder-${r.id}`,
            data: {
              type: 'event-reminder',
              forumId: r.forum_id,
              messageId: r.message_id
            }
          };

          await sendPushToUser(r.user_id, payload);
          db.prepare('UPDATE reminders SET sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(r.id);
          console.log(`[REMINDER] Sent reminder ${r.id} for user ${r.user_id}`);

          // Optionally notify connected socket to update client UI
          if (io) {
            io.to(`forum:${r.forum_id}`).emit('reminder_sent', { reminderId: r.id, messageId: r.message_id, userId: r.user_id });
          }
        } catch (err) {
          console.error('[REMINDER] Failed to send reminder', r.id, err && err.message ? err.message : err);
        }
      }
    } catch (err) {
      console.error('[REMINDER] Worker tick error:', err && err.message ? err.message : err);
    }
  }

  // run immediately once, then every minute
  tick();
  const interval = setInterval(tick, MS_PER_MIN);

  return () => clearInterval(interval);
}

module.exports = { startReminderWorker };
