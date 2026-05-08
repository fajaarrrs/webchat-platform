require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { initDatabase, db } = require("./database");
const { addSocket, removeSocket, isOnline, getSockets } = require("./presence");
const authRoutes = require("./routes/auth");
const forumRoutes = require("./routes/forums");
const messageRoutes = require("./routes/messages");
const userRoutes = require("./routes/users");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "webchat-super-secret-key-2026";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Socket.io setup
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Emit list of forum members (includes last_online_at from DB and role)
function emitForumUsers(forumId) {
  const rows = db
    .prepare(
      `
    SELECT u.id, u.username, u.last_online_at, u.role
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
  `,
    )
    .all(forumId);

  const payload = rows.map((r) => ({
    id: r.id,
    username: r.username,
    last_online_at: r.last_online_at,
    role: r.role,
    online: !!isOnline(r.id),
  }));
  console.log(
    "📤 Emitting forum users for forum",
    forumId,
    ":",
    JSON.stringify(payload, null, 2),
  );
  io.to(`forum:${forumId}`).emit("presence:forum_users", {
    forumId,
    online: payload,
  });
}

// Pass io to routes that need it
messageRoutes.setIo(io);

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Init DB (creates tables + seeds admin)
initDatabase();

// HTTP Routes
app.get("/api", (req, res) => res.json({ message: "Welcome to WebChat API" }));
app.get("/health", (req, res) =>
  res.status(200).json({ status: "OK", uptime: process.uptime() }),
);
app.use("/api/auth", authRoutes);
app.use("/api/forums", forumRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Socket.io — authenticate via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Unauthorized"));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error("Token tidak valid."));
  }
});

