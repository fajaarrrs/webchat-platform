require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { initDatabase, db } = require('./database');
const { emitForumPreviewUpdates, markActiveViewersAsRead, markForumAsRead } = require('./forumState');
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forums');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'webchat-super-secret-key-2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.io setup
const io = new Server(server, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

// Middleware
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('io', io);

// Init DB (creates tables + seeds admin)
initDatabase();

// HTTP Routes
app.get('/', (req, res) => res.json({ message: 'Welcome to WebChat API' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', uptime: process.uptime() }));
app.use('/api/auth', authRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Socket.io — authenticate via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Token tidak valid.'));
  }
});

io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.user.username} (${socket.id})`);
  socket.join(`user:${socket.user.id}`);

  // Join a forum room (verify membership first)
  socket.on('join_forum', (forumId) => {
    const fid = parseInt(forumId);
    const allowed =
      socket.user.role === 'admin' ||
      db.prepare('SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?')
        .get(fid, socket.user.id);
    if (allowed) {
      socket.join(`forum:${fid}`);
      markForumAsRead(fid, socket.user.id);
      emitForumPreviewUpdates(io, fid);
    }
  });

  // Leave a forum room
  socket.on('leave_forum', (forumId) => {
    socket.leave(`forum:${parseInt(forumId)}`);
  });

  // Send a message
  socket.on('send_message', ({ forumId, content, replyToId }) => {
    const fid = parseInt(forumId);
    if (!content?.trim()) return;

    // Verify membership
    const allowed =
      socket.user.role === 'admin' ||
      db.prepare('SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?')
        .get(fid, socket.user.id);
    if (!allowed) return;

    // Persist to DB
    const replyId = replyToId ? parseInt(replyToId) : null;
    const result = db.prepare(
      'INSERT INTO messages (forum_id, user_id, content, reply_to_id) VALUES (?, ?, ?, ?)'
    ).run(fid, socket.user.id, content.trim(), replyId);

    const message = db.prepare(`
      SELECT m.id, m.forum_id, m.content, m.created_at, m.is_pinned, m.reply_to_id,
             m.file_url, m.file_name, m.file_size, m.file_type,
             u.id as user_id, u.username, u.role,
             rm.content as reply_content, ru.username as reply_username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN messages rm ON m.reply_to_id = rm.id
      LEFT JOIN users ru ON rm.user_id = ru.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    // Broadcast to everyone in the room (including sender)
    markActiveViewersAsRead(io, fid);
    io.to(`forum:${fid}`).emit('new_message', message);
    emitForumPreviewUpdates(io, fid);
  });

  // Delete a message
  socket.on('delete_message', ({ messageId, forumId }) => {
    const mid = parseInt(messageId);
    const fid = parseInt(forumId);
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(mid);
    if (!msg || msg.forum_id !== fid) return;

    // Only owner or admin can delete
    if (socket.user.role !== 'admin' && msg.user_id !== socket.user.id) return;

    try {
      const deleteMessageSafely = db.transaction((targetMsgId) => {
        db.prepare('UPDATE messages SET reply_to_id = NULL WHERE reply_to_id = ?').run(targetMsgId);
        db.prepare('UPDATE forum_reads SET last_read_message_id = NULL WHERE last_read_message_id = ?').run(targetMsgId);
        db.prepare('DELETE FROM messages WHERE id = ?').run(targetMsgId);
      });
      deleteMessageSafely(mid);
    } catch (error) {
      console.error('Socket delete message failed:', error);
      return;
    }
    io.to(`forum:${fid}`).emit('message_deleted', { messageId: mid, forumId: fid });
    emitForumPreviewUpdates(io, fid);
  });

  // Pin / unpin a message (admin only)
  socket.on('pin_message', ({ messageId, forumId }) => {
    if (socket.user.role !== 'admin') return;
    const mid = parseInt(messageId);
    const fid = parseInt(forumId);
    const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(mid);
    if (!msg || msg.forum_id !== fid) return;

    const newPinState = msg.is_pinned ? 0 : 1;
    db.prepare('UPDATE messages SET is_pinned = ? WHERE id = ?').run(newPinState, mid);
    io.to(`forum:${fid}`).emit('message_pinned', { messageId: mid, forumId: fid, is_pinned: newPinState });
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Disconnected: ${socket.user.username}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
