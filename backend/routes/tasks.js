const express = require("express");
const { db } = require("../database");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// GET /api/tasks?forumId=X
router.get("/", authenticate, (req, res) => {
  const { forumId } = req.query;
  if (!forumId) return res.status(400).json({ error: "forumId wajib diisi." });

  try {
    const tasks = db
      .prepare(
        "SELECT id, user_id, forum_id, title, description, completed, created_at, updated_at FROM tasks WHERE forum_id = ? ORDER BY created_at DESC"
      )
      .all(forumId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks
router.post("/", authenticate, (req, res) => {
  const { title, description = "", forumId } = req.body;
  const userId = req.user.id;

  if (!title || title.trim() === "") {
    return res.status(400).json({ error: "Judul task harus diisi." });
  }
  if (!forumId) {
    return res.status(400).json({ error: "forumId wajib diisi." });
  }

  try {
    const result = db
      .prepare(
        "INSERT INTO tasks (user_id, forum_id, title, description, completed) VALUES (?, ?, ?, ?, 0)"
      )
      .run(userId, forumId, title.trim(), description.trim());

    const task = db
      .prepare("SELECT id, user_id, forum_id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id
router.put("/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;

  try {
    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
    if (!task) return res.status(404).json({ error: "Task tidak ditemukan." });

    const updates = [];
    const values = [];

    if (title !== undefined && title.trim() !== "") {
      updates.push("title = ?");
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description.trim());
    }
    if (completed !== undefined) {
      updates.push("completed = ?");
      values.push(completed ? 1 : 0);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "Tidak ada data yang diubah." });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    const query = `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`;
    values.push(id);
    db.prepare(query).run(...values);

    const updatedTask = db
      .prepare("SELECT id, user_id, forum_id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?")
      .get(id);

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", authenticate, (req, res) => {
  const { id } = req.params;

  try {
    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(id);
    if (!task) return res.status(404).json({ error: "Task tidak ditemukan." });

    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    res.json({ message: "Task berhasil dihapus." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id/toggle
router.patch("/:id/toggle", authenticate, (req, res) => {
  const { id } = req.params;

  try {
    const task = db.prepare("SELECT id, completed FROM tasks WHERE id = ?").get(id);
    if (!task) return res.status(404).json({ error: "Task tidak ditemukan." });

    const newStatus = task.completed ? 0 : 1;
    db.prepare("UPDATE tasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newStatus, id);

    const updatedTask = db
      .prepare("SELECT id, user_id, forum_id, title, description, completed, created_at, updated_at FROM tasks WHERE id = ?")
      .get(id);

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;