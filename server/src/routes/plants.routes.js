const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db');
const config = require('../config');
const cryptoUtil = require('../utils/crypto');
const authMiddleware = require('../middleware/auth');
const requirePlantAccess = require('../middleware/plantAccess');
const requireAdmin = require('../middleware/requireAdmin');
const readingsService = require('../services/readings.service');
const { fetchPlantReading } = require('../collectors');
const { calculatePlantStatus, getPlantHistory } = require('../services/plants.service');

const router = express.Router();
router.use(authMiddleware);

// GET /api/plants
router.get('/', async (req, res) => {
  try {
    const q = req.user.role === 'admin'
      ? 'SELECT * FROM plants WHERE active = true ORDER BY id ASC'
      : 'SELECT p.* FROM plants p JOIN plant_access pa ON p.id = pa.plant_id WHERE pa.user_id = $1 AND p.active = true ORDER BY p.id ASC';
    const params = req.user.role === 'admin' ? [] : [req.user.id];
    const plantsRes = await db.query(q, params);

    const results = await Promise.all(plantsRes.rows.map(async (plant) => {
      const latest = (await db.query('SELECT * FROM readings WHERE plant_id = $1 ORDER BY time DESC LIMIT 1', [plant.id])).rows[0] || null;
      return {
        id: Number(plant.id),
        name: plant.name,
        capacityKw: parseFloat(plant.capacity_kw) || 0,
        powerKw: latest ? parseFloat(latest.power_kw) : 0,
        todayKwh: latest ? parseFloat(latest.today_kwh) : 0,
        status: calculatePlantStatus(plant, latest),
        lastUpdated: latest ? latest.time : null
      };
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plants' });
  }
});

// GET /api/plants/:id/live
router.get('/:id/live', requirePlantAccess, async (req, res) => {
  try {
    const plant = req.plant;
    const timeZone = plant.timezone || 'Asia/Kolkata';
    const latest = (await db.query('SELECT * FROM readings WHERE plant_id = $1 ORDER BY time DESC LIMIT 1', [plant.id])).rows[0] || null;
    const unitRate = parseFloat(plant.unit_rate_inr) || 7.00;
    const todayKwh = latest ? (parseFloat(latest.today_kwh) || 0) : 0;
    const totalKwh = latest ? (parseFloat(latest.total_kwh) || 0) : 0;

    const curveRes = await db.query(
      `SELECT time, power_kw FROM readings WHERE plant_id = $1 AND (time AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date ORDER BY time ASC`,
      [plant.id, timeZone]
    );

    res.json({
      plantId: Number(plant.id),
      name: plant.name,
      powerKw: latest ? parseFloat(latest.power_kw) : 0,
      todayKwh,
      totalKwh,
      savingsTodayInr: Math.round(todayKwh * unitRate * 100) / 100,
      savingsTotalInr: Math.round(totalKwh * unitRate * 100) / 100,
      voltage: latest && latest.voltage !== null ? parseFloat(latest.voltage) : null,
      temperature: latest && latest.temperature !== null ? parseFloat(latest.temperature) : null,
      status: calculatePlantStatus(plant, latest),
      lastUpdated: latest ? latest.time : null,
      todayCurve: curveRes.rows.map(r => ({ t: r.time, kw: parseFloat(r.power_kw) || 0 }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch live plant data' });
  }
});

// GET /api/plants/:id/history
router.get('/:id/history', requirePlantAccess, async (req, res) => {
  try {
    const plant = req.plant;
    const timeZone = plant.timezone || 'Asia/Kolkata';
    const range = req.query.range || 'day';
    const inputDate = req.query.date || new Date().toISOString().slice(0, 10);
    const unitRate = parseFloat(plant.unit_rate_inr) || 7.00;
    const data = await getPlantHistory(plant.id, range, inputDate, timeZone, unitRate);
    res.json(data);
  } catch (err) {
    res.status(err.message.includes('Invalid range') ? 400 : 500).json({ error: err.message });
  }
});

// GET /api/plants/:id/alerts (API_SPEC.md)
router.get('/:id/alerts', requirePlantAccess, async (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  try {
    const q = await db.query(
      'SELECT id, plant_id AS "plantId", time, type, message, seen, resolved_at AS "resolvedAt" FROM alerts WHERE plant_id = $1 ORDER BY time DESC LIMIT $2',
      [req.params.id, limit]
    );
    res.json(q.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plant alerts' });
  }
});

// POST /api/plants (Admin)
router.post('/', requireAdmin, async (req, res) => {
  const { name, location, capacityKw, unitRateInr, sourceType, sourceConfig, credentials, offlineAfterMin, lowGenPercent } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Plant name is required' });

  try {
    let encryptedCreds = null;
    if (credentials && config.CREDENTIALS_KEY) {
      encryptedCreds = cryptoUtil.encrypt(typeof credentials === 'string' ? credentials : JSON.stringify(credentials), config.CREDENTIALS_KEY);
    }

    const rawDeviceKey = crypto.randomBytes(16).toString('hex');
    const deviceKeyHash = await bcrypt.hash(rawDeviceKey, 10);

    const insertSql = `
      INSERT INTO plants (name, location, capacity_kw, unit_rate_inr, source_type, source_config, source_credentials, device_key_hash, offline_after_min, low_gen_percent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, capacity_kw, source_type`;
    const ins = await db.query(insertSql, [
      name, location || null, capacityKw || 5.0, unitRateInr || 7.0, sourceType || 'mock',
      JSON.stringify(sourceConfig || {}), encryptedCreds, deviceKeyHash, offlineAfterMin || 20, lowGenPercent || 50
    ]);

    res.status(201).json({ id: ins.rows[0].id, name: ins.rows[0].name, deviceKey: rawDeviceKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create plant: ' + err.message });
  }
});

// PATCH /api/plants/:id (Admin)
router.patch('/:id', requirePlantAccess, requireAdmin, async (req, res) => {
  const { name, location, capacityKw, unitRateInr, sourceType, active, offlineAfterMin, lowGenPercent } = req.body || {};
  try {
    const updated = await db.query(
      `UPDATE plants SET
         name = COALESCE($1, name), location = COALESCE($2, location), capacity_kw = COALESCE($3, capacity_kw),
         unit_rate_inr = COALESCE($4, unit_rate_inr), source_type = COALESCE($5, source_type), active = COALESCE($6, active),
         offline_after_min = COALESCE($7, offline_after_min), low_gen_percent = COALESCE($8, low_gen_percent)
       WHERE id = $9 RETURNING *`,
      [name, location, capacityKw, unitRateInr, sourceType, active, offlineAfterMin, lowGenPercent, req.params.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update plant' });
  }
});

// DELETE /api/plants/:id (Admin)
router.delete('/:id', requirePlantAccess, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM plants WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});

// POST /api/plants/:id/test-collector (Admin)
router.post('/:id/test-collector', requirePlantAccess, requireAdmin, async (req, res) => {
  try {
    let credentials = null;
    if (req.plant.source_credentials && config.CREDENTIALS_KEY) {
      credentials = cryptoUtil.decrypt(req.plant.source_credentials, config.CREDENTIALS_KEY);
    }
    const reading = await fetchPlantReading(req.plant, credentials);
    res.json({ ok: true, reading });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/plants/:id/manual-reading (Admin)
router.post('/:id/manual-reading', requirePlantAccess, requireAdmin, async (req, res) => {
  const { date, todayKwh, totalKwh } = req.body || {};
  if (!date || todayKwh === undefined || totalKwh === undefined) {
    return res.status(400).json({ error: 'Missing date, todayKwh, or totalKwh' });
  }
  try {
    const reading = {
      plantId: Number(req.plant.id), time: new Date(`${date}T18:00:00+05:30`).toISOString(),
      powerKw: 0, todayKwh: parseFloat(todayKwh), totalKwh: parseFloat(totalKwh),
      voltage: null, temperature: null, status: 'online', faultCode: null
    };
    const saved = await readingsService.saveReading(reading);
    res.status(201).json({ ok: true, reading: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save manual reading' });
  }
});

module.exports = router;
