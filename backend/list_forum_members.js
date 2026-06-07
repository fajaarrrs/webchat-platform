const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'webchat.db'));

const rows = db.prepare("SELECT f.id as forum_id,f.title,u.id as user_id,u.username,u.role FROM forums f JOIN forum_members fm ON fm.forum_id=f.id JOIN users u ON u.id=fm.user_id ORDER BY f.id,u.username").all();
if (!rows || rows.length === 0) {
  console.log('No forum members');
} else {
  rows.forEach(r => console.log(`Forum ${r.forum_id} (${r.title}) -> ${r.user_id}. ${r.username} (${r.role})`));
}

db.close();
