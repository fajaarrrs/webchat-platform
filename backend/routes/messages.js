const express = require('express');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:forumId — get message history (last 200 messages)
router.get('/:forumId', authenticate, (req, res) => {
  const forumId = parseInt(req.params.forumId);
  if (isNaN(forumId)) return res.status(400).json({ error: 'Forum ID tidak valid.' });

  // Admin can access all forums; others need membership
  if (req.user.role !== 'admin') {
    const membership = db.prepare(
      'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
    ).get(forumId, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Tidak memiliki akses ke forum ini.' });
  }

  const messages = db.prepare(`
    SELECT m.id, m.content, m.created_at,
           u.id as user_id, u.username, u.role
    FROM messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.forum_id = ?
    ORDER BY m.created_at ASC
    LIMIT 200
  `).all(forumId);

  res.json(messages);
});

module.exports = router;
