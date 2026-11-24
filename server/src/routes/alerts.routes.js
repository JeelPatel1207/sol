const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const requirePlantAccess = require('../middleware/plantAccess');

const router = express.Router();
router.use(authMiddleware);

/**
 * GET /api/alerts - List alerts for user's accessible plants
 */
router.get('/', async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  const unseenOnly = req.query.unseenOnly === 'true';

  try {
    let queryText;
    let params;

    if (req.user.role === 'admin') {
      queryText = `
        SELECT a.id, a.plant_id AS "plantId", p.name AS "plantName", a.time, a.type, a.message, a.seen, a.resolved_at AS "resolvedAt"
        FROM alerts a
        JOIN plants p ON a.plant_id = p.id
        WHERE ($1::boolean = false OR a.seen = false)
        ORDER BY a.time DESC
        LIMIT $2
      `;
      params = [unseenOnly, limit];
    } else {
      queryText = `
        SELECT a.id, a.plant_id AS "plantId", p.name AS "plantName", a.time, a.type, a.message, a.seen, a.resolved_at AS "resolvedAt"
        FROM alerts a
        JOIN plants p ON a.plant_id = p.id
        JOIN plant_access pa ON p.id = pa.plant_id
        WHERE pa.user_id = $1 AND ($2::boolean = false OR a.seen = false)
        ORDER BY a.time DESC
        LIMIT $3
      `;
      params = [req.user.id, unseenOnly, limit];
    }

    const result = await db.query(queryText, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/alerts] Error:', err.message);
    res.status(500).json({ error: 'Internal server error fetching alerts' });
  }
});

/**
 * GET /api/plants/:id/alerts - List alerts for one plant
 */
router.get('/plant/:id', requirePlantAccess, async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);

  try {
    const result = await db.query(
      `SELECT id, plant_id AS "plantId", time, type, message, seen, resolved_at AS "resolvedAt"
       FROM alerts
       WHERE plant_id = $1
       ORDER BY time DESC
       LIMIT $2`,
      [req.params.id, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/alerts/plant/:id] Error:', err.message);
    res.status(500).json({ error: 'Internal server error fetching plant alerts' });
  }
});

/**
 * POST /api/alerts/:id/seen - Mark single alert as seen
 */
router.post('/:id/seen', async (req, res) => {
  const alertId = parseInt(req.params.id, 10);

  try {
    const result = await db.query(
      'UPDATE alerts SET seen = true WHERE id = $1 RETURNING id',
      [alertId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/alerts/:id/seen] Error:', err.message);
    res.status(500).json({ error: 'Internal server error updating alert' });
  }
});

/**
 * POST /api/alerts/mark-all-seen - Mark all alerts as seen for user's plants
 */
router.post('/mark-all-seen', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await db.query('UPDATE alerts SET seen = true WHERE seen = false');
    } else {
      await db.query(
        `UPDATE alerts SET seen = true
         WHERE seen = false AND plant_id IN (
           SELECT plant_id FROM plant_access WHERE user_id = $1
         )`,
        [req.user.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/alerts/mark-all-seen] Error:', err.message);
    res.status(500).json({ error: 'Internal server error updating alerts' });
  }
});

module.exports = router;
