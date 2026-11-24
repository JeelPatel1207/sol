const db = require('../db');

/**
 * Save a normalized reading to the database.
 * Uses ON CONFLICT (plant_id, time) DO NOTHING to prevent duplicates.
 */
async function saveReading(reading) {
  if (!reading || !reading.plantId || !reading.time) {
    throw new Error('Invalid reading object: plantId and time are required');
  }

  const queryText = `
    INSERT INTO readings (
      plant_id,
      time,
      power_kw,
      today_kwh,
      total_kwh,
      voltage,
      temperature,
      status,
      fault_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (plant_id, time) DO NOTHING
    RETURNING *;
  `;

  const values = [
    reading.plantId,
    reading.time,
    reading.powerKw !== undefined ? reading.powerKw : null,
    reading.todayKwh !== undefined ? reading.todayKwh : null,
    reading.totalKwh !== undefined ? reading.totalKwh : null,
    reading.voltage !== undefined ? reading.voltage : null,
    reading.temperature !== undefined ? reading.temperature : null,
    reading.status || 'online',
    reading.faultCode || null
  ];

  const result = await db.query(queryText, values);
  return result.rows[0] || null; // null if duplicate suppressed by ON CONFLICT
}

/**
 * Get latest reading for a plant.
 */
async function getLatestReading(plantId) {
  const result = await db.query(
    'SELECT * FROM readings WHERE plant_id = $1 ORDER BY time DESC LIMIT 1',
    [plantId]
  );
  return result.rows[0] || null;
}

module.exports = {
  saveReading,
  getLatestReading
};
