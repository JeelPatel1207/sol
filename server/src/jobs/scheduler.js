const cron = require('node-cron');
const config = require('../config');
const { fetchReadingsJob } = require('./fetchReadings');
const { checkAlertsJob } = require('./checkAlerts');
const { dailySummaryJob } = require('./dailySummary');

let collectTask = null;
let summaryTask = null;

function startScheduler() {
  const cronExpr = config.COLLECT_CRON || '*/5 * * * *';
  console.log(`[Scheduler] Initializing collector cron: "${cronExpr}"`);

  collectTask = cron.schedule(cronExpr, async () => {
    try {
      await fetchReadingsJob();
      await checkAlertsJob();
    } catch (err) {
      console.error('[Scheduler] Error in collection/alert round:', err.message);
    }
  });

  const summaryExpr = config.DAILY_SUMMARY_CRON || '5 0 * * *';
  console.log(`[Scheduler] Initializing daily summary cron: "${summaryExpr}"`);

  summaryTask = cron.schedule(summaryExpr, async () => {
    try {
      await dailySummaryJob();
    } catch (err) {
      console.error('[Scheduler] Error in dailySummaryJob:', err.message);
    }
  });

  console.log('[Scheduler] All background cron jobs started.');
}

function stopScheduler() {
  if (collectTask) { collectTask.stop(); collectTask = null; }
  if (summaryTask) { summaryTask.stop(); summaryTask = null; }
  console.log('[Scheduler] Cron jobs stopped.');
}

module.exports = {
  startScheduler,
  stopScheduler
};
