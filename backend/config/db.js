const mysql = require('mysql2/promise');
const dbOptions = require('./dbOptions');

const pool = mysql.createPool({
  ...dbOptions(),
  database: process.env.DB_NAME || 'task_tracker',
  waitForConnections: true,
  // Serverless instances each hold their own pool, so keep it small there.
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || (process.env.VERCEL ? 3 : 10),
  dateStrings: ['DATE'], // return DATE columns as 'YYYY-MM-DD' (no timezone shifting)
});

module.exports = pool;

/** Runs fn(conn) inside a transaction; commits on success, rolls back on any error. */
pool.withTransaction = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
