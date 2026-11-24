const express = require('express');
const deviceKeyMiddleware = require('../middleware/deviceKey');
const readingsService = require('../services/readings.service');

const router = express.Router();

/**
 * POST /api/ingest
 * Protected by X-Device-Key header
 */
router.post('/', deviceKeyMiddleware, async (req, res) => {
  const body = req.body || {};

  try {
    const reading = {
      plantId: Number(req.plant.id),
      time: body.time ? new Date(body.time).toISOString() : new Date().toISOString(),
      powerKw: body.powerKw !== undefined ? parseFloat(body.powerKw) : null,
      todayKwh: body.todayKwh !== undefined ? parseFloat(body.todayKwh) : null,
      totalKwh: body.totalKwh !== undefined ? parseFloat(body.totalKwh) : null,
      voltage: body.voltage !== undefined ? parseFloat(body.voltage) : null,
      temperature: body.temperature !== undefined ? parseFloat(body.temperature) : null,
      status: body.status || 'online',
      faultCode: body.faultCode || null
    };

    await readingsService.saveReading(reading);

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[POST /api/ingest] Error saving reading:', err.message);
    return res.status(500).json({ error: 'Failed to process ingest reading' });
  }
});

module.exports = router;
