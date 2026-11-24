const db = require('../db');
const config = require('../config');
const { getFractionalHours } = require('../utils/time');

function calculatePlantStatus(plant, latestReading) {
  const timeZone = plant.timezone || 'Asia/Kolkata';
  const hours = getFractionalHours(new Date(), timeZone);
  const isDaytime = hours >= config.DAYTIME_START_HOUR && hours <= config.DAYTIME_END_HOUR;

  if (isDaytime) {
    if (!latestReading) return 'offline';
    const diffMin = (Date.now() - new Date(latestReading.time).getTime()) / (60 * 1000);
    const offlineThreshold = plant.offline_after_min || 20;
    if (diffMin > offlineThreshold) return 'offline';
    return latestReading.status || 'online';
  }

  return latestReading ? (latestReading.status || 'online') : 'offline';
}

async function getPlantHistory(plantId, range, inputDate, timeZone, unitRate) {
  let points = [];
  let totalKwh = 0;

  if (range === 'day') {
    const q = await db.query(
      `SELECT time, power_kw, today_kwh
       FROM readings
       WHERE plant_id = $1
         AND (time AT TIME ZONE $2)::date = $3::date
       ORDER BY time ASC`,
      [plantId, timeZone, inputDate]
    );
    points = q.rows.map(r => ({
      t: r.time,
      kw: parseFloat(r.power_kw) || 0
    }));
    const maxToday = q.rows.reduce((m, r) => Math.max(m, parseFloat(r.today_kwh) || 0), 0);
    totalKwh = Math.round(maxToday * 1000) / 1000;
  } else if (range === 'month') {
    const ym = inputDate.slice(0, 7); // 'YYYY-MM'

    // Try daily_summary first for speed
    const summaryRes = await db.query(
      `SELECT date, total_kwh AS kwh
       FROM daily_summary
       WHERE plant_id = $1 AND to_char(date, 'YYYY-MM') = $2
       ORDER BY date ASC`,
      [plantId, ym]
    );

    if (summaryRes.rows.length > 0) {
      points = summaryRes.rows.map(r => ({
        date: r.date.toISOString().slice(0, 10),
        kwh: Math.round(parseFloat(r.kwh) * 1000) / 1000
      }));
    } else {
      // Fallback to readings table
      const q = await db.query(
        `SELECT (time AT TIME ZONE $2)::date AS date, MAX(today_kwh) AS kwh
         FROM readings
         WHERE plant_id = $1 AND to_char(time AT TIME ZONE $2, 'YYYY-MM') = $3
         GROUP BY (time AT TIME ZONE $2)::date
         ORDER BY date ASC`,
        [plantId, timeZone, ym]
      );
      points = q.rows.map(r => ({
        date: r.date.toISOString().slice(0, 10),
        kwh: Math.round(parseFloat(r.kwh) * 1000) / 1000
      }));
    }
    totalKwh = points.reduce((acc, p) => acc + p.kwh, 0);
    totalKwh = Math.round(totalKwh * 1000) / 1000;
  } else if (range === 'year') {
    const yr = inputDate.slice(0, 4); // 'YYYY'

    // Try daily_summary aggregated by month
    const summaryRes = await db.query(
      `SELECT to_char(date, 'YYYY-MM') AS month, SUM(total_kwh) AS kwh
       FROM daily_summary
       WHERE plant_id = $1 AND to_char(date, 'YYYY') = $2
       GROUP BY to_char(date, 'YYYY-MM')
       ORDER BY month ASC`,
      [plantId, yr]
    );

    if (summaryRes.rows.length > 0) {
      points = summaryRes.rows.map(r => ({
        month: r.month,
        kwh: Math.round(parseFloat(r.kwh) * 1000) / 1000
      }));
    } else {
      // Fallback to readings table
      const q = await db.query(
        `WITH daily AS (
           SELECT (time AT TIME ZONE $2)::date AS d,
                  to_char(time AT TIME ZONE $2, 'YYYY-MM') AS ym,
                  MAX(today_kwh) AS day_kwh
           FROM readings
           WHERE plant_id = $1 AND to_char(time AT TIME ZONE $2, 'YYYY') = $3
           GROUP BY (time AT TIME ZONE $2)::date, to_char(time AT TIME ZONE $2, 'YYYY-MM')
         )
         SELECT ym AS month, SUM(day_kwh) AS kwh
         FROM daily
         GROUP BY ym
         ORDER BY ym ASC`,
        [plantId, timeZone, yr]
      );
      points = q.rows.map(r => ({
        month: r.month,
        kwh: Math.round(parseFloat(r.kwh) * 1000) / 1000
      }));
    }
    totalKwh = points.reduce((acc, p) => acc + p.kwh, 0);
    totalKwh = Math.round(totalKwh * 1000) / 1000;
  } else {
    throw new Error('Invalid range parameter');
  }

  const savingsInr = Math.round(totalKwh * unitRate * 100) / 100;
  return { range, totalKwh, savingsInr, points };
}

module.exports = {
  calculatePlantStatus,
  getPlantHistory
};
