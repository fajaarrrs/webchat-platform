const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const base = path.basename(file.originalname || 'file', ext).replace(/[^a-zA-Z0-9-_]/g, '-');
      cb(null, `${Date.now()}-${base}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function mapMessageWithSender(messageId) {
  return db.prepare(`
    SELECT m.id, m.forum_id, m.user_id, m.content, m.file_url, m.file_name, m.file_type,
           m.is_pinned, m.reply_to_id, m.edited_at, m.created_at,
           u.username, u.role,
           COALESCE(ru.username, m.reply_preview_username) AS reply_username,
           COALESCE(rm.content, m.reply_preview_content) AS reply_content,
           COALESCE(rm.file_name, m.reply_preview_file_name) AS reply_file_name,
           COALESCE(rm.file_url, m.reply_preview_file_url) AS reply_file_url,
           COALESCE(rm.file_type, m.reply_preview_file_type) AS reply_file_type
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN messages rm ON m.reply_to_id = rm.id
    LEFT JOIN users ru ON rm.user_id = ru.id
    WHERE m.id = ?
  `).get(messageId);
}

function hasForumAccess(user, forumId) {
  if (user.role === 'admin') return true;
  const membership = db.prepare(
    'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
  ).get(forumId, user.id);
  return !!membership;
}

// GET /api/messages/download/:messageId — download attachment by message id
router.get('/download/:messageId', (req, res) => {
  const messageId = parseInt(req.params.messageId);
  if (isNaN(messageId)) {
    return res.status(400).send('Message ID tidak valid.');
  }

  const message = db.prepare(
    'SELECT file_url, file_name, file_type FROM messages WHERE id = ?'
  ).get(messageId);

  if (!message || !message.file_url) {
    return res.status(404).send('File tidak ditemukan.');
  }

  const relativeFilePath = message.file_url.replace(/^\/+/, '');
  const absoluteFilePath = path.join(__dirname, '..', relativeFilePath);

  if (!fs.existsSync(absoluteFilePath)) {
    return res.status(404).send('File tidak ditemukan di server.');
  }

  if (message.file_type) {
    res.setHeader('Content-Type', message.file_type);
  }

  return res.download(absoluteFilePath, message.file_name || path.basename(absoluteFilePath));
});

// GET /api/messages/:forumId — get message history (last 200 messages)
router.get('/:forumId', authenticate, (req, res) => {
  const forumId = parseInt(req.params.forumId);
  if (isNaN(forumId)) return res.status(400).json({ error: 'Forum ID tidak valid.' });

  // Admin can access all forums; others need membership
  if (!hasForumAccess(req.user, forumId)) {
    return res.status(403).json({ error: 'Tidak memiliki akses ke forum ini.' });
  }

  const messages = db.prepare(`
    SELECT m.id, m.forum_id, m.user_id, m.content, m.file_url, m.file_name, m.file_type,
           m.is_pinned, m.reply_to_id, m.edited_at, m.created_at,
           u.username, u.role,
           COALESCE(ru.username, m.reply_preview_username) AS reply_username,
           COALESCE(rm.content, m.reply_preview_content) AS reply_content,
           COALESCE(rm.file_name, m.reply_preview_file_name) AS reply_file_name,
           COALESCE(rm.file_url, m.reply_preview_file_url) AS reply_file_url,
           COALESCE(rm.file_type, m.reply_preview_file_type) AS reply_file_type
    FROM messages m
    JOIN users u ON m.user_id = u.id
    LEFT JOIN messages rm ON m.reply_to_id = rm.id
    LEFT JOIN users ru ON rm.user_id = ru.id
    WHERE m.forum_id = ?
    ORDER BY m.created_at ASC
    LIMIT 200
  `).all(forumId);

  res.json(messages);
});

// POST /api/messages/upload — upload file attachment and create message entry
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    const forumId = parseInt(req.body.forumId);
    const replyToId = req.body.replyToId ? parseInt(req.body.replyToId) : null;

    if (isNaN(forumId)) {
      return res.status(400).json({ error: 'Forum ID tidak valid.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File wajib diunggah.' });
    }
    if (!hasForumAccess(req.user, forumId)) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke forum ini.' });
    }

    let safeReplyToId = null;
    let replySnapshot = null;
    if (!Number.isNaN(replyToId) && replyToId) {
      const repliedMessage = db.prepare(
        `SELECT m.id, m.content, m.file_name, m.file_url, m.file_type, u.username
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.id = ? AND m.forum_id = ?`
      ).get(replyToId, forumId);
      if (repliedMessage) {
        safeReplyToId = replyToId;
        replySnapshot = repliedMessage;
      }
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const result = db.prepare(`
      INSERT INTO messages (
        forum_id, user_id, content, file_url, file_name, file_type, reply_to_id,
        reply_preview_username, reply_preview_content, reply_preview_file_name, reply_preview_file_url, reply_preview_file_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      forumId,
      req.user.id,
      '',
      fileUrl,
      req.file.originalname,
      req.file.mimetype || null,
      safeReplyToId,
      replySnapshot?.username || null,
      replySnapshot?.content || null,
      replySnapshot?.file_name || null,
      replySnapshot?.file_url || null,
      replySnapshot?.file_type || null
    );

    const message = mapMessageWithSender(result.lastInsertRowid);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengunggah file.' });
  }
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ukuran file maksimal 10MB.' });
    }
    return res.status(400).json({ error: 'Upload file gagal.' });
  }
  return next(error);
});

module.exports = router;
