const db = require('../db');
const { checkPlantAlerts } = require('../services/alerts.service');

async function checkAlertsJob() {
  try {
    const plantsRes = await db.query('SELECT * FROM plants WHERE active = true');
    for (const plant of plantsRes.rows) {
      await checkPlantAlerts(plant);
    }
  } catch (err) {
    console.error('[checkAlertsJob] Error running alerts check:', err.message);
  }
}

module.exports = {
  checkAlertsJob
};
