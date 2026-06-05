require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { initDatabase, db } = require('./database');
const authRoutes = require('./routes/auth');
const forumRoutes = require('./routes/forums');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const pushRoutes = require('./routes/push');
const { sendPushToUser } = require('./routes/push');
const { startReminderWorker } = require('./reminder_worker');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'webchat-super-secret-key-2026';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Pass io to routes that need it
messageRoutes.setIo(io);

// Helper function to detect mentions (@username or @"full name") in message content
function extractMentions(content) {
  if (!content) return [];
  
  // Match two patterns:
  // 1. @"full name with spaces" (quoted)
  // 2. @username_without_spaces
  const mentionRegex = /@"([^"]+)"|@(\S+)/g;
  const matches = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    // match[1] = quoted name, match[2] = unquoted name
    const mentionedName = match[1] || match[2];
    if (mentionedName && !matches.includes(mentionedName)) {
      matches.push(mentionedName);
    }
  }
  
  console.log(`[MENTION] Extracted mentions from "${content}": ${JSON.stringify(matches)}`);
  return matches;
}

// Helper function to send push notifications to mentioned users
async function sendMentionNotifications(messageContent, forumId, senderUsername, senderId) {
  const mentionedUsernames = extractMentions(messageContent);
  console.log(`[PUSH] sendMentionNotifications called - Mentioned: ${JSON.stringify(mentionedUsernames)}, Sender: ${senderUsername}`);
  if (mentionedUsernames.length === 0) {
    console.log('[PUSH] No mentions found, skipping push notifications');
    return;
  }

  const forumName = db.prepare('SELECT title FROM forums WHERE id = ?').get(forumId)?.title || 'a forum';
  console.log(`[PUSH] Forum: ${forumName}`);

  for (const username of mentionedUsernames) {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    console.log(`[PUSH] Looking for user: ${username} - Found: ${user ? `ID=${user.id}` : 'NOT FOUND'}`);
    if (!user || user.id === senderId) {
      console.log(`[PUSH] Skipping user ${username} (not found or is sender)`);
      continue;
    }

    console.log(`[PUSH] Sending push to user ${username} (ID: ${user.id})`);
    const payload = {
      title: `Mentioned by ${senderUsername}`,
      body: `You were mentioned in ${forumName}`,
      icon: '/webcare-logo.webp',
      badge: '/webcare-logo.webp',
      tag: `mention-${messageContent.substring(0, 50)}`,
      data: {
        url: `${FRONTEND_URL}/chat?forumId=${forumId}`,
        type: 'mention',
        forumId
      }
    };

    try {
      await sendPushToUser(user.id, payload);
      console.log(`[PUSH] Successfully sent push to user ${username}`);
    } catch (err) {
      console.error(`[PUSH] Failed to send push to user ${username}:`, err);
    }
  }
}

