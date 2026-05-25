const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'webchat.db'));

console.log('=== DATABASE SUBSCRIPTIONS ===\n');

// Check all subscriptions
const subscriptions = db.prepare(`
  SELECT ps.id, ps.user_id, u.username, ps.created_at, 
         LENGTH(ps.subscription) as sub_length
  FROM push_subscriptions ps
  JOIN users u ON u.id = ps.user_id
  ORDER BY ps.created_at DESC
`).all();

console.log(`Total subscriptions: ${subscriptions.length}\n`);
subscriptions.forEach(sub => {
  console.log(`ID: ${sub.id}`);
  console.log(`User: ${sub.username} (ID: ${sub.user_id})`);
  console.log(`Created: ${sub.created_at}`);
  console.log(`Subscription size: ${sub.sub_length} bytes`);
  console.log('---');
});

// Check users
console.log('\n=== USERS ===\n');
const users = db.prepare('SELECT id, username, role FROM users').all();
users.forEach(u => {
  const subCount = db.prepare('SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = ?').get(u.id).count;
  console.log(`${u.id}. ${u.username} (${u.role}) - ${subCount} subscription(s)`);
});

db.close();
