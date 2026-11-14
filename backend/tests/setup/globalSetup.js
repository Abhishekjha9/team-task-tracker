// For DB_TESTS=1: recreate the test database and apply all migrations once per run.
module.exports = async () => {
  if (process.env.DB_TESTS !== '1') return;
  require('./env');
  const db = process.env.DB_NAME;
  if (!db.endsWith('_test')) throw new Error(`Refusing to reset non-test database "${db}"`);
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
  await conn.end();
  await require('../../scripts/migrate').migrate({ database: db, log: () => {} });
};