// Helper function to send push notifications to all forum members about new message
async function sendForumNotifications(messageContent, forumId, senderUsername, senderId) {
  console.log(`[FORUM-PUSH] sendForumNotifications called - Forum: ${forumId}, Sender: ${senderUsername}`);
  
  // Get forum name
  const forum = db.prepare('SELECT title FROM forums WHERE id = ?').get(forumId);
  if (!forum) {
    console.log('[FORUM-PUSH] Forum not found');
    return;
  }

  // Get all forum members except sender
  const forumMembers = db.prepare(`
    SELECT DISTINCT fm.user_id 
    FROM forum_members fm 
    WHERE fm.forum_id = ? AND fm.user_id != ?
  `).all(forumId, senderId);

  console.log(`[FORUM-PUSH] Forum "${forum.title}" has ${forumMembers.length} members to notify (excluding sender)`);

  // Truncate message for notification body
  const messagePreview = messageContent.length > 100 
    ? messageContent.substring(0, 97) + '...' 
    : messageContent;

  // Send push to each member
  for (const member of forumMembers) {
    console.log(`[FORUM-PUSH] Sending notification to user ID ${member.user_id}`);
    const payload = {
      title: `${senderUsername} posted in ${forum.title}`,
      body: messagePreview,
        icon: '/webcare-logo.webp',
        badge: '/webcare-logo.webp',
      tag: `forum-${forumId}-${Date.now()}`,
      data: {
        url: `${FRONTEND_URL}/chat?forumId=${forumId}`,
        type: 'forum-message',
        forumId
      }
    };

    try {
      await sendPushToUser(member.user_id, payload);
      console.log(`[FORUM-PUSH] Successfully sent push to user ${member.user_id}`);
    } catch (err) {
      console.error(`[FORUM-PUSH] Failed to send push to user ${member.user_id}:`, err.message);
    }
  }
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Init DB (creates tables + seeds admin)
initDatabase();

// HTTP Routes
app.get('/api', (req, res) => res.json({ message: 'Welcome to WebChat API' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', uptime: process.uptime() }));
app.use('/api/auth', authRoutes);
app.use('/api/forums', forumRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/push', pushRoutes);

// Socket.io — authenticate via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // capture optional device info from client handshake
  socket.handshake.auth.deviceId = socket.handshake.auth.deviceId || socket.handshake.query?.deviceId || null;
  socket.handshake.auth.deviceLabel = socket.handshake.auth.deviceLabel || socket.handshake.query?.deviceLabel || null;
  if (!token) return next(new Error('Unauthorized'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    // expose device info to socket instance for later use
    socket.data = socket.data || {};
    socket.data.deviceId = socket.handshake.auth.deviceId || null;
    socket.data.deviceLabel = socket.handshake.auth.deviceLabel || null;
    next();
  } catch {
    next(new Error('Token tidak valid.'));
  }
});

io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.user.username} (${socket.id})`);

  // Upsert device presence on connect
  try {
    const deviceId = socket.data?.deviceId || null;
    const deviceLabel = socket.data?.deviceLabel || null;
    if (deviceId) {
      db.prepare(`
        INSERT INTO presence_devices (device_id, user_id, label, is_online, last_seen)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(device_id) DO UPDATE SET
          user_id=excluded.user_id,
          label=excluded.label,
          is_online=1,
          last_seen=CURRENT_TIMESTAMP
      `).run(deviceId, socket.user.id, deviceLabel);
    }

    // Broadcast presence update to all forums the user is member of and globally
    const isOnline = 1;
    const lastSeen = db.prepare('SELECT last_seen FROM users WHERE id = ?').get(socket.user.id)?.last_seen || null;
    const lastClosed = db.prepare('SELECT label FROM presence_devices WHERE user_id = ? AND last_closed_at IS NOT NULL ORDER BY last_closed_at DESC LIMIT 1').get(socket.user.id);
    const payload = { user_id: socket.user.id, is_online: !!isOnline, last_seen: lastSeen, last_closed_device_label: lastClosed?.label || null };
    const forums = db.prepare('SELECT forum_id FROM forum_members WHERE user_id = ?').all(socket.user.id);
    forums.forEach(f => io.to(`forum:${f.forum_id}`).emit('presence_update', payload));
    io.emit('presence_update', payload);
  } catch (err) {
    console.error('Presence upsert error:', err);
  }

  const canAccessForum = (forumId) => {
    if (socket.user.role === 'admin') return true;
    const membership = db.prepare(
      'SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?'
    ).get(forumId, socket.user.id);
    return !!membership;
  };

  const emitForumPreview = (forumId) => {
    const latest = db.prepare(`
      SELECT m.id, m.content, m.file_name, m.file_type, m.created_at,
             u.id AS user_id, u.username, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.forum_id = ?
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    `).get(forumId);

    io.to(`forum:${forumId}`).emit('forum_preview_updated', {
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
  };

  // Join a forum room (verify membership first)
  socket.on('join_forum', (forumId) => {
    const fid = parseInt(forumId);
    const allowed = canAccessForum(fid);
    if (allowed) {
      socket.join(`forum:${fid}`);
    }
  });

  // Leave a forum room
  socket.on('leave_forum', (forumId) => {
    socket.leave(`forum:${parseInt(forumId)}`);
  });

  // Send a message
  socket.on('send_message', ({ forumId, content, replyToId, eventData }) => {
    require('fs').appendFileSync('socket_debug.log', JSON.stringify({ event: 'send_message', forumId, content, replyToId, eventData }) + '\n');
    console.log('[DEBUG] send_message received:', { forumId, content, replyToId, eventData });
    const fid = parseInt(forumId);
    const replyId = replyToId ? parseInt(replyToId) : null;
    
    // Allow empty content if it's an event
    if (!content?.trim() && !eventData) {
      console.log('[DEBUG] send_message returned early: no content and no eventData');
      return;
    }

    // Verify membership
    const allowed = canAccessForum(fid);
    if (!allowed) {
      console.log('[DEBUG] send_message returned early: not allowed for user', socket.user.id, 'in forum', fid);
      return;
    }

    // Persist to DB
    let safeReplyId = null;
    let replySnapshot = null;
    if (!Number.isNaN(replyId) && replyId) {
      const repliedMessage = db.prepare(
        `SELECT m.id, m.content, m.file_name, m.file_url, m.file_type, u.username
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.id = ? AND m.forum_id = ?`
      ).get(replyId, fid);
      if (repliedMessage) {
        safeReplyId = replyId;
        replySnapshot = repliedMessage;
      }
    }

    const isEvent = eventData ? 1 : 0;
    const eventName = eventData?.name || null;
    const eventDescription = eventData?.description || null;
    const eventStartAt = eventData?.start_at || null;
    const eventEndAt = eventData?.end_at || null;
    const eventLocation = eventData?.location || null;
    const eventCallLink = eventData?.call_link || null;

    try {
      const result = db.prepare(
        `INSERT INTO messages (
          forum_id, user_id, content, reply_to_id,
          reply_preview_username, reply_preview_content, reply_preview_file_name, reply_preview_file_url, reply_preview_file_type,
          is_event, event_name, event_description, event_start_at, event_end_at, event_location, event_call_link
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        fid,
        socket.user.id,
        content?.trim() || '',
        safeReplyId,
        replySnapshot?.username || null,
        replySnapshot?.content || null,
        replySnapshot?.file_name || null,
        replySnapshot?.file_url || null,
        replySnapshot?.file_type || null,
        isEvent,
        eventName,
        eventDescription,
        eventStartAt,
        eventEndAt,
        eventLocation,
        eventCallLink
      );

      // If this message is an event and contains reminder definitions from the client,
      // persist reminders into `reminders` table. `eventData.reminders` expected shape:
      // [{ method: 'push', offset_minutes: 15 }, ...]
      try {
        if (isEvent && Array.isArray(eventData?.reminders) && result?.lastInsertRowid) {
          const mid = result.lastInsertRowid;
          // Get all forum members except sender
          const members = db.prepare('SELECT DISTINCT user_id FROM forum_members WHERE forum_id = ? AND user_id != ?').all(fid, socket.user.id);
          for (const rem of eventData.reminders) {
            const method = rem.method || 'push';
            const offset = parseInt(rem.offset_minutes ?? rem.offset ?? 0, 10) || 0;
            // calculate remind_at as event_start_at minus offset minutes
            let remindAt = null;
            if (eventStartAt) {
              try {
                const startDate = new Date(eventStartAt);
                remindAt = new Date(startDate.getTime() - (offset * 60 * 1000)).toISOString();
              } catch (e) {
                remindAt = null;
              }
            }
            if (!remindAt) remindAt = new Date().toISOString();

            // Insert reminder for each member
            for (const m of members) {
              try {
                db.prepare(`INSERT INTO reminders (message_id, user_id, method, offset_minutes, remind_at) VALUES (?, ?, ?, ?, ?)`)
                  .run(mid, m.user_id, method, offset, remindAt);
              } catch (e) {
                console.error('[REMINDER] Failed to insert reminder for user', m.user_id, e && e.message ? e.message : e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to persist reminders for event:', err);
      }

      const message = db.prepare(`
        SELECT m.id, m.forum_id, m.user_id, m.content, m.file_url, m.file_name, m.file_type,
               m.is_pinned, m.reply_to_id, m.edited_at, m.created_at,
               m.is_event, m.event_name, m.event_description, m.event_start_at, m.event_end_at, m.event_location, m.event_call_link,
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
      `).get(result.lastInsertRowid);

      // Broadcast to everyone in the room (including sender)
      io.to(`forum:${fid}`).emit('new_message', message);
      emitForumPreview(fid);

      // Send push notifications to mentioned users
      if (content) {
        sendMentionNotifications(content, fid, socket.user.username, socket.user.id).catch(err =>
          console.error('Error sending mention notifications:', err)
        );
      }

      // Send push notifications to all forum members about new message
      if (content) {
        sendForumNotifications(content, fid, socket.user.username, socket.user.id).catch(err =>
          console.error('Error sending forum notifications:', err)
        );
      }
    } catch (err) {
      console.error('Socket send_message error:', err);
      require('fs').appendFileSync('socket_error.log', err.toString() + '\n');
    }
  });

  // Edit message (admin or message owner)
  socket.on('edit_message', ({ messageId, forumId, content }) => {
    const mid = parseInt(messageId, 10);
    const fid = parseInt(forumId, 10);
    const nextContent = String(content || '').trim();
    if (Number.isNaN(mid) || Number.isNaN(fid) || !nextContent) return;

    if (!canAccessForum(fid)) return;

    const existing = db.prepare(
      'SELECT id, forum_id, user_id FROM messages WHERE id = ? AND forum_id = ?'
    ).get(mid, fid);
    if (!existing) return;

      const canEditByRole = socket.user.role === 'admin' || existing.user_id === socket.user.id;
      if (!canEditByRole) return;

      // Enforce 15-minute edit window for non-admins
      if (socket.user.role !== 'admin') {
        const row = db.prepare('SELECT created_at FROM messages WHERE id = ?').get(mid);
        if (row && row.created_at) {
          const created = new Date(row.created_at).getTime();
          const now = Date.now();
          const FIFTEEN_MIN = 15 * 60 * 1000;
          if (now - created > FIFTEEN_MIN) {
            // Reject silently (could emit an error ack in future)
            return;
          }
        }
      }

    db.prepare('UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?').run(nextContent, mid);

    const updatedMessage = db.prepare(`
      SELECT m.id, m.forum_id, m.user_id, m.content, m.file_url, m.file_name, m.file_type,
             m.is_pinned, m.reply_to_id, m.edited_at, m.created_at,
             m.is_event, m.event_name, m.event_description, m.event_start_at, m.event_end_at, m.event_location, m.event_call_link,
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
    `).get(mid);

    io.to(`forum:${fid}`).emit('message_edited', updatedMessage);
    emitForumPreview(fid);
  });

  // Edit event fields (admin or event owner)
  socket.on('edit_event', ({ messageId, forumId, eventData }) => {
    const mid = parseInt(messageId, 10);
    const fid = parseInt(forumId, 10);
    if (Number.isNaN(mid) || Number.isNaN(fid) || !eventData) return;

    if (!canAccessForum(fid)) return;

    const existing = db.prepare(
      'SELECT id, forum_id, user_id, is_event FROM messages WHERE id = ? AND forum_id = ?'
    ).get(mid, fid);
    if (!existing || !existing.is_event) return;

    const canEdit = socket.user.role === 'admin' || existing.user_id === socket.user.id;
    if (!canEdit) return;

    const eventName = eventData?.name || null;
    const eventDescription = eventData?.description || null;
    const eventStartAt = eventData?.start_at || null;
    const eventEndAt = eventData?.end_at || null;
    const eventLocation = eventData?.location || null;
    const eventCallLink = eventData?.call_link || null;

    db.prepare(`
      UPDATE messages SET
        event_name = ?,
        event_description = ?,
        event_start_at = ?,
        event_end_at = ?,
        event_location = ?,
        event_call_link = ?,
        edited_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(eventName, eventDescription, eventStartAt, eventEndAt, eventLocation, eventCallLink, mid);

    const updatedMessage = db.prepare(`
      SELECT m.id, m.forum_id, m.user_id, m.content, m.file_url, m.file_name, m.file_type,
             m.is_pinned, m.reply_to_id, m.edited_at, m.created_at,
             m.is_event, m.event_name, m.event_description, m.event_start_at, m.event_end_at, m.event_location, m.event_call_link,
             u.username, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `).get(mid);

    io.to(`forum:${fid}`).emit('event_updated', updatedMessage);
  });


  // Toggle pin for a message (admin only)
  socket.on('pin_message', ({ messageId, forumId }) => {
    if (socket.user.role !== 'admin') return;

    const mid = parseInt(messageId);
    const fid = parseInt(forumId);
    if (isNaN(mid) || isNaN(fid)) return;

    if (!canAccessForum(fid)) return;

    const existing = db.prepare(
      'SELECT id, is_pinned FROM messages WHERE id = ? AND forum_id = ?'
    ).get(mid, fid);
    if (!existing) return;

    const isPinned = existing.is_pinned ? 0 : 1;
    db.prepare('UPDATE messages SET is_pinned = ? WHERE id = ?').run(isPinned, mid);

    io.to(`forum:${fid}`).emit('message_pinned', {
      messageId: mid,
      is_pinned: !!isPinned,
    });
  });

  // Delete message (admin or message owner)
  socket.on('delete_message', ({ messageId, forumId }) => {
    const mid = parseInt(messageId);
    const fid = parseInt(forumId);
    if (isNaN(mid) || isNaN(fid)) return;

    if (!canAccessForum(fid)) return;

    const message = db.prepare(
      'SELECT id, forum_id, user_id FROM messages WHERE id = ? AND forum_id = ?'
    ).get(mid, fid);

    if (!message) return;

    const canDelete = socket.user.role === 'admin' || message.user_id === socket.user.id;
    if (!canDelete) return;

    // Soft delete: mark message as deleted by admin
    if (socket.user.role === 'admin') {
      db.prepare('UPDATE messages SET is_deleted_by_admin = 1, deleted_by_admin_at = CURRENT_TIMESTAMP WHERE id = ?').run(mid);
    } else {
      // For non-admin (message owner), actually delete the message
      db.prepare('DELETE FROM messages WHERE id = ?').run(mid);
    }

    io.to(`forum:${fid}`).emit('message_deleted', { messageId: mid });
    emitForumPreview(fid);
  });

  socket.on('disconnect', () => {
    console.log(`🔴 Disconnected: ${socket.user.username}`);
    try {
      const deviceId = socket.data?.deviceId || null;
      if (deviceId) {
        db.prepare('UPDATE presence_devices SET is_online = 0, last_seen = CURRENT_TIMESTAMP, last_closed_at = CURRENT_TIMESTAMP WHERE device_id = ?')
          .run(deviceId);
      }
      // update user's last_seen
      db.prepare('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(socket.user.id);

      const lastClosed = db.prepare('SELECT label FROM presence_devices WHERE user_id = ? AND last_closed_at IS NOT NULL ORDER BY last_closed_at DESC LIMIT 1').get(socket.user.id);
      const lastSeen = db.prepare('SELECT last_seen FROM users WHERE id = ?').get(socket.user.id)?.last_seen || null;
      const payload = { user_id: socket.user.id, is_online: false, last_seen: lastSeen, last_closed_device_label: lastClosed?.label || null };
      const forums = db.prepare('SELECT forum_id FROM forum_members WHERE user_id = ?').all(socket.user.id);
      forums.forEach(f => io.to(`forum:${f.forum_id}`).emit('presence_update', payload));
      io.emit('presence_update', payload);
    } catch (err) {
      console.error('Presence disconnect error:', err);
    }
  });
});

// Serve Frontend in Production
const frontendDistPath = path.join(__dirname, 'dist');
app.use(express.static(frontendDistPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Start reminder worker (checks reminders every minute)
try {
  startReminderWorker(db, sendPushToUser, io);
  console.log('[REMINDER] Worker started');
} catch (err) {
  console.error('[REMINDER] Failed to start worker:', err && err.message ? err.message : err);
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
