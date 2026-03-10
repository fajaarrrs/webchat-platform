require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { initDatabase, db } = require('./database');
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

  // Join a forum room (verify membership first)
  socket.on('join_forum', (forumId) => {
    const fid = parseInt(forumId);
    const allowed =
      socket.user.role === 'admin' ||
      db.prepare('SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?')
        .get(fid, socket.user.id);
    if (allowed) {
      socket.join(`forum:${fid}`);
    }
  });

  // Leave a forum room
  socket.on('leave_forum', (forumId) => {
    socket.leave(`forum:${parseInt(forumId)}`);
  });

  // Send a message
  socket.on('send_message', ({ forumId, content }) => {
    const fid = parseInt(forumId);
    if (!content?.trim()) return;

    // Verify membership
    const allowed =
      socket.user.role === 'admin' ||
      db.prepare('SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?')
        .get(fid, socket.user.id);
    if (!allowed) return;

    // Persist to DB
    const result = db.prepare(
      'INSERT INTO messages (forum_id, user_id, content) VALUES (?, ?, ?)'
    ).run(fid, socket.user.id, content.trim());

    const message = db.prepare(`
      SELECT m.id, m.content, m.created_at,
             u.id as user_id, u.username, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    // Broadcast to everyone in the room (including sender)
    io.to(`forum:${fid}`).emit('new_message', message);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Disconnected: ${socket.user.username}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
