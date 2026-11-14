const pool = require('../config/db');

const TASK_COLUMNS = 'id, user_id, title, description, status, priority, due_date, created_at, updated_at';
// Only these columns may ever be written by an update — prevents user_id/id tampering.
const UPDATABLE = ['title', 'description', 'status', 'priority', 'due_date'];

// Escape LIKE wildcards so a search for "50%" matches literally.
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Lists a user's tasks with server-side filtering, search and pagination.
 * All values are bound as parameters; only fixed column names are interpolated.
 */
async function listTasks(userId, { status, priority, search, page, limit }) {
  const where = ['user_id = ?'];
  const params = [userId];

  if (status) { where.push('status = ?'); params.push(status); }
  if (priority) { where.push('priority = ?'); params.push(priority); }
  if (search) { where.push('title LIKE ?'); params.push(`%${escapeLike(search)}%`); }

  const whereSql = where.join(' AND ');
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tasks WHERE ${whereSql}`, params);
  const [tasks] = await pool.query(
    `SELECT ${TASK_COLUMNS} FROM tasks WHERE ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    tasks,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    totalTasks: total,
  };
}

async function getStats(userId) {
  const [rows] = await pool.query('SELECT status, COUNT(*) AS count FROM tasks WHERE user_id = ? GROUP BY status', [userId]);
  const stats = { total: 0, todo: 0, 'in-progress': 0, done: 0 };
  for (const { status, count } of rows) {
    stats[status] = Number(count);
    stats.total += Number(count);
  }
  return stats;
}

// Ownership is enforced in SQL: a task belonging to someone else is indistinguishable from a missing one.
async function getTaskById(userId, id) {
  const [rows] = await pool.query(`SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ? AND user_id = ?`, [id, userId]);
  return rows[0] || null;
}

async function createTask(userId, data) {
  const [result] = await pool.query(
    'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, data.title, data.description ?? null, data.status || 'todo', data.priority || 'medium', data.due_date ?? null],
  );
  return getTaskById(userId, result.insertId);
}

async function updateTask(userId, id, data) {
  const fields = UPDATABLE.filter((k) => data[k] !== undefined);
  const setSql = fields.map((k) => `${k} = ?`).join(', ');
  const [result] = await pool.query(
    `UPDATE tasks SET ${setSql} WHERE id = ? AND user_id = ?`,
    [...fields.map((k) => data[k]), id, userId],
  );
  if (result.affectedRows === 0) return null;
  return getTaskById(userId, id);
}

async function deleteTask(userId, id) {
  const [result] = await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
  return result.affectedRows > 0;
}

module.exports = { listTasks, getStats, getTaskById, createTask, updateTask, deleteTask };
