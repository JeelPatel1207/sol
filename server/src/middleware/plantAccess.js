const db = require('../db');

/**
 * Ensures user has access to req.params.id plant.
 * Admins have access to all plants.
 * Viewers must be assigned in plant_access table.
 */
async function requirePlantAccess(req, res, next) {
  const plantId = parseInt(req.params.id, 10);
  if (isNaN(plantId)) {
    return res.status(400).json({ error: 'Invalid plant ID parameter' });
  }

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Check if plant exists
    const plantRes = await db.query('SELECT * FROM plants WHERE id = $1', [plantId]);
    if (plantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const plant = plantRes.rows[0];

    // 2. Admin has access to all plants
    if (user.role === 'admin') {
      req.plant = plant;
      return next();
    }

    // 3. Viewers must have explicit access
    const accessRes = await db.query(
      'SELECT 1 FROM plant_access WHERE user_id = $1 AND plant_id = $2',
      [user.id, plantId]
    );

    if (accessRes.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this plant' });
    }

    req.plant = plant;
    next();
  } catch (err) {
    console.error('[requirePlantAccess] Error checking plant access:', err.message);
    return res.status(500).json({ error: 'Internal server error checking plant access' });
  }
}

module.exports = requirePlantAccess;
