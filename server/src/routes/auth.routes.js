const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const rateLimitLogin = require('../middleware/rateLimit');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Rate limited to 10 attempts per 15 min per IP
 */
router.post('/login', rateLimitLogin, async (req, res) => {
  const { identifier, password } = req.body || {};

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier (email or phone) and password are required' });
  }

  try {
    const result = await db.query(
      `SELECT id, name, email, phone, password_hash, role
       FROM users
       WHERE email = $1 OR phone = $1
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: Number(user.id),
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('[auth/login] Error logging in:', err.message);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * GET /api/me
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    id: Number(req.user.id),
    name: req.user.name,
    role: req.user.role
  });
});

module.exports = router;
