const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { taskScope, taskPermissions, canAssignTo } = require('../utils/permissions');

// Task + assignee + creator in one round trip.
const SELECT_TASK = `
  SELECT t.id, t.team_id, t.title, t.description, t.status, t.priority, t.due_date,
         t.created_by, t.assigned_to, t.created_at, t.updated_at,
         a.name AS assignee_name, a.email AS assignee_email,
         c.name AS creator_name, c.email AS creator_email
  FROM tasks t
  LEFT JOIN users a ON a.id = t.assigned_to
  LEFT JOIN users c ON c.id = t.created_by`;

// Only these columns may ever be written by an update — prevents team_id/created_by tampering.
const UPDATABLE = ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to'];

// Escape LIKE wildcards so a search for "50%" matches literally.
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Shapes a joined row into the API representation, including what the caller may do with it. */
function present(row, user) {
  const { assignee_name, assignee_email, creator_name, creator_email, ...task } = row;
  return {
    ...task,
    assignee: task.assigned_to ? { id: task.assigned_to, name: assignee_name, email: assignee_email } : null,
    creator: task.created_by ? { id: task.created_by, name: creator_name, email: creator_email } : null,
    permissions: taskPermissions(user, task),
  };
}

async function isTeamMember(teamId, userId, conn = pool) {
  const [rows] = await conn.query('SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?', [teamId, userId]);
  return rows.length > 0;
}

/** Assignee must be null or in the caller's team; members may only assign themselves. */
async function checkAssignee(user, assigneeId, conn) {
  if (assigneeId === null || assigneeId === undefined) return;
  if (!(await isTeamMember(user.teamId, assigneeId, conn))) {
    throw new AppError(400, 'Validation failed', { assigned_to: 'Assignee must be a member of your team' });
  }
  if (!canAssignTo(user, assigneeId)) throw new AppError(403, 'Members can only assign tasks to themselves');
}

const recordStatus = (conn, task, from, to, userId) =>
  conn.query(
    'INSERT INTO task_status_history (task_id, team_id, from_status, to_status, changed_by) VALUES (?, ?, ?, ?, ?)',
    [task.id, task.team_id, from, to, userId],
  );

/**
 * Lists tasks the user may see, with server-side filtering, search and pagination.
 * All values are bound as parameters; only fixed column names are interpolated.
 */
async function listTasks(user, { status, priority, search, assignedTo, assignmentStatus, createdBy, page, limit }) {
  const scope = taskScope(user);
  const where = [scope.sql];
  const params = [...scope.params];

  if (status) { where.push('t.status = ?'); params.push(status); }
  if (priority) { where.push('t.priority = ?'); params.push(priority); }
  if (search) { where.push('t.title LIKE ?'); params.push(`%${escapeLike(search)}%`); }
  if (assignedTo) { where.push('t.assigned_to = ?'); params.push(assignedTo); }
  if (assignmentStatus === 'assigned') where.push('t.assigned_to IS NOT NULL');
  if (assignmentStatus === 'unassigned') where.push('t.assigned_to IS NULL');
  if (createdBy) { where.push('t.created_by = ?'); params.push(createdBy); }

  const whereSql = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tasks t WHERE ${whereSql}`, params);
  const [rows] = await pool.query(
    `${SELECT_TASK} WHERE ${whereSql} ORDER BY t.created_at DESC, t.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    tasks: rows.map((r) => present(r, user)),
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    totalTasks: total,
  };
}

/** Status counts over the tasks the user can see (kept for backwards compatibility). */
async function getStats(user) {
  const scope = taskScope(user);
  const [rows] = await pool.query(`SELECT t.status, COUNT(*) AS count FROM tasks t WHERE ${scope.sql} GROUP BY t.status`, scope.params);
  const stats = { total: 0, todo: 0, 'in-progress': 0, done: 0 };
  for (const { status, count } of rows) {
    stats[status] = Number(count);
    stats.total += Number(count);
  }
  return stats;
}

// Visibility is enforced in SQL: a task outside the caller's scope is indistinguishable from a missing one.
async function findVisible(user, id, conn = pool, { lock = false } = {}) {
  const scope = taskScope(user);
  const [rows] = await conn.query(`${SELECT_TASK} WHERE t.id = ? AND ${scope.sql}${lock ? ' FOR UPDATE' : ''}`, [id, ...scope.params]);
  return rows[0] || null;
}

async function getTaskById(user, id) {
  const row = await findVisible(user, id);
  return row ? present(row, user) : null;
}

async function createTask(user, data) {
  return pool.withTransaction(async (conn) => {
    const assignedTo = data.assigned_to ?? null;
    await checkAssignee(user, assignedTo, conn);
    const status = data.status || 'todo';
    const [result] = await conn.query(
      `INSERT INTO tasks (team_id, created_by, assigned_to, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.teamId, user.id, assignedTo, data.title, data.description ?? null, status, data.priority || 'medium', data.due_date ?? null],
    );
    await recordStatus(conn, { id: result.insertId, team_id: user.teamId }, null, status, user.id);
    return present(await findVisible(user, result.insertId, conn), user);
  });
}

/** Returns the updated task, or null if the caller can't see it. Throws 403 for disallowed edits. */
async function updateTask(user, id, data) {
  return pool.withTransaction(async (conn) => {
    const task = await findVisible(user, id, conn, { lock: true });
    if (!task) return null;

    const perms = taskPermissions(user, task);
    const fields = UPDATABLE.filter((k) => data[k] !== undefined);
    if (!perms.canEdit && fields.some((k) => k !== 'status')) {
      throw new AppError(403, 'You can only change the status of tasks assigned to you');
    }
    if (fields.includes('status') && !perms.canChangeStatus) throw new AppError(403, 'You cannot change the status of this task');
    if (fields.includes('assigned_to') && data.assigned_to !== task.assigned_to) {
      if (!perms.canAssign) throw new AppError(403, 'You cannot reassign this task');
      await checkAssignee(user, data.assigned_to, conn);
    }

    await conn.query(
      `UPDATE tasks SET ${fields.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND team_id = ?`,
      [...fields.map((k) => data[k]), id, user.teamId],
    );
    if (data.status && data.status !== task.status) await recordStatus(conn, task, task.status, data.status, user.id);

    // Re-read with the caller's scope; a member who unassigns themselves may lose visibility.
    const updated = await findVisible(user, id, conn);
    return present(updated || { ...task, ...data }, user);
  });
}

/** Returns false if not visible; throws 403 if visible but not deletable. */
async function deleteTask(user, id) {
  const task = await findVisible(user, id);
  if (!task) return false;
  if (!taskPermissions(user, task).canDelete) throw new AppError(403, 'You do not have permission to delete this task');
  const [result] = await pool.query('DELETE FROM tasks WHERE id = ? AND team_id = ?', [id, user.teamId]);
  return result.affectedRows > 0;
}

module.exports = { listTasks, getStats, getTaskById, createTask, updateTask, deleteTask, isTeamMember };
