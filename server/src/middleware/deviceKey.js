const bcrypt = require('bcrypt');
const db = require('../db');

async function deviceKeyMiddleware(req, res, next) {
  const deviceKey = req.headers['x-device-key'];
  const plantId = req.body?.plantId || req.params?.id;

  if (!deviceKey || !plantId) {
    return res.status(401).json({ error: 'Missing X-Device-Key header or plantId' });
  }

  try {
    const result = await db.query(
      'SELECT id, name, device_key_hash, active FROM plants WHERE id = $1',
      [plantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    const plant = result.rows[0];
    if (!plant.active) {
      return res.status(403).json({ error: 'Plant is inactive' });
    }

    if (!plant.device_key_hash) {
      return res.status(401).json({ error: 'Device key not configured for this plant' });
    }

    const isValid = await bcrypt.compare(deviceKey, plant.device_key_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid device key' });
    }

    req.plant = plant;
    next();
  } catch (err) {
    console.error('[deviceKeyMiddleware] Error verifying device key:', err.message);
    return res.status(500).json({ error: 'Internal server error verifying device key' });
  }
}

module.exports = deviceKeyMiddleware;
