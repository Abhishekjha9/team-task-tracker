// Creates the database and tables from db/schema.sql using credentials from .env.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  const dbName = process.env.DB_NAME || 'task_tracker';
  const sql = fs
    .readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
    .replace(/task_tracker/g, dbName); // allow a custom DB name (e.g. a test DB)
  await conn.query(sql);
  await conn.end();
  console.log(`Database "${dbName}" is ready.`);
})().catch((err) => {
  console.error('Database init failed:', err.message);
  process.exit(1);
});
