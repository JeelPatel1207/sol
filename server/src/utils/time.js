/**
 * Time utility functions for UTC storage and Asia/Kolkata display/calculations.
 */

function getLocalParts(date = new Date(), timeZone = 'Asia/Kolkata') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);

  return { hour, minute, second };
}

/**
 * Returns fractional hours in plant's timezone (e.g. 6:30 => 6.5)
 */
function getFractionalHours(date = new Date(), timeZone = 'Asia/Kolkata') {
  const { hour, minute, second } = getLocalParts(date, timeZone);
  return hour + minute / 60 + second / 3600;
}

/**
 * Ensure UTC ISO string
 */
function toUtcIso(date = new Date()) {
  return new Date(date).toISOString();
}

module.exports = {
  getLocalParts,
  getFractionalHours,
  toUtcIso
};
