const { db, initDatabase } = require('../database');

// Ensure DB initialized (no-op if already)
initDatabase();

const forums = db.prepare('SELECT id, title FROM forums ORDER BY id').all();
console.log('Forums:');
for (const f of forums) {
  console.log(`- [${f.id}] ${f.title}`);
  const meta = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM forum_members WHERE forum_id = ?) as member_count,
      (SELECT COUNT(*) FROM messages WHERE forum_id = ?) as message_count,
      (SELECT created_at FROM messages WHERE forum_id = ? ORDER BY created_at DESC, id DESC LIMIT 1) as last_activity
  `).get(f.id, f.id, f.id);

  console.log(`  members: ${meta.member_count}, messages: ${meta.message_count}, last_activity: ${meta.last_activity}`);
  const members = db.prepare('SELECT u.id, u.username, u.role FROM forum_members fm JOIN users u ON u.id = fm.user_id WHERE fm.forum_id = ?').all(f.id);
  if (members.length > 0) {
    console.log('  member ids: ' + members.map(m => `${m.id}(${m.username}:${m.role})`).join(', '));
  }

  const recent = db.prepare('SELECT id, user_id, content, file_name, created_at FROM messages WHERE forum_id = ? ORDER BY created_at DESC, id DESC LIMIT 6').all(f.id);
  if (recent.length === 0) {
    console.log('  (no messages)');
  } else {
    for (const m of recent) {
      console.log(`  message ${m.id} by ${m.user_id} @ ${m.created_at}: ${m.file_name ? '[file] ' + m.file_name : (m.content ? m.content.slice(0,80) : '')}`);
    }
  }
}

process.exit(0);
