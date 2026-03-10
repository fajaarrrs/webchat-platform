const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'webchat-super-secret-key-2026';

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Hanya admin yang dapat melakukan aksi ini.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
