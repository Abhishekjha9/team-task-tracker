const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const teamRoutes = require('./routes/teamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const pool = require('./config/db');

const app = express();

/**
 * CLIENT_ORIGIN: comma-separated allowed origins; `*` matches within a hostname label set,
 * e.g. "https://app.vercel.app,https://app-*.vercel.app" (the latter covers preview deploys).
 */
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)
  .map((o) => new RegExp(`^${o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+')}$`, 'i'));

app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.some((re) => re.test(origin))) }));
app.use(express.json({ limit: '100kb' }));

// Deployment check: reports missing config by NAME only, and whether the DB is reachable.
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
app.get('/api/health', async (req, res) => {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  let db = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    db = 'unreachable';
  }
  const ok = !missing.length && db === 'ok';
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db, ...(missing.length && { missingConfig: missing }) });
});
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
