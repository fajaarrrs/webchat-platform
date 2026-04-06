const express = require('express');
const crypto = require('crypto');
const { db } = require('../database');
const { markForumAsRead } = require('../forumState');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function isImageAttachment(fileName = '', fileType = '') {
  return (fileType || '').startsWith('image/')
    || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes((fileName.split('.').pop() || '').toLowerCase());
}

function getPreviewText(row) {
  if (row.last_message && row.last_message.trim()) return row.last_message.trim();
  if (row.last_file_name) return isImageAttachment(row.last_file_name, row.last_file_type) ? 'Gambar' : `File: ${row.last_file_name}`;
  return 'Belum ada pesan.';
}

const FORUM_SELECT_SQL = `
  SELECT f.*,
         u.username as creator_name,
         (SELECT joined_at FROM forum_members WHERE forum_id = f.id AND user_id = ?) as joined_at,
         (SELECT last_read_at FROM forum_reads WHERE forum_id = f.id AND user_id = ?) as last_read_at,
         (SELECT COUNT(*) FROM forum_members WHERE forum_id = f.id) as member_count,
         (SELECT COUNT(*) FROM messages WHERE forum_id = f.id) as message_count,
         (SELECT content FROM messages WHERE forum_id = f.id ORDER BY created_at DESC, id DESC LIMIT 1) as last_message,
         (SELECT file_name FROM messages WHERE forum_id = f.id ORDER BY created_at DESC, id DESC LIMIT 1) as last_file_name,
         (SELECT file_type FROM messages WHERE forum_id = f.id ORDER BY created_at DESC, id DESC LIMIT 1) as last_file_type,
         (SELECT created_at FROM messages WHERE forum_id = f.id ORDER BY created_at DESC, id DESC LIMIT 1) as last_activity,
         (SELECT u2.id FROM messages m JOIN users u2 ON u2.id = m.user_id WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_sender_id,
         (SELECT u2.username FROM messages m JOIN users u2 ON u2.id = m.user_id WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_sender_username,
         (SELECT u2.role FROM messages m JOIN users u2 ON u2.id = m.user_id WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_sender_role,
         (
           SELECT COUNT(*)
           FROM messages m
           LEFT JOIN forum_reads fr ON fr.forum_id = f.id AND fr.user_id = ?
           WHERE m.forum_id = f.id
             AND m.user_id != ?
             AND (
               fr.last_read_at IS NULL
               OR m.created_at > fr.last_read_at
               OR (m.created_at = fr.last_read_at AND m.id > COALESCE(fr.last_read_message_id, 0))
             )
         ) as unread_count
  FROM forums f
  LEFT JOIN users u ON f.created_by = u.id
`;

const jakartaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getJakartaDateKey(value) {
  if (!value) return null;
  const utc = value.endsWith('Z') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return null;
  return jakartaDateFormatter.format(date);
}

function getConversationStatus(row, ownRole, todayKey) {
  if (!row.message_count) return 'pending';
  if (row.last_sender_role && row.last_sender_role !== ownRole) {
    return getJakartaDateKey(row.last_activity || row.created_at) === todayKey ? 'active' : 'done';
  }
  return 'pending';
}

function slugifyForumTitle(input = '') {
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40) || 'forum';
}

