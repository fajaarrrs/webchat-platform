const express = require('express');
const { db } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const MAX_FORUM_TEXT_LENGTH = 25;

function getSessionStatus(lastActivity, hasMessages) {
  if (!hasMessages) return 'pending';
  if (!lastActivity) return 'pending';

  const parsed = new Date(lastActivity.endsWith('Z') ? lastActivity : `${lastActivity.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return 'pending';

  const diffMs = Date.now() - parsed.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return diffMs <= dayMs ? 'active' : 'done';
}

function isSameJakartaDay(dateValue) {
  if (!dateValue) return false;
  const parsed = new Date(dateValue.endsWith('Z') ? dateValue : `${dateValue.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return false;

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return fmt.format(parsed) === fmt.format(new Date());
}

function toSlug(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildUniqueForumTokenFromTitle(title) {
  const base = toSlug(title) || 'forum';
  let candidate = base;
  let suffix = 2;

  // Keep slug human-readable while ensuring token remains unique.
  while (db.prepare('SELECT id FROM forums WHERE token = ?').get(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

// GET /api/forums — admin gets all, others get only their forums
router.get('/', authenticate, (req, res) => {
  let forums;
  if (req.user.role === 'admin') {
    forums = db.prepare(`
      SELECT f.*,
             u.username as creator_name,
             (SELECT COUNT(*) FROM forum_members WHERE forum_id = f.id) as member_count,
             (SELECT COUNT(*) FROM messages WHERE forum_id = f.id) as message_count,
             (SELECT content FROM messages WHERE forum_id = f.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM messages WHERE forum_id = f.id ORDER BY created_at DESC LIMIT 1) as last_activity
      FROM forums f
      LEFT JOIN users u ON f.created_by = u.id
      ORDER BY f.created_at DESC
    `).all();
  } else {
    forums = db.prepare(`
      SELECT f.*,
             u.username as creator_name,
             (SELECT COUNT(*) FROM forum_members WHERE forum_id = f.id) as member_count,
             (SELECT COUNT(*) FROM messages WHERE forum_id = f.id) as message_count,
             (SELECT content FROM messages WHERE forum_id = f.id ORDER BY created_at DESC LIMIT 1) as last_message,
             (SELECT created_at FROM messages WHERE forum_id = f.id ORDER BY created_at DESC LIMIT 1) as last_activity
      FROM forums f
      LEFT JOIN users u ON f.created_by = u.id
      JOIN forum_members fm ON fm.forum_id = f.id AND fm.user_id = ?
      ORDER BY f.created_at DESC
    `).all(req.user.id);
  }
  res.json(forums);
});

// POST /api/forums — create forum (admin only)
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, project, description } = req.body;
  if (!title || !project) {
    return res.status(400).json({ error: 'Judul forum dan nama project wajib diisi.' });
  }

  const cleanTitle = title.trim();
  const cleanProject = project.trim();

  if (cleanTitle.length > MAX_FORUM_TEXT_LENGTH || cleanProject.length > MAX_FORUM_TEXT_LENGTH) {
    return res.status(400).json({ error: `Judul link dan nama project maksimal ${MAX_FORUM_TEXT_LENGTH} karakter.` });
  }

  const token = buildUniqueForumTokenFromTitle(cleanTitle);
  const result = db.prepare(
    'INSERT INTO forums (title, project, description, token, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(cleanTitle, cleanProject, (description || '').trim(), token, req.user.id);

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

// POST /api/forums/join/:token — join forum via link token
router.post('/join/:token', authenticate, (req, res) => {
  const identifier = String(req.params.token || '').trim();
  if (!identifier) {
    return res.status(400).json({ error: 'Token/link forum tidak valid.' });
  }

  // Primary lookup by token
  let forum = db.prepare('SELECT * FROM forums WHERE token = ?').get(identifier);

  // Fallback lookup by slug title or title-project (for human-friendly links)
  if (!forum) {
    const incomingSlug = toSlug(identifier);
    const allForums = db.prepare('SELECT * FROM forums').all();
    forum = allForums.find((item) => {
      const titleSlug = toSlug(item.title);
      const titleProjectSlug = toSlug(`${item.title}-${item.project}`);
      return incomingSlug === titleSlug || incomingSlug === titleProjectSlug;
    });
  }

  if (!forum) return res.status(404).json({ error: 'Link tidak valid atau forum tidak ditemukan.' });

  db.prepare(
    'INSERT OR IGNORE INTO forum_members (forum_id, user_id) VALUES (?, ?)'
  ).run(forum.id, req.user.id);

  res.json({ forum_id: forum.id, title: forum.title, project: forum.project });
});

// GET /api/forums/dashboard/client — client dashboard summary
router.get('/dashboard/client', authenticate, (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Hanya client yang dapat mengakses data dashboard ini.' });
  }

  const rows = db.prepare(`
    SELECT
      f.id,
      f.title,
      f.project,
      (
        SELECT m.content
        FROM messages m
        WHERE m.forum_id = f.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_preview,
      (
        SELECT m.created_at
        FROM messages m
        WHERE m.forum_id = f.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_activity,
      (
        SELECT u.username
        FROM messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.forum_id = f.id AND u.role IN ('admin', 'karyawan')
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS staff_name,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.forum_id = f.id
      ) AS message_count,
      f.created_at
    FROM forums f
    JOIN forum_members fm ON fm.forum_id = f.id AND fm.user_id = ?
    ORDER BY COALESCE((
      SELECT m.created_at
      FROM messages m
      WHERE m.forum_id = f.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ), f.created_at) DESC
  `).all(req.user.id);

  const sessions = rows.map((row) => {
    const hasMessages = Number(row.message_count || 0) > 0;
    const status = getSessionStatus(row.last_activity, hasMessages);
    return {
      id: row.id,
      title: row.title,
      project: row.project,
      staff_name: row.staff_name || 'Belum ada staff',
      last_preview: row.last_preview || 'Belum ada pesan di forum ini.',
      last_activity: row.last_activity || row.created_at,
      status,
    };
  });

  const stats = {
    activeCount: sessions.filter((s) => s.status === 'active').length,
    pendingCount: sessions.filter((s) => s.status === 'pending').length,
    totalCount: sessions.length,
  };

  res.json({ stats, sessions });
});

// GET /api/forums/dashboard/karyawan — karyawan dashboard summary
router.get('/dashboard/karyawan', authenticate, (req, res) => {
  if (req.user.role !== 'karyawan') {
    return res.status(403).json({ error: 'Hanya karyawan yang dapat mengakses data dashboard ini.' });
  }

  const rows = db.prepare(`
    SELECT
      f.id,
      f.project,
      (
        SELECT m.content
        FROM messages m
        WHERE m.forum_id = f.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_preview,
      (
        SELECT m.created_at
        FROM messages m
        WHERE m.forum_id = f.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_activity,
      (
        SELECT u.username
        FROM messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.forum_id = f.id AND u.role = 'client'
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS client_name,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.forum_id = f.id
      ) AS message_count,
      f.created_at
    FROM forums f
    JOIN forum_members fm ON fm.forum_id = f.id AND fm.user_id = ?
    ORDER BY COALESCE((
      SELECT m.created_at
      FROM messages m
      WHERE m.forum_id = f.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ), f.created_at) DESC
  `).all(req.user.id);

  const queue = rows.map((row) => {
    const hasMessages = Number(row.message_count || 0) > 0;
    const status = getSessionStatus(row.last_activity, hasMessages);
    return {
      id: row.id,
      client_name: row.client_name || 'Client',
      project: row.project,
      last_preview: row.last_preview || 'Belum ada pesan di forum ini.',
      last_activity: row.last_activity || row.created_at,
      status,
    };
  });

  const stats = {
    activeCount: queue.filter((q) => q.status === 'active').length,
    pendingCount: queue.filter((q) => q.status === 'pending').length,
    handledTodayCount: queue.filter((q) => isSameJakartaDay(q.last_activity)).length,
  };

  res.json({ stats, queue });
});

// GET /api/forums/:id/members — list forum members (admin or forum member)
router.get('/:id/members', authenticate, (req, res) => {
  const forumId = parseInt(req.params.id, 10);
  if (Number.isNaN(forumId)) {
    return res.status(400).json({ error: 'Forum ID tidak valid.' });
  }

  const forumExists = db.prepare('SELECT id FROM forums WHERE id = ?').get(forumId);
  if (!forumExists) {
    return res.status(404).json({ error: 'Forum tidak ditemukan.' });
  }

  if (req.user.role !== 'admin') {
    const membership = db.prepare(
      'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
    ).get(forumId, req.user.id);

    if (!membership) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke forum ini.' });
    }
  }

  const members = db.prepare(`
    SELECT u.id, u.username, u.role, fm.joined_at,
           u.last_seen,
           CASE WHEN EXISTS (SELECT 1 FROM presence_devices pd WHERE pd.user_id = u.id AND pd.is_online = 1) THEN 1 ELSE 0 END AS is_online,
           (SELECT label FROM presence_devices WHERE user_id = u.id AND last_closed_at IS NOT NULL ORDER BY last_closed_at DESC LIMIT 1) AS last_closed_device_label
    FROM forum_members fm
    JOIN users u ON u.id = fm.user_id
    WHERE fm.forum_id = ?
    ORDER BY
      CASE u.role
        WHEN 'admin' THEN 1
        WHEN 'karyawan' THEN 2
        ELSE 3
      END,
      u.username COLLATE NOCASE ASC
  `).all(forumId);

  return res.json(members);
});

// DELETE /api/forums/:id/leave — leave forum (member only)
router.delete('/:id/leave', authenticate, (req, res) => {
  const forumId = parseInt(req.params.id, 10);
  if (Number.isNaN(forumId)) {
    return res.status(400).json({ error: 'Forum ID tidak valid.' });
  }

  const forum = db.prepare('SELECT id FROM forums WHERE id = ?').get(forumId);
  if (!forum) {
    return res.status(404).json({ error: 'Forum tidak ditemukan.' });
  }

  const membership = db.prepare(
    'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
  ).get(forumId, req.user.id);

  if (!membership) {
    return res.status(404).json({ error: 'Anda bukan anggota forum ini.' });
  }

  db.prepare('DELETE FROM forum_members WHERE forum_id = ? AND user_id = ?').run(forumId, req.user.id);

  return res.json({ message: 'Berhasil keluar dari forum.' });
});

// DELETE /api/forums/:id — delete forum (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const forumId = parseInt(req.params.id, 10);
  if (Number.isNaN(forumId)) {
    return res.status(400).json({ error: 'Forum ID tidak valid.' });
  }

  const forum = db.prepare('SELECT id FROM forums WHERE id = ?').get(forumId);
  if (!forum) return res.status(404).json({ error: 'Forum tidak ditemukan.' });

  try {
    const removeForumTx = db.transaction((id) => {
      // Putuskan referensi reply lintas-forum sebelum menghapus pesan forum ini.
      db.prepare(`
        UPDATE messages
        SET reply_to_id = NULL
        WHERE reply_to_id IN (
          SELECT m.id FROM messages m WHERE m.forum_id = ?
        )
      `).run(id);

      // Bersihkan pointer baca terakhir user untuk forum ini.
      db.prepare('DELETE FROM forum_reads WHERE forum_id = ?').run(id);

      // Saat forum dihapus, semua anggota forum ini otomatis dikeluarkan.
      db.prepare('DELETE FROM forum_members WHERE forum_id = ?').run(id);
      db.prepare('DELETE FROM messages WHERE forum_id = ?').run(id);
      db.prepare('DELETE FROM forums WHERE id = ?').run(id);
    });

    removeForumTx(forumId);
    return res.json({ message: 'Forum berhasil dihapus. Semua anggota otomatis dikeluarkan.' });
  } catch (error) {
    return res.status(500).json({ error: 'Gagal menghapus forum. Silakan coba lagi.' });
  }
});

// PUT /api/forums/:id — update forum metadata (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const forumId = parseInt(req.params.id, 10);
  if (Number.isNaN(forumId)) return res.status(400).json({ error: 'Forum ID tidak valid.' });

  const forum = db.prepare('SELECT * FROM forums WHERE id = ?').get(forumId);
  if (!forum) return res.status(404).json({ error: 'Forum tidak ditemukan.' });

  const { title, project, description } = req.body || {};
  if (!title || !project) return res.status(400).json({ error: 'Judul forum dan nama project wajib diisi.' });

  const cleanTitle = String(title).trim();
  const cleanProject = String(project).trim();
  const cleanDesc = (description || '').trim();

  if (cleanTitle.length > MAX_FORUM_TEXT_LENGTH || cleanProject.length > MAX_FORUM_TEXT_LENGTH) {
    return res.status(400).json({ error: `Judul link dan nama project maksimal ${MAX_FORUM_TEXT_LENGTH} karakter.` });
  }

  // If title changed, regenerate a unique token (slug-like). Ensure uniqueness excluding current forum id.
  let token = forum.token;
  if (cleanTitle !== forum.title) {
    const base = toSlug(cleanTitle) || 'forum';
    let candidate = base;
    let suffix = 2;
    while (true) {
      const existing = db.prepare('SELECT id FROM forums WHERE token = ?').get(candidate);
      if (!existing || existing.id === forumId) break;
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    token = candidate;
  }

  db.prepare('UPDATE forums SET title = ?, project = ?, description = ?, token = ? WHERE id = ?')
    .run(cleanTitle, cleanProject, cleanDesc, token, forumId);

  const updated = db.prepare(`
    SELECT f.*, u.username as creator_name,
           (SELECT COUNT(*) FROM forum_members WHERE forum_id = f.id) as member_count,
           (SELECT COUNT(*) FROM messages WHERE forum_id = f.id) as message_count
    FROM forums f LEFT JOIN users u ON f.created_by = u.id
    WHERE f.id = ?
  `).get(forumId);

  return res.json(updated);
});

module.exports = router;
