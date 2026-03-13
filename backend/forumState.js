const { db } = require('./database');

const LATEST_MESSAGE_SQL = `
  SELECT m.id, m.forum_id, m.content, m.created_at, m.file_name, m.file_type,
         u.id as user_id, u.username, u.role
  FROM messages m
  JOIN users u ON u.id = m.user_id
  WHERE m.forum_id = ?
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1
`;

function getLatestMessageForForum(forumId) {
  return db.prepare(LATEST_MESSAGE_SQL).get(forumId) || null;
}

function getUnreadCount(forumId, userId) {
  const row = db.prepare(`
    SELECT COUNT(*) as unread_count
    FROM messages m
    LEFT JOIN forum_reads fr ON fr.forum_id = m.forum_id AND fr.user_id = ?
    WHERE m.forum_id = ?
      AND m.user_id != ?
      AND (
        fr.last_read_at IS NULL
        OR m.created_at > fr.last_read_at
        OR (m.created_at = fr.last_read_at AND m.id > COALESCE(fr.last_read_message_id, 0))
      )
  `).get(userId, forumId, userId);

  return row?.unread_count || 0;
}

function markForumAsRead(forumId, userId) {
  const latest = getLatestMessageForForum(forumId);

  db.prepare(`
    INSERT INTO forum_reads (forum_id, user_id, last_read_at, last_read_message_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(forum_id, user_id) DO UPDATE SET
      last_read_at = excluded.last_read_at,
      last_read_message_id = excluded.last_read_message_id
  `).run(forumId, userId, latest?.created_at || null, latest?.id || null);

  return latest;
}

function getForumPreviewForUser(forumId, userId) {
  const latest = getLatestMessageForForum(forumId);

  return {
    id: forumId,
    forum_id: forumId,
    last_message: latest?.content || '',
    last_file_name: latest?.file_name || null,
    last_file_type: latest?.file_type || null,
    last_activity: latest?.created_at || null,
    last_sender_id: latest?.user_id || null,
    last_sender_username: latest?.username || null,
    last_sender_role: latest?.role || null,
    unread_count: getUnreadCount(forumId, userId),
  };
}

function getActiveViewerUserIds(io, forumId) {
  const room = io?.sockets?.adapter?.rooms?.get(`forum:${parseInt(forumId, 10)}`);
  if (!room) return [];

  const userIds = new Set();
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket?.user?.id) userIds.add(socket.user.id);
  }

  return [...userIds];
}

function markActiveViewersAsRead(io, forumId) {
  getActiveViewerUserIds(io, forumId).forEach((userId) => {
    markForumAsRead(forumId, userId);
  });
}

function emitForumPreviewUpdates(io, forumId) {
  const memberRows = db.prepare('SELECT user_id FROM forum_members WHERE forum_id = ?').all(forumId);
  const recipientIds = new Set(memberRows.map((row) => row.user_id));

  getActiveViewerUserIds(io, forumId).forEach((userId) => recipientIds.add(userId));

  recipientIds.forEach((userId) => {
    io.to(`user:${userId}`).emit('forum_preview_updated', getForumPreviewForUser(forumId, userId));
  });
}

module.exports = {
  emitForumPreviewUpdates,
  markActiveViewersAsRead,
  markForumAsRead,
};