const express = require("express");
const bcrypt = require("bcryptjs");
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { db } = require("../database");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

let _io = null;
function setIo(io) {
  _io = io;
}
module.exports.setIo = setIo;

// Ensure upload dir exists
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    cb(null, `avatar_user_${req.user ? req.user.id : 'anon'}_${Date.now()}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/users — list all users (admin only)
router.get("/", authenticate, requireAdmin, (req, res) => {
  const users = db
    .prepare(
      "SELECT id, username, email, role, avatar_url AS avatar, created_at FROM users ORDER BY created_at ASC",
    )
    .all();
  res.json(users);
});

// PUT /api/users/me — update own profile
router.put("/me", authenticate, (req, res) => {
  const { username, email, newPassword } = req.body;
  const userId = req.user.id;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan." });

  if (username && username !== user.username) {
    const taken = db
      .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .get(username, userId);
    if (taken)
      return res.status(409).json({ error: "Username sudah digunakan." });
  }
  if (email && email !== user.email) {
    const taken = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, userId);
    if (taken) return res.status(409).json({ error: "Email sudah digunakan." });
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password baru minimal 6 karakter." });
    }

    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      bcrypt.hashSync(newPassword, 10),
      userId,
    );
  }

  db.prepare("UPDATE users SET username = ?, email = ? WHERE id = ?").run(
    username || user.username,
    email || user.email,
    userId,
  );

  const updated = db
    .prepare("SELECT id, username, email, role, avatar_url AS avatar FROM users WHERE id = ?")
    .get(userId);
  try {
    if (_io) _io.emit('user_updated', updated);
  } catch (err) { console.error('user update emit error:', err); }
  res.json(updated);
});

// PUT /api/users/:id — admin updates user (username, email, role)
router.put("/:id", authenticate, requireAdmin, (req, res) => {
  const { username, email, role } = req.body;
  const userId = parseInt(req.params.id);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan." });

  if (username && username !== user.username) {
    const taken = db
      .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
      .get(username, userId);
    if (taken)
      return res.status(409).json({ error: "Username sudah digunakan." });
  }
  if (email && email !== user.email) {
    const taken = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, userId);
    if (taken) return res.status(409).json({ error: "Email sudah digunakan." });
  }

  const validRoles = ["admin", "karyawan", "client"];
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: "Role tidak valid." });
  }

  db.prepare(
    "UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?",
  ).run(
    username || user.username,
    email || user.email,
    role || user.role,
    userId,
  );

  const updated = db
    .prepare(
      "SELECT id, username, email, role, avatar_url AS avatar, created_at FROM users WHERE id = ?",
    )
    .get(userId);
  try {
    if (_io) _io.emit('user_updated', updated);
  } catch (err) { console.error('user update emit error:', err); }
  res.json(updated);
});

// POST /api/users/me/avatar — upload avatar image
router.post('/me/avatar', authenticate, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File avatar tidak ditemukan.' });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);
    const updated = db.prepare('SELECT id, username, email, role, avatar_url AS avatar FROM users WHERE id = ?').get(req.user.id);
    try { if (_io) _io.emit('user_updated', updated); } catch (err) { console.error('avatar upload emit error:', err); }
    res.json(updated);
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Gagal mengunggah avatar.' });
  }
});

// DELETE /api/users/me/avatar — remove avatar
router.delete('/me/avatar', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    if (user.avatar_url) {
      // Convert to filesystem path
      const rel = user.avatar_url.replace(/^\//, ''); // e.g. uploads/avatars/...
      const filePath = path.join(__dirname, '..', rel);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }
    db.prepare('UPDATE users SET avatar_url = NULL WHERE id = ?').run(req.user.id);
    const updated = db.prepare('SELECT id, username, email, role, avatar_url AS avatar FROM users WHERE id = ?').get(req.user.id);
    try { if (_io) _io.emit('user_updated', updated); } catch (err) { console.error('avatar delete emit error:', err); }
    res.json(updated);
  } catch (err) {
    console.error('Avatar delete error:', err);
    res.status(500).json({ error: 'Gagal menghapus avatar.' });
  }
});

// DELETE /api/users/:id — admin deletes user (cannot delete another admin)
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const PRIMARY_ADMIN_EMAIL = 'admin@gmail.com';
  const PRIMARY_ADMIN_USERNAME = 'admin';

  // Cannot delete yourself
  if (userId === req.user.id) {
    return res
      .status(403)
      .json({ error: "Tidak dapat menghapus akun sendiri." });
  }

  const user = db
    .prepare("SELECT id, role, username, email FROM users WHERE id = ?")
    .get(userId);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan." });

  const isPrimaryAdmin =
    user.role === 'admin'
    && user.username === PRIMARY_ADMIN_USERNAME
    && user.email === PRIMARY_ADMIN_EMAIL;

  if (isPrimaryAdmin) {
    return res.status(403).json({ error: 'Akun admin utama tidak dapat dihapus.' });
  }

  db.prepare("DELETE FROM forum_members WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  res.json({ message: "User berhasil dihapus." });
});

module.exports = router;
