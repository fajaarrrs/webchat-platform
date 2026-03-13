const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'webchat-super-secret-key-2026';

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  const emailExists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (emailExists) return res.status(409).json({ error: 'Email sudah terdaftar.' });

  const usernameExists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (usernameExists) return res.status(409).json({ error: 'Username sudah digunakan.' });

  // Auto-detect role from username format
  const role = username.includes('-webcare') ? 'karyawan' : 'client';
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hash, role);

  res.status(201).json({ message: 'Registrasi berhasil! Silakan login.' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar || null },
  });
});

// GET /api/auth/me — verify token & return fresh user data
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, role, avatar FROM users WHERE id = ?'
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json(user);
});

module.exports = router;
