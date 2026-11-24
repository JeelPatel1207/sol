const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const config = require('../config');
const authMiddleware = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * GET /api/users - List all users with their assigned plant IDs
 */
router.get('/', async (req, res) => {
  try {
    const usersRes = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at AS "createdAt",
             COALESCE(json_agg(pa.plant_id) FILTER (WHERE pa.plant_id IS NOT NULL), '[]') AS "plantIds"
      FROM users u
      LEFT JOIN plant_access pa ON u.id = pa.user_id
      GROUP BY u.id
      ORDER BY u.id ASC
    `);
    res.json(usersRes.rows);
  } catch (err) {
    console.error('[GET /api/users] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /api/users - Create new user
 */
router.post('/', async (req, res) => {
  const { name, email, phone, password, role } = req.body || {};
  if (!name || (!email && !phone) || !password) {
    return res.status(400).json({ error: 'Name, password, and either email or phone are required' });
  }

  try {
    const rounds = Number(config.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);
    const userRole = role === 'admin' ? 'admin' : 'viewer';

    const insertRes = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role, created_at AS "createdAt"`,
      [name, email || null, phone || null, passwordHash, userRole]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A user with this email or phone already exists' });
    }
    console.error('[POST /api/users] Error:', err.message);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * DELETE /api/users/:id - Delete user
 */
router.delete('/:id', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const delRes = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [targetId]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/users/:id] Error:', err.message);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * PUT /api/users/:id/plants - Set plant access for user
 */
router.put('/:id/plants', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { plantIds } = req.body || {};

  if (!Array.isArray(plantIds)) {
    return res.status(400).json({ error: 'plantIds must be an array of IDs' });
  }

  try {
    await db.query('DELETE FROM plant_access WHERE user_id = $1', [targetId]);

    for (const pid of plantIds) {
      await db.query(
        'INSERT INTO plant_access (user_id, plant_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [targetId, pid]
      );
    }

    res.json({ ok: true, plantIds });
  } catch (err) {
    console.error('[PUT /api/users/:id/plants] Error:', err.message);
    res.status(500).json({ error: 'Failed to update plant access' });
  }
});

module.exports = router;
