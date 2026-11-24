const db = require('../db');
const config = require('../config');
const { getFractionalHours } = require('../utils/time');

/**
 * Insert alert only if an open alert of this type for the plant does not already exist.
 */
async function createAlertIfNotOpen(plantId, type, message) {
  const existing = await db.query(
    'SELECT id FROM alerts WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL LIMIT 1',
    [plantId, type]
  );

  if (existing.rows.length === 0) {
    const insertRes = await db.query(
      `INSERT INTO alerts (plant_id, type, message, seen)
       VALUES ($1, $2, $3, false)
       RETURNING id, plant_id, type, message, time`,
      [plantId, type, message]
    );
    console.log(`[AlertsService] Created new ${type} alert for plant ${plantId}: "${message}"`);
    return insertRes.rows[0];
  }
  return null;
}

/**
 * Resolve open alert of this type when condition clears.
 */
async function resolveAlertIfOpen(plantId, type) {
  const res = await db.query(
    `UPDATE alerts
     SET resolved_at = now()
     WHERE plant_id = $1 AND type = $2 AND resolved_at IS NULL
     RETURNING id`,
    [plantId, type]
  );
  if (res.rowCount > 0) {
    console.log(`[AlertsService] Resolved ${type} alert for plant ${plantId}`);
  }
}

/**
 * Check alert rules for a plant.
 */
async function checkPlantAlerts(plant, latestReading = null) {
  const timeZone = plant.timezone || 'Asia/Kolkata';
  const hours = getFractionalHours(new Date(), timeZone);
  const isDaytime = hours >= config.DAYTIME_START_HOUR && hours <= config.DAYTIME_END_HOUR;

  if (!latestReading) {
    const res = await db.query(
      'SELECT * FROM readings WHERE plant_id = $1 ORDER BY time DESC LIMIT 1',
      [plant.id]
    );
    latestReading = res.rows[0] || null;
  }

  // Rule 1: Offline check during daytime
  if (isDaytime) {
    const diffMin = latestReading
      ? (Date.now() - new Date(latestReading.time).getTime()) / (60 * 1000)
      : 999;
    const threshold = plant.offline_after_min || 20;

    if (diffMin > threshold) {
      await createAlertIfNotOpen(
        plant.id,
        'offline',
        `No data received for ${Math.round(diffMin)} minutes during daytime`
      );
    } else {
      await resolveAlertIfOpen(plant.id, 'offline');
    }
  } else {
    // Night time - resolve daytime offline alerts
    await resolveAlertIfOpen(plant.id, 'offline');
  }

  // Rule 2: Error status check
  if (latestReading && (latestReading.status === 'fault' || latestReading.fault_code)) {
    const faultMsg = latestReading.fault_code
      ? `Inverter reported fault: ${latestReading.fault_code}`
      : 'Inverter reported fault status';
    await createAlertIfNotOpen(plant.id, 'error', faultMsg);
  } else if (latestReading && latestReading.status === 'online') {
    await resolveAlertIfOpen(plant.id, 'error');
  }

  // Rule 3: Low generation check (after midday)
  if (isDaytime && hours >= 12.0 && latestReading) {
    try {
      const hist = await db.query(
        `SELECT AVG(today_kwh) as avg_kwh
         FROM (
           SELECT MAX(today_kwh) as today_kwh
           FROM readings
           WHERE plant_id = $1
             AND (time AT TIME ZONE $2)::date < (now() AT TIME ZONE $2)::date
             AND (time AT TIME ZONE $2)::date >= ((now() AT TIME ZONE $2)::date - interval '5 days')
           GROUP BY (time AT TIME ZONE $2)::date
         ) sub`,
        [plant.id, timeZone]
      );

      const avgKwh = parseFloat(hist.rows[0]?.avg_kwh) || 0;
      const currentTodayKwh = parseFloat(latestReading.today_kwh) || 0;
      const lowGenPct = plant.low_gen_percent || 50;

      if (avgKwh > 2.0 && currentTodayKwh < (avgKwh * (lowGenPct / 100))) {
        await createAlertIfNotOpen(
          plant.id,
          'low_generation',
          `Generation is unusually low: ${currentTodayKwh.toFixed(1)} kWh (expected ~${avgKwh.toFixed(1)} kWh)`
        );
      } else {
        await resolveAlertIfOpen(plant.id, 'low_generation');
      }
    } catch (e) {
      // Non-critical check
    }
  }
}

module.exports = {
  createAlertIfNotOpen,
  resolveAlertIfOpen,
  checkPlantAlerts
};
