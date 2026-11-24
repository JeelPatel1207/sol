const db = require('../db');

/**
 * Aggregates daily reading totals into daily_summary table.
 * Defaults to aggregating yesterday, or specific targetDate if passed ('YYYY-MM-DD').
 */
async function runDailySummaryJob(targetDate = null) {
  console.log(`[dailySummaryJob] Running daily summary aggregation...`);

  try {
    const plantsRes = await db.query('SELECT id, timezone FROM plants WHERE active = true');

    for (const plant of plantsRes.rows) {
      const timeZone = plant.timezone || 'Asia/Kolkata';

      // If targetDate not specified, default to yesterday in plant timezone
      const dateQuery = targetDate
        ? `$3::date`
        : `((now() AT TIME ZONE $2) - interval '1 day')::date`;

      const aggSql = `
        WITH stats AS (
          SELECT
            MAX(today_kwh) AS total_kwh,
            MAX(power_kw) AS peak_kw
          FROM readings
          WHERE plant_id = $1
            AND (time AT TIME ZONE $2)::date = ${dateQuery}
        )
        INSERT INTO daily_summary (plant_id, date, total_kwh, peak_kw)
        SELECT $1, ${dateQuery}, COALESCE(total_kwh, 0), COALESCE(peak_kw, 0)
        FROM stats
        WHERE total_kwh IS NOT NULL
        ON CONFLICT (plant_id, date) DO UPDATE
        SET total_kwh = EXCLUDED.total_kwh,
            peak_kw = EXCLUDED.peak_kw;
      `;

      const params = targetDate ? [plant.id, timeZone, targetDate] : [plant.id, timeZone];
      await db.query(aggSql, params);
      console.log(`[dailySummaryJob] Plant ${plant.id}: daily summary recorded.`);
    }
  } catch (err) {
    console.error('[dailySummaryJob] Error running daily summary:', err.message);
  }
}

module.exports = {
  runDailySummaryJob,
  dailySummaryJob: runDailySummaryJob
};
