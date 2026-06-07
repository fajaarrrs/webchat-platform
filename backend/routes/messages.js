const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

let _io = null;
function setIo(io) {
  _io = io;

  // Listen for socket toggle_reaction events per-connection
  _io.on('connection', (socket) => {
    socket.on('toggle_reaction', (payload) => {
      try {
        const { messageId, emoji } = payload || {};
        const mid = parseInt(messageId, 10);
        if (Number.isNaN(mid) || !emoji || !socket.user) return;

        const message = db.prepare('SELECT id, forum_id FROM messages WHERE id = ?').get(mid);
        if (!message) return;

        // Verify membership (admin bypass)
        if (socket.user.role !== 'admin') {
          const membership = db.prepare('SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?').get(message.forum_id, socket.user.id);
          if (!membership) return;
        }

        const existing = db.prepare('SELECT id, emoji FROM message_reactions WHERE message_id = ? AND user_id = ?').get(mid, socket.user.id);
        if (existing) {
          if (existing.emoji === emoji) {
            db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
          } else {
            db.prepare('UPDATE message_reactions SET emoji = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(emoji, existing.id);
          }
        } else {
          db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)').run(mid, socket.user.id, emoji);
        }

        // Build aggregates
        const counts = db.prepare('SELECT emoji, COUNT(*) as count FROM message_reactions WHERE message_id = ? GROUP BY emoji').all(mid);
        const users = db.prepare('SELECT mr.user_id AS userId, u.username, mr.emoji FROM message_reactions mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id = ?').all(mid);

        _io.to(`forum:${message.forum_id}`).emit('message_reactions_updated', {
          messageId: mid,
          reactions: counts.map(r => ({ emoji: r.emoji, count: r.count })),
          users: users.map(u => ({ userId: u.userId, username: u.username, emoji: u.emoji })),
        });
      } catch (err) {
        console.error('toggle_reaction socket error:', err);
      }
    });
  });
}
module.exports.setIo = setIo;

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
           m.is_event, m.event_name, m.event_description, m.event_start_at, m.event_end_at, m.event_location, m.event_call_link,
           m.is_deleted_by_admin, m.deleted_by_admin_at,
           u.username, u.role, u.avatar_url AS avatar,
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

// Attach reactions summary and reacting users to messages array
function attachReactionsToMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  const ids = messages.map(m => m.id);
  const placeholders = ids.map(() => '?').join(',');

  const countsRows = db.prepare(`SELECT message_id, emoji, COUNT(*) AS count FROM message_reactions WHERE message_id IN (${placeholders}) GROUP BY message_id, emoji`).all(...ids);
  const usersRows = db.prepare(`SELECT mr.message_id, mr.user_id AS userId, u.username, mr.emoji FROM message_reactions mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id IN (${placeholders})`).all(...ids);

  const reactionsByMessage = {};
  countsRows.forEach(r => {
    reactionsByMessage[r.message_id] = reactionsByMessage[r.message_id] || [];
    reactionsByMessage[r.message_id].push({ emoji: r.emoji, count: r.count });
  });

  const usersByMessage = {};
  usersRows.forEach(u => {
    usersByMessage[u.message_id] = usersByMessage[u.message_id] || [];
    usersByMessage[u.message_id].push({ userId: u.userId, username: u.username, emoji: u.emoji });
  });

  return messages.map(m => ({ ...m, reactions: reactionsByMessage[m.id] || [], reacting_users: usersByMessage[m.id] || [] }));
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

  let messages = db.prepare(`
    SELECT m.id, m.forum_id, m.user_id, m.content, m.file_url, m.file_name, m.file_type,
           m.is_pinned, m.reply_to_id, m.edited_at, m.created_at,
           m.is_event, m.event_name, m.event_description, m.event_start_at, m.event_end_at, m.event_location, m.event_call_link,
           m.is_deleted_by_admin, m.deleted_by_admin_at,
           u.username, u.role, u.avatar_url AS avatar,
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

  // Attach reactions summary and reacting users to each message
  messages = attachReactionsToMessages(messages);

  res.json(messages);
});

// POST /api/messages/:messageId/reactions — toggle reaction for the authenticated user
router.post('/:messageId/reactions', authenticate, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    const emoji = String(req.body?.emoji || '').trim();
    if (Number.isNaN(messageId) || !emoji) return res.status(400).json({ error: 'Invalid payload.' });

    const message = db.prepare('SELECT id, forum_id FROM messages WHERE id = ?').get(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found.' });

    if (!hasForumAccess(req.user, message.forum_id)) {
      return res.status(403).json({ error: 'Tidak memiliki akses ke forum ini.' });
    }

    const existing = db.prepare('SELECT id, emoji FROM message_reactions WHERE message_id = ? AND user_id = ?').get(messageId, req.user.id);
    if (existing) {
      if (existing.emoji === emoji) {
        db.prepare('DELETE FROM message_reactions WHERE id = ?').run(existing.id);
      } else {
        db.prepare('UPDATE message_reactions SET emoji = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?').run(emoji, existing.id);
      }
    } else {
      db.prepare('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)').run(messageId, req.user.id, emoji);
    }

    const counts = db.prepare('SELECT emoji, COUNT(*) as count FROM message_reactions WHERE message_id = ? GROUP BY emoji').all(messageId);
    const users = db.prepare('SELECT mr.user_id AS userId, u.username, mr.emoji FROM message_reactions mr JOIN users u ON u.id = mr.user_id WHERE mr.message_id = ?').all(messageId);

    // Broadcast update via socket if available
    if (_io) {
      _io.to(`forum:${message.forum_id}`).emit('message_reactions_updated', {
        messageId,
        reactions: counts.map(r => ({ emoji: r.emoji, count: r.count })),
        users: users.map(u => ({ userId: u.userId, username: u.username, emoji: u.emoji })),
      });
    }

    return res.json({ messageId, reactions: counts.map(r => ({ emoji: r.emoji, count: r.count })), users: users.map(u => ({ userId: u.userId, username: u.username, emoji: u.emoji })) });
  } catch (err) {
    console.error('POST /:messageId/reactions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
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

    // Broadcast via socket to all members in the forum room
    if (_io) {
      _io.to(`forum:${forumId}`).emit('new_message', message);

      // Update forum preview for all members
      const latest = db.prepare(`
        SELECT m.id, m.content, m.file_name, m.file_type, m.created_at,
               u.id AS user_id, u.username, u.role
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.forum_id = ?
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      `).get(forumId);

      _io.to(`forum:${forumId}`).emit('forum_preview_updated', {
        id: forumId,
        forum_id: forumId,
        last_message: latest?.content || '',
        last_file_name: latest?.file_name || null,
        last_file_type: latest?.file_type || null,
        last_activity: latest?.created_at || null,
        last_sender_id: latest?.user_id || null,
        last_sender_username: latest?.username || null,
        last_sender_role: latest?.role || null,
      });
    }

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
module.exports.setIo = setIo;
