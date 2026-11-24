/**
 * In-memory IP rate limiter for login attempts (10 tries per 15 minutes per IP).
 */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  const record = attempts.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + WINDOW_MS;
  }

  record.count += 1;
  attempts.set(ip, record);

  if (record.count > MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many login attempts. Please try again after 15 minutes.'
    });
  }

  next();
}

module.exports = rateLimitLogin;
