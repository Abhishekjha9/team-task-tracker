const pool = require('../config/db');

async function findByEmail(email, conn = pool) {
  const [rows] = await conn.query('SELECT id, name, email, password, created_at FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

/** User + current team membership (null teamId if they belong to none). */
async function findWithMembership(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, tm.team_id AS teamId, tm.role, t.name AS teamName
     FROM users u
     LEFT JOIN team_members tm ON tm.user_id = u.id
     LEFT JOIN teams t ON t.id = tm.team_id
     WHERE u.id = ?`,
    [id],
  );
  return rows[0] || null;
}

async function create({ name, email, passwordHash }, conn = pool) {
  const [result] = await conn.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, passwordHash]);
  return { id: result.insertId, name, email };
}

/** Signup: a new user starts their own team as its admin (atomic). */
async function createWithTeam({ name, email, passwordHash, teamName }) {
  return pool.withTransaction(async (conn) => {
    const user = await create({ name, email, passwordHash }, conn);
    const [team] = await conn.query('INSERT INTO teams (name) VALUES (?)', [teamName]);
    await conn.query("INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'admin')", [team.insertId, user.id]);
    return user;
  });
}

const touchLogin = (id) => pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);

module.exports = { findByEmail, findWithMembership, create, createWithTeam, touchLogin };
