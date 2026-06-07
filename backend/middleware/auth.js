const jwt = require('jsonwebtoken');
const { db } = require('../database');
const JWT_SECRET = process.env.JWT_SECRET || 'webchat-super-secret-key-2026';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    // Verify user still exists in DB. If deleted, reject early so clients
    // get a clear 404 and can react (logout / show message).
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    // Attach fresh user data from DB (id, username, email, role)
    req.user = { id: user.id, username: user.username, email: user.email, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

// requireAdmin now verifies the user's role against the database instead of
// relying solely on the JWT claim. This makes role changes effective
// immediately without requiring the user to re-login.
function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang dapat melakukan aksi ini.' });
    }
    // attach fresh role to req.user for downstream handlers
    req.user.role = user.role;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
}

module.exports = { authenticate, requireAdmin };