function generateUniqueForumSlug(baseSlug) {
  let candidate = baseSlug;
  let suffix = 2;
  while (true) {
    const slugConflict = db.prepare('SELECT id FROM forums WHERE slug = ?').get(candidate);
    const tokenConflict = db.prepare('SELECT id FROM forums WHERE token = ?').get(candidate);
    if (!slugConflict && !tokenConflict) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

// GET /api/forums — admin gets all, others get only their forums
router.get('/', authenticate, (req, res) => {
  let forums;
  if (req.user.role === 'admin') {
    forums = db.prepare(`
      ${FORUM_SELECT_SQL}
      ORDER BY COALESCE((SELECT created_at FROM messages WHERE forum_id = f.id ORDER BY created_at DESC, id DESC LIMIT 1), f.created_at) DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id);
  } else {
    forums = db.prepare(`
      ${FORUM_SELECT_SQL}
      JOIN forum_members fm ON fm.forum_id = f.id AND fm.user_id = ?
      ORDER BY COALESCE((SELECT created_at FROM messages WHERE forum_id = f.id ORDER BY created_at DESC, id DESC LIMIT 1), f.created_at) DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id, req.user.id);
  }
  res.json(forums);
});

// GET /api/forums/dashboard/karyawan — employee dashboard summary and queue
router.get('/dashboard/karyawan', authenticate, (req, res) => {
  if (req.user.role !== 'karyawan') {
    return res.status(403).json({ error: 'Dashboard ini hanya untuk karyawan.' });
  }

  const rows = db.prepare(`
    SELECT f.id, f.title, f.project, f.created_at,
           (SELECT COUNT(*) FROM messages m WHERE m.forum_id = f.id) as message_count,
           (SELECT content FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_message,
           (SELECT file_name FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_file_name,
           (SELECT file_type FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_file_type,
           (SELECT created_at FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_activity,
           (SELECT u.role FROM messages m JOIN users u ON u.id = m.user_id WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_sender_role,
           (SELECT u.username FROM forum_members fm2 JOIN users u ON u.id = fm2.user_id WHERE fm2.forum_id = f.id AND u.role = 'client' ORDER BY fm2.joined_at ASC, u.username ASC LIMIT 1) as client_name,
           EXISTS(
             SELECT 1
             FROM messages m
             WHERE m.forum_id = f.id
               AND m.user_id = ?
               AND date(m.created_at, '+7 hours') = date('now', '+7 hours')
           ) as handled_today
    FROM forums f
    JOIN forum_members fm ON fm.forum_id = f.id
    WHERE fm.user_id = ?
    ORDER BY COALESCE((SELECT created_at FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1), f.created_at) DESC
  `).all(req.user.id, req.user.id);

  const todayKey = jakartaDateFormatter.format(new Date());

  const queue = rows.map((row) => {
    const latestAt = row.last_activity || row.created_at;
    const status = getConversationStatus(row, 'client', todayKey);

    return {
      id: row.id,
      title: row.title,
      project: row.project,
      client_name: row.client_name || row.title,
      last_preview: getPreviewText(row),
      last_activity: latestAt,
      status,
      handled_today: Boolean(row.handled_today),
    };
  });

  const statusPriority = { pending: 0, active: 1, done: 2 };
  queue.sort((a, b) => {
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime();
  });

  res.json({
    stats: {
      activeCount: queue.filter(item => item.status === 'active').length,
      pendingCount: queue.filter(item => item.status === 'pending').length,
      handledTodayCount: queue.filter(item => item.handled_today).length,
    },
    queue: queue.slice(0, 8),
  });
});

// GET /api/forums/dashboard/client — client dashboard summary and session history
router.get('/dashboard/client', authenticate, (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Dashboard ini hanya untuk client.' });
  }

  const rows = db.prepare(`
    SELECT f.id, f.title, f.project, f.created_at,
           (SELECT COUNT(*) FROM messages m WHERE m.forum_id = f.id) as message_count,
           (SELECT content FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_message,
           (SELECT file_name FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_file_name,
           (SELECT file_type FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_file_type,
           (SELECT created_at FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_activity,
           (SELECT u.role FROM messages m JOIN users u ON u.id = m.user_id WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_sender_role,
           (
             SELECT u.username
             FROM forum_members fm2
             JOIN users u ON u.id = fm2.user_id
             WHERE fm2.forum_id = f.id AND u.role IN ('karyawan', 'admin')
             ORDER BY CASE WHEN u.role = 'karyawan' THEN 0 ELSE 1 END, fm2.joined_at ASC, u.username ASC
             LIMIT 1
           ) as staff_name
    FROM forums f
    JOIN forum_members fm ON fm.forum_id = f.id AND fm.user_id = ?
    ORDER BY COALESCE((SELECT created_at FROM messages m WHERE m.forum_id = f.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1), f.created_at) DESC
  `).all(req.user.id);

  const todayKey = jakartaDateFormatter.format(new Date());
  const sessions = rows.map((row) => {
    const latestAt = row.last_activity || row.created_at;
    return {
      id: row.id,
      title: row.title,
      project: row.project,
      staff_name: row.staff_name || 'Belum ditetapkan',
      last_preview: getPreviewText(row),
      last_activity: latestAt,
      status: getConversationStatus(row, 'client', todayKey),
    };
  });

  res.json({
    stats: {
      activeCount: sessions.filter(item => item.status === 'active').length,
      pendingCount: sessions.filter(item => item.status === 'pending').length,
      totalCount: sessions.length,
    },
    sessions: sessions.slice(0, 8),
  });
});

// POST /api/forums — create forum (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, project, description } = req.body;
  if (!title || !project) {
    return res.status(400).json({ error: 'Judul forum dan nama project wajib diisi.' });
  }

  const normalizedTitle = title.trim();
  const normalizedProject = project.trim();
  const token = crypto.randomBytes(5).toString('hex');
  const slug = generateUniqueForumSlug(slugifyForumTitle(normalizedTitle));
  const result = db.prepare(
    'INSERT INTO forums (title, project, description, token, slug, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(normalizedTitle, normalizedProject, (description || '').trim(), token, slug, req.user.id);

  // Auto-add admin as member
  db.prepare(
    'INSERT OR IGNORE INTO forum_members (forum_id, user_id) VALUES (?, ?)'
  ).run(result.lastInsertRowid, req.user.id);

  const forum = db.prepare(`
    SELECT f.*, u.username as creator_name,
           (SELECT COUNT(*) FROM forum_members WHERE forum_id = f.id) as member_count,
           (SELECT COUNT(*) FROM messages WHERE forum_id = f.id) as message_count
    FROM forums f LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(forum);
});

// POST /api/forums/join/:identifier — join forum via link slug/token
router.post('/join/:identifier', authenticate, (req, res) => {
  const identifier = req.params.identifier;
  const forum = db.prepare('SELECT * FROM forums WHERE slug = ? OR token = ?').get(identifier, identifier);
  if (!forum) return res.status(404).json({ error: 'Link tidak valid atau forum tidak ditemukan.' });

  db.prepare(
    'INSERT OR IGNORE INTO forum_members (forum_id, user_id) VALUES (?, ?)'
  ).run(forum.id, req.user.id);
  markForumAsRead(forum.id, req.user.id);

  res.json({ forum_id: forum.id, title: forum.title, project: forum.project });
});

// GET /api/forums/:id/members — get forum members
router.get('/:id/members', authenticate, (req, res) => {
  const forumId = parseInt(req.params.id);
  if (isNaN(forumId)) return res.status(400).json({ error: 'Forum ID tidak valid.' });

  if (req.user.role !== 'admin') {
    const membership = db.prepare(
      'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
    ).get(forumId, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Tidak memiliki akses.' });
  }

  const members = db.prepare(`
    SELECT u.id, u.username, u.role
    FROM forum_members fm
    JOIN users u ON fm.user_id = u.id
    WHERE fm.forum_id = ?
    ORDER BY u.role, u.username
  `).all(forumId);

  res.json(members);
});

// DELETE /api/forums/:id/leave — current user leaves a forum
router.delete('/:id/leave', authenticate, (req, res) => {
  const forumId = parseInt(req.params.id);
  if (isNaN(forumId)) return res.status(400).json({ error: 'Forum ID tidak valid.' });

  const forum = db.prepare('SELECT id FROM forums WHERE id = ?').get(forumId);
  if (!forum) return res.status(404).json({ error: 'Forum tidak ditemukan.' });

  const membership = db.prepare(
    'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
  ).get(forumId, req.user.id);

  if (!membership) {
    return res.status(404).json({ error: 'Kamu bukan member forum ini.' });
  }

  db.prepare('DELETE FROM forum_members WHERE forum_id = ? AND user_id = ?')
    .run(forumId, req.user.id);

  res.json({ message: 'Berhasil keluar dari grup.' });
});

// DELETE /api/forums/:id — delete forum (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const forumId = parseInt(req.params.id);
  const forum = db.prepare('SELECT id FROM forums WHERE id = ?').get(forumId);
  if (!forum) return res.status(404).json({ error: 'Forum tidak ditemukan.' });

  try {
    const deleteForumSafely = db.transaction((targetForumId) => {
      db.prepare('DELETE FROM forum_reads WHERE forum_id = ?').run(targetForumId);
      db.prepare('DELETE FROM messages WHERE forum_id = ?').run(targetForumId);
      db.prepare('DELETE FROM forum_members WHERE forum_id = ?').run(targetForumId);
      db.prepare('DELETE FROM forums WHERE id = ?').run(targetForumId);
    });

    deleteForumSafely(forumId);
  } catch (error) {
    console.error('Delete forum failed:', error);
    return res.status(500).json({ error: 'Gagal menghapus forum.' });
  }

  res.json({ message: 'Forum berhasil dihapus.' });
});

module.exports = router;