io.on("connection", (socket) => {
  console.log(`🟢 Connected: ${socket.user.username} (${socket.id})`);

  // Track socket in presence store. When the user transitions from
  // offline -> online, broadcast presence to relevant forum rooms.
  try {
    const becameOnline = addSocket(socket.user.id, socket.id);
    if (becameOnline) {
      const forumRows = db
        .prepare("SELECT forum_id FROM forum_members WHERE user_id = ?")
        .all(socket.user.id);
      forumRows.forEach((r) => {
        io.to(`forum:${r.forum_id}`).emit("presence:user_online", {
          id: socket.user.id,
          username: socket.user.username,
        });
      });
      io.emit("presence:user_online", {
        id: socket.user.id,
        username: socket.user.username,
      });
    }
    const connCount = getSockets(socket.user.id).size;
    console.log(`[presence] ${socket.user.username} connections: ${connCount}`);
  } catch (err) {
    console.error("Presence addSocket error", err);
  }

  const canAccessForum = (forumId) => {
    if (socket.user.role === "admin") return true;
    const membership = db
      .prepare("SELECT 1 FROM forum_members WHERE forum_id = ? AND user_id = ?")
      .get(forumId, socket.user.id);
    return !!membership;
  };

  const emitForumPreview = (forumId) => {
    const latest = db
      .prepare(
        `
      SELECT m.id, m.content, m.file_name, m.file_type, m.created_at,
             u.id AS user_id, u.username, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.forum_id = ?
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT 1
    `,
      )
      .get(forumId);

    io.to(`forum:${forumId}`).emit("forum_preview_updated", {
      id: forumId,
      forum_id: forumId,
      last_message: latest?.content || "",
      last_file_name: latest?.file_name || null,
      last_file_type: latest?.file_type || null,
      last_activity: latest?.created_at || null,
      last_sender_id: latest?.user_id || null,
      last_sender_username: latest?.username || null,
      last_sender_role: latest?.role || null,
    });
  };

  // Join a forum room (verify membership first)
  socket.on("join_forum", (forumId) => {
    const fid = parseInt(forumId);
    const allowed = canAccessForum(fid);
    if (allowed) {
      socket.join(`forum:${fid}`);
      // emit current presence snapshot to forum members
      try {
        emitForumUsers(fid);
      } catch (e) {
        console.error("emitForumUsers error", e);
      }
    }
  });

  // Leave a forum room
  socket.on("leave_forum", (forumId) => {
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
      const repliedMessage = db
        .prepare(
          `SELECT m.id, m.content, m.file_name, m.file_url, m.file_type, u.username
         FROM messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.id = ? AND m.forum_id = ?`,
        )
        .get(replyId, fid);
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
    } catch (err) {
      console.error('Socket send_message error:', err);
      require('fs').appendFileSync('socket_error.log', err.toString() + '\n');
    }
  });

  // Edit message (admin or message owner)
  socket.on("edit_message", ({ messageId, forumId, content }) => {
    const mid = parseInt(messageId, 10);
    const fid = parseInt(forumId, 10);
    const nextContent = String(content || "").trim();
    if (Number.isNaN(mid) || Number.isNaN(fid) || !nextContent) return;

    if (!canAccessForum(fid)) return;

    const existing = db
      .prepare(
        "SELECT id, forum_id, user_id FROM messages WHERE id = ? AND forum_id = ?",
      )
      .get(mid, fid);
    if (!existing) return;

    const canEdit =
      socket.user.role === "admin" || existing.user_id === socket.user.id;
    if (!canEdit) return;

    db.prepare(
      "UPDATE messages SET content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(nextContent, mid);

    const updatedMessage = db
      .prepare(
        `
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
    `,
      )
      .get(mid);

    io.to(`forum:${fid}`).emit("message_edited", updatedMessage);
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
  socket.on("pin_message", ({ messageId, forumId }) => {
    if (socket.user.role !== "admin") return;

    const mid = parseInt(messageId);
    const fid = parseInt(forumId);
    if (isNaN(mid) || isNaN(fid)) return;

    if (!canAccessForum(fid)) return;

    const existing = db
      .prepare(
        "SELECT id, is_pinned FROM messages WHERE id = ? AND forum_id = ?",
      )
      .get(mid, fid);
    if (!existing) return;

    const isPinned = existing.is_pinned ? 0 : 1;
    db.prepare("UPDATE messages SET is_pinned = ? WHERE id = ?").run(
      isPinned,
      mid,
    );

    io.to(`forum:${fid}`).emit("message_pinned", {
      messageId: mid,
      is_pinned: !!isPinned,
    });
  });

  // Delete message (admin or message owner)
  socket.on("delete_message", ({ messageId, forumId }) => {
    const mid = parseInt(messageId);
    const fid = parseInt(forumId);
    if (isNaN(mid) || isNaN(fid)) return;

    if (!canAccessForum(fid)) return;

    const message = db
      .prepare(
        "SELECT id, forum_id, user_id FROM messages WHERE id = ? AND forum_id = ?",
      )
      .get(mid, fid);

    if (!message) return;

    const canDelete =
      socket.user.role === "admin" || message.user_id === socket.user.id;
    if (!canDelete) return;

    db.prepare("DELETE FROM messages WHERE id = ?").run(mid);

    io.to(`forum:${fid}`).emit("message_deleted", { messageId: mid });
    emitForumPreview(fid);
  });

  socket.on("disconnect", () => {
    try {
      const becameOffline = removeSocket(socket.user.id, socket.id);
      if (becameOffline) {
        // update last seen in DB
        db.prepare(
          "UPDATE users SET last_online_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).run(socket.user.id);

        const forumRows = db
          .prepare("SELECT forum_id FROM forum_members WHERE user_id = ?")
          .all(socket.user.id);
        forumRows.forEach((r) => {
          io.to(`forum:${r.forum_id}`).emit("presence:user_offline", {
            id: socket.user.id,
          });
        });
        io.emit("presence:user_offline", { id: socket.user.id });
      }
    } catch (err) {
      console.error("Presence removeSocket error", err);
    }
    console.log(`🔴 Disconnected: ${socket.user.username}`);
  });
});

// Serve Frontend in Production
const frontendDistPath = path.join(__dirname, "dist");
app.use(express.static(frontendDistPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
