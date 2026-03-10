const express = require('express');
const crypto = require('crypto');
const { db } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

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

  const token = crypto.randomBytes(5).toString('hex');
  const result = db.prepare(
    'INSERT INTO forums (title, project, description, token, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(title.trim(), project.trim(), (description || '').trim(), token, req.user.id);

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
  const forum = db.prepare('SELECT * FROM forums WHERE token = ?').get(req.params.token);
  if (!forum) return res.status(404).json({ error: 'Link tidak valid atau forum tidak ditemukan.' });

  db.prepare(
    'INSERT OR IGNORE INTO forum_members (forum_id, user_id) VALUES (?, ?)'
  ).run(forum.id, req.user.id);

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

// DELETE /api/forums/:id — delete forum (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const forumId = parseInt(req.params.id);
  const forum = db.prepare('SELECT id FROM forums WHERE id = ?').get(forumId);
  if (!forum) return res.status(404).json({ error: 'Forum tidak ditemukan.' });

  db.prepare('DELETE FROM messages WHERE forum_id = ?').run(forumId);
  db.prepare('DELETE FROM forum_members WHERE forum_id = ?').run(forumId);
  db.prepare('DELETE FROM forums WHERE id = ?').run(forumId);

  res.json({ message: 'Forum berhasil dihapus.' });
});

module.exports = router;
