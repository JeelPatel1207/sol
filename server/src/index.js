const express = require('express');
const cors = require('cors');
let helmet;
try {
  helmet = require('helmet');
} catch (e) {
  helmet = () => (req, res, next) => next();
}

const config = require('./config');
const db = require('./db');
const { startScheduler, stopScheduler } = require('./jobs/scheduler');
const { fetchReadingsJob } = require('./jobs/fetchReadings');
const { checkAlertsJob } = require('./jobs/checkAlerts');

const authRoutes = require('./routes/auth.routes');
const plantsRoutes = require('./routes/plants.routes');
const ingestRoutes = require('./routes/ingest.routes');
const alertsRoutes = require('./routes/alerts.routes');
const usersRoutes = require('./routes/users.routes');
const authMiddleware = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plants', plantsRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/users', usersRoutes);

// Support both /api/me and /api/auth/me per API_SPEC.md
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ id: Number(req.user.id), name: req.user.name, role: req.user.role });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('[ServerError]:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

let server = null;

async function startServer() {
  console.log('=== Starting Solar Monitor Server (Phase 4: Full Features) ===');

  try {
    const res = await db.query('SELECT current_database(), current_user, now()');
    console.log(`Connected to database "${res.rows[0].current_database()}" as "${res.rows[0].current_user}"`);
  } catch (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }

  startScheduler();

  // Run initial round on startup
  fetchReadingsJob().then(() => checkAlertsJob()).catch(e => console.error(e.message));

  const PORT = config.PORT || 4000;
  server = app.listen(PORT, () => {
    console.log(`Solar Monitor API server listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log('\nShutting down gracefully...');
    stopScheduler();
    if (server) server.close();
    await db.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startServer().catch(err => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
