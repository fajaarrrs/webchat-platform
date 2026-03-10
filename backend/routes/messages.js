const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Multer storage — save to uploads/ with original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const MSG_SELECT = `
  SELECT m.id, m.content, m.created_at, m.is_pinned, m.reply_to_id,
         m.file_url, m.file_name, m.file_size, m.file_type,
         u.id as user_id, u.username, u.role,
         rm.content as reply_content, ru.username as reply_username
  FROM messages m
  JOIN users u ON m.user_id = u.id
  LEFT JOIN messages rm ON m.reply_to_id = rm.id
  LEFT JOIN users ru ON rm.user_id = ru.id
`;

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
    ${MSG_SELECT}
    WHERE m.forum_id = ?
    ORDER BY m.created_at ASC
    LIMIT 200
  `).all(forumId);

  res.json(messages);
});

// POST /api/messages/upload — upload a file and create a message
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  const { forumId, replyToId } = req.body;
  const fid = parseInt(forumId);
  if (isNaN(fid) || !req.file) {
    return res.status(400).json({ error: 'Forum ID atau file tidak valid.' });
  }

  // Verify membership
  if (req.user.role !== 'admin') {
    const membership = db.prepare(
      'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
    ).get(fid, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Tidak memiliki akses ke forum ini.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const replyId = replyToId ? parseInt(replyToId) : null;

  const result = db.prepare(
    'INSERT INTO messages (forum_id, user_id, content, reply_to_id, file_url, file_name, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(fid, req.user.id, '', replyId, fileUrl, req.file.originalname, req.file.size, req.file.mimetype);

  const message = db.prepare(`${MSG_SELECT} WHERE m.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(message);
});

// GET /api/messages/download/:id — download file with original filename
router.get('/download/:id', authenticate, (req, res) => {
  const msgId = parseInt(req.params.id);
  if (isNaN(msgId)) return res.status(400).json({ error: 'ID tidak valid.' });

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
  if (!msg || !msg.file_url) return res.status(404).json({ error: 'File tidak ditemukan.' });

  // Check membership (admin bypasses)
  if (req.user.role !== 'admin') {
    const membership = db.prepare(
      'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
    ).get(msg.forum_id, req.user.id);
    if (!membership) return res.status(403).json({ error: 'Tidak memiliki akses.' });
  }

  const filePath = path.join(__dirname, '..', msg.file_url);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ada di server.' });

  // Sanitize filename to prevent header injection
  const safeFilename = (msg.file_name || 'file').replace(/[^\w.\-\s]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', msg.file_type || 'application/octet-stream');
  res.sendFile(filePath);
});

// DELETE /api/messages/:id — delete a message (owner or admin)
router.delete('/:id', authenticate, (req, res) => {
  const msgId = parseInt(req.params.id);
  if (isNaN(msgId)) return res.status(400).json({ error: 'ID tidak valid.' });

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
  if (!msg) return res.status(404).json({ error: 'Pesan tidak ditemukan.' });

  if (req.user.role !== 'admin' && msg.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Tidak bisa menghapus pesan orang lain.' });
  }

  db.prepare('DELETE FROM messages WHERE id = ?').run(msgId);

  // Delete physical file if present
  if (msg.file_url) {
    const filePath = path.join(__dirname, '..', msg.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  res.json({ message: 'Pesan dihapus.' });
});

// PATCH /api/messages/:id/pin — toggle pin (admin only)
router.patch('/:id/pin', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang bisa pin pesan.' });
  }

  const msgId = parseInt(req.params.id);
  if (isNaN(msgId)) return res.status(400).json({ error: 'ID tidak valid.' });

  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
  if (!msg) return res.status(404).json({ error: 'Pesan tidak ditemukan.' });

  const newPinState = msg.is_pinned ? 0 : 1;
  db.prepare('UPDATE messages SET is_pinned = ? WHERE id = ?').run(newPinState, msgId);
  res.json({ id: msgId, is_pinned: newPinState });
});

module.exports = router;
