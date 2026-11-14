const pool = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT id, name, email, password, created_at FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function create({ name, email, passwordHash }) {
  const [result] = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, passwordHash]);
  return { id: result.insertId, name, email };
}

module.exports = { findByEmail, findById, create };
