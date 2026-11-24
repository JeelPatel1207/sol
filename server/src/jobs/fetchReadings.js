const db = require('../db');
const config = require('../config');
const cryptoUtil = require('../utils/crypto');
const { fetchPlantReading } = require('../collectors');
const readingsService = require('../services/readings.service');

async function fetchReadingsJob() {
  console.log(`[${new Date().toISOString()}] Running fetchReadingsJob...`);

  let plants = [];
  try {
    const res = await db.query('SELECT * FROM plants WHERE active = true ORDER BY id ASC');
    plants = res.rows;
  } catch (err) {
    console.error('[fetchReadingsJob] Failed to query active plants:', err.message);
    return;
  }

  if (plants.length === 0) {
    console.log('[fetchReadingsJob] No active plants found.');
    return;
  }

  for (const plant of plants) {
    try {
      let credentials = null;
      if (plant.source_credentials && config.CREDENTIALS_KEY) {
        try {
          credentials = cryptoUtil.decrypt(plant.source_credentials, config.CREDENTIALS_KEY);
        } catch (decErr) {
          console.error(`[fetchReadingsJob] Failed to decrypt credentials for plant ${plant.id}: ${decErr.message}`);
        }
      }

      const reading = await fetchPlantReading(plant, credentials);
      if (!reading) {
        // null is normal for manual plants or skipped rounds
        continue;
      }

      const saved = await readingsService.saveReading(reading);
      if (saved) {
        console.log(`[fetchReadingsJob] Saved reading for plant ${plant.id} (${plant.name}): ${reading.powerKw} kW, ${reading.todayKwh} kWh`);
      } else {
        console.log(`[fetchReadingsJob] Reading already exists for plant ${plant.id} at ${reading.time}`);
      }
    } catch (plantErr) {
      // Per rule: catch error per plant, log without secrets, don't crash
      console.error(`[fetchReadingsJob] Error collecting reading for plant ${plant.id} (${plant.name}):`, plantErr.message);
    }
  }
}

module.exports = {
  fetchReadingsJob
};
