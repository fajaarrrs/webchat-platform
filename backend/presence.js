// Simple in-memory presence store for single-instance deployments.
// Exports helpers to add/remove sockets and inspect online state.
const onlineUsers = new Map(); // userId -> Set(socketId)

function addSocket(userId, socketId) {
  const uid = Number(userId);
  if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set());
  const set = onlineUsers.get(uid);
  const wasOnline = set.size > 0;
  set.add(socketId);
  return !wasOnline; // true if user just became online
}

function removeSocket(userId, socketId) {
  const uid = Number(userId);
  const set = onlineUsers.get(uid);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(uid);
    return true; // true if user just became offline
  }
  return false;
}

function isOnline(userId) {
  const uid = Number(userId);
  const set = onlineUsers.get(uid);
  return !!set && set.size > 0;
}

function getSockets(userId) {
  const uid = Number(userId);
  return onlineUsers.get(uid) || new Set();
}

function getAllOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

module.exports = { onlineUsers, addSocket, removeSocket, isOnline, getSockets, getAllOnlineUserIds };
