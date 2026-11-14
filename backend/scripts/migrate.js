/**
 * Versioned migration runner.
 *   node scripts/migrate.js            -> create the database if needed, apply pending migrations
 *   node scripts/migrate.js --status   -> list applied / pending migrations
 *
 * Migrations live in /migrations as NNN_name.sql or NNN_name.js (exporting `up(conn)`),
 * run in filename order, and are recorded in `schema_migrations`.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DIR = path.join(__dirname, '..', 'migrations');

async function migrate({ database = process.env.DB_NAME || 'task_tracker', log = console.log, only } = {}) {
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error(`Invalid database name: ${database}`);
  const base = { ...require('../config/dbOptions')(), multipleStatements: true };

  const admin = await mysql.createConnection(base);
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  const conn = await mysql.createConnection({ ...base, database });
  try {
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);

    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    let files = fs.readdirSync(DIR).filter((f) => /^\d+_.+\.(sql|js)$/.test(f)).sort();
    if (only) files = files.filter((f) => only.includes(f));
    const pending = files.filter((f) => !applied.has(f));

    for (const file of pending) {
      log(`→ applying ${file}`);
      const full = path.join(DIR, file);
      if (file.endsWith('.sql')) await conn.query(fs.readFileSync(full, 'utf8'));
      else await require(full).up(conn);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
    }
    log(pending.length ? `Database "${database}": applied ${pending.length} migration(s).` : `Database "${database}" is up to date.`);
    return { applied: [...applied], ran: pending };
  } finally {
    await conn.end();
  }
}

module.exports = { migrate };

if (require.main === module) {
  require('dotenv').config();
  (async () => {
    if (process.argv.includes('--status')) {
      const conn = await mysql.createConnection({ ...require('../config/dbOptions')(), database: process.env.DB_NAME });
      const [rows] = await conn.query('SELECT name, applied_at FROM schema_migrations ORDER BY name').catch(() => [[]]);
      const done = new Set(rows.map((r) => r.name));
      for (const f of fs.readdirSync(DIR).filter((x) => /^\d+_/.test(x)).sort()) console.log(`${done.has(f) ? '[x]' : '[ ]'} ${f}`);
      await conn.end();
      return;
    }
    await migrate();
  })().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
