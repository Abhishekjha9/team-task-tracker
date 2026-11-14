require('dotenv').config();

const REQUIRED = ['DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}. See .env.example`);
  process.exit(1);
}

const app = require('./app');
const pool = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

pool
  .query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to MySQL:', err.message);
    process.exit(1);
  });
