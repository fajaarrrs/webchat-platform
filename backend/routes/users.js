const express = require("express");
const bcrypt = require("bcryptjs");
const { db } = require("../database");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/users — list all users (admin only)
router.get("/", authenticate, requireAdmin, (req, res) => {
  const users = db
    .prepare(
      "SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC",
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
    .prepare("SELECT id, username, email, role FROM users WHERE id = ?")
    .get(userId);
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
      "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
    )
    .get(userId);
  res.json(updated);
});

// DELETE /api/users/:id — admin deletes user (cannot delete another admin)
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);

  // Cannot delete yourself
  if (userId === req.user.id) {
    return res
      .status(403)
      .json({ error: "Tidak dapat menghapus akun sendiri." });
  }

  const user = db
    .prepare("SELECT id, role FROM users WHERE id = ?")
    .get(userId);
  if (!user) return res.status(404).json({ error: "User tidak ditemukan." });
  if (user.role === "admin")
    return res.status(403).json({ error: "Tidak dapat menghapus akun admin." });

  db.prepare("DELETE FROM forum_members WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  res.json({ message: "User berhasil dihapus." });
});

module.exports = router;
