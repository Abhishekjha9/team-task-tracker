const pool = require('../config/db');
const AppError = require('../utils/AppError');

const ACTIVE_WINDOW_DAYS = 30;

// Per-member task counts (tasks ASSIGNED to the member, within the team).
const MEMBER_SELECT = `
  SELECT u.id, u.name, u.email, u.last_login_at, tm.role, tm.joined_at,
         COUNT(t.id) AS total,
         COALESCE(SUM(t.status = 'todo'), 0) AS todo,
         COALESCE(SUM(t.status = 'in-progress'), 0) AS in_progress,
         COALESCE(SUM(t.status = 'done'), 0) AS done
  FROM team_members tm
  JOIN users u ON u.id = tm.user_id
  LEFT JOIN tasks t ON t.assigned_to = tm.user_id AND t.team_id = tm.team_id`;
const MEMBER_GROUP = 'GROUP BY u.id, u.name, u.email, u.last_login_at, tm.role, tm.joined_at';

function presentMember(row, { withStats }) {
  const base = { id: row.id, name: row.name, email: row.email, role: row.role, joinedAt: row.joined_at };
  if (!withStats) return base;
  const total = Number(row.total);
  const done = Number(row.done);
  return {
    ...base,
    lastLoginAt: row.last_login_at,
    stats: {
      total,
      todo: Number(row.todo),
      inProgress: Number(row.in_progress),
      done,
      completionRate: total ? Math.round((done / total) * 100) : 0,
    },
  };
}

async function getTeamOverview(teamId) {
  const [[team]] = await pool.query('SELECT id, name, created_at FROM teams WHERE id = ?', [teamId]);
  const [[m]] = await pool.query(
    `SELECT COUNT(*) AS members,
            COALESCE(SUM(u.last_login_at >= NOW() - INTERVAL ${ACTIVE_WINDOW_DAYS} DAY), 0) AS active
     FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ?`,
    [teamId],
  );
  const [[t]] = await pool.query(
    `SELECT COALESCE(SUM(assigned_to IS NOT NULL), 0) AS assigned, COALESCE(SUM(status = 'done'), 0) AS completed
     FROM tasks WHERE team_id = ?`,
    [teamId],
  );
  return {
    team,
    overview: {
      totalMembers: Number(m.members),
      activeMembers: Number(m.active),
      activeWindowDays: ACTIVE_WINDOW_DAYS,
      assignedTasks: Number(t.assigned),
      completedTasks: Number(t.completed),
    },
  };
}

async function listMembers(teamId, { withStats }) {
  const [rows] = await pool.query(
    `${MEMBER_SELECT} WHERE tm.team_id = ? ${MEMBER_GROUP}
     ORDER BY FIELD(tm.role, 'admin', 'manager', 'member'), u.name`,
    [teamId],
  );
  return rows.map((r) => presentMember(r, { withStats }));
}

async function getMember(teamId, userId, { withStats }) {
  const [rows] = await pool.query(`${MEMBER_SELECT} WHERE tm.team_id = ? AND tm.user_id = ? ${MEMBER_GROUP}`, [teamId, userId]);
  return rows[0] ? presentMember(rows[0], { withStats }) : null;
}

/** Membership row, locked for the rest of the transaction. */
async function lockMembership(conn, teamId, userId) {
  const [rows] = await conn.query('SELECT user_id, role FROM team_members WHERE team_id = ? AND user_id = ? FOR UPDATE', [teamId, userId]);
  return rows[0] || null;
}

/** Locks all admin rows so two concurrent demotions can't both pass the "last admin" check. */
async function countAdmins(conn, teamId) {
  const [rows] = await conn.query("SELECT user_id FROM team_members WHERE team_id = ? AND role = 'admin' FOR UPDATE", [teamId]);
  return rows.length;
}

async function addMember(teamId, { name, email, passwordHash, role }) {
  return pool.withTransaction(async (conn) => {
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) throw new AppError(409, 'A user with this email already exists', { email: 'This email is already registered' });
    const [u] = await conn.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, passwordHash]);
    await conn.query('INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)', [teamId, u.insertId, role]);
    return u.insertId;
  });
}

/**
 * Updates name/email/role. `authorize(target)` is called with the locked membership row so the
 * permission check and the write see the same data.
 */
async function updateMember(teamId, userId, data, authorize) {
  return pool.withTransaction(async (conn) => {
    const target = await lockMembership(conn, teamId, userId);
    if (!target) return false;
    authorize(target);

    if (data.role && target.role === 'admin' && data.role !== 'admin' && (await countAdmins(conn, teamId)) <= 1) {
      throw new AppError(409, 'A team must keep at least one admin. Promote someone else first.');
    }
    if (data.email) {
      const [dupe] = await conn.query('SELECT id FROM users WHERE email = ? AND id <> ?', [data.email, userId]);
      if (dupe.length) throw new AppError(409, 'A user with this email already exists', { email: 'This email is already registered' });
    }
    const userFields = ['name', 'email'].filter((k) => data[k] !== undefined);
    if (userFields.length) {
      await conn.query(`UPDATE users SET ${userFields.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...userFields.map((k) => data[k]), userId]);
    }
    if (data.role) await conn.query('UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?', [data.role, teamId, userId]);
    return true;
  });
}

/**
 * Removes a member from the team. Their assigned tasks are reassigned to `reassignTo` or
 * left unassigned — never deleted. Tasks they created keep created_by (the user row stays).
 */
async function removeMember(teamId, userId, { reassignTo = null, authorize }) {
  return pool.withTransaction(async (conn) => {
    const target = await lockMembership(conn, teamId, userId);
    if (!target) return null;
    authorize(target);

    if (target.role === 'admin' && (await countAdmins(conn, teamId)) <= 1) {
      throw new AppError(409, 'Cannot remove the last admin of the team');
    }
    if (reassignTo !== null) {
      if (reassignTo === userId) throw new AppError(400, 'Validation failed', { reassignTo: 'Cannot reassign tasks to the member being removed' });
      const [ok] = await conn.query('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, reassignTo]);
      if (!ok.length) throw new AppError(400, 'Validation failed', { reassignTo: 'Reassignment target must be a member of your team' });
    }
    const [moved] = await conn.query('UPDATE tasks SET assigned_to = ? WHERE team_id = ? AND assigned_to = ?', [reassignTo, teamId, userId]);
    await conn.query('DELETE FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
    return { tasksReassigned: reassignTo ? moved.affectedRows : 0, tasksUnassigned: reassignTo ? 0 : moved.affectedRows };
  });
}

module.exports = { getTeamOverview, listMembers, getMember, addMember, updateMember, removeMember };
