/**
 * Dashboard analytics. Every number is aggregated in MySQL (COUNT/SUM/GROUP BY) and every
 * query is bounded by taskScope(), so results never include another team's data, and
 * members only ever see their own tasks.
 */
const pool = require('../config/db');
const { taskScope, myTasksScope } = require('../utils/permissions');
const { today } = require('../utils/dates');

const STATUSES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'done', label: 'Completed' },
];

/** Scope + optional created_at range (inclusive dates). */
// 'team' (leads only — enforced by the controller) or 'me' (tasks the user is responsible for).
const scoped = (user, scope, alias = 't') => (scope === 'team' ? taskScope(user, { alias, scope }) : myTasksScope(user, alias));

function taskWhere(user, { scope, from, to }, alias = 't') {
  const s = scoped(user, scope, alias);
  const where = [s.sql];
  const params = [...s.params];
  if (from) { where.push(`${alias}.created_at >= ?`); params.push(`${from} 00:00:00`); }
  if (to) { where.push(`${alias}.created_at < ? + INTERVAL 1 DAY`); params.push(`${to} 00:00:00`); }
  return { sql: where.join(' AND '), params };
}

const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0);

async function overview(user, q) {
  const w = taskWhere(user, q);
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(t.status = 'todo'), 0) AS todo,
            COALESCE(SUM(t.status = 'in-progress'), 0) AS inProgress,
            COALESCE(SUM(t.status = 'done'), 0) AS done,
            COALESCE(SUM(t.assigned_to IS NOT NULL), 0) AS assigned,
            COALESCE(SUM(t.assigned_to IS NULL), 0) AS unassigned,
            COALESCE(SUM(t.due_date < CURDATE() AND t.status <> 'done'), 0) AS overdue
     FROM tasks t WHERE ${w.sql}`,
    w.params,
  );
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)]));
}

/** Status and assignment are independent dimensions — returned as two separate breakdowns. */
async function taskDistribution(user, q) {
  const w = taskWhere(user, q);
  const [statusRows] = await pool.query(`SELECT t.status, COUNT(*) AS count FROM tasks t WHERE ${w.sql} GROUP BY t.status`, w.params);
  // Cross-tab: assignment within each status (a task can be assigned AND still To Do).
  const [crossRows] = await pool.query(
    `SELECT t.status, COALESCE(SUM(t.assigned_to IS NOT NULL), 0) AS assigned, COALESCE(SUM(t.assigned_to IS NULL), 0) AS unassigned
     FROM tasks t WHERE ${w.sql} GROUP BY t.status`,
    w.params,
  );
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.count)]));
  const cross = Object.fromEntries(crossRows.map((r) => [r.status, { assigned: Number(r.assigned), unassigned: Number(r.unassigned) }]));
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const assigned = Object.values(cross).reduce((a, c) => a + c.assigned, 0);
  const unassigned = Object.values(cross).reduce((a, c) => a + c.unassigned, 0);
  return {
    total,
    status: STATUSES.map(({ key, label }) => ({ status: key, label, count: byStatus[key] || 0, percentage: pct(byStatus[key] || 0, total) })),
    assignment: [
      { key: 'assigned', label: 'Assigned', count: assigned, percentage: pct(assigned, total) },
      { key: 'unassigned', label: 'Unassigned', count: unassigned, percentage: pct(unassigned, total) },
    ],
    assignmentByStatus: STATUSES.map(({ key, label }) => ({ status: key, label, assigned: cross[key]?.assigned || 0, unassigned: cross[key]?.unassigned || 0 })),
  };
}

/** Tasks assigned to each team member, by status (scope 'me' -> just the caller). */
async function teamWorkload(user, q) {
  const params = [];
  let dateSql = '';
  if (q.from) { dateSql += ' AND t.created_at >= ?'; params.push(`${q.from} 00:00:00`); }
  if (q.to) { dateSql += ' AND t.created_at < ? + INTERVAL 1 DAY'; params.push(`${q.to} 00:00:00`); }
  params.push(user.teamId);
  let memberSql = '';
  if (q.scope === 'me') { memberSql = ' AND tm.user_id = ?'; params.push(user.id); }

  const [rows] = await pool.query(
    `SELECT u.id, u.name, tm.role,
            COUNT(t.id) AS total,
            COALESCE(SUM(t.status = 'todo'), 0) AS todo,
            COALESCE(SUM(t.status = 'in-progress'), 0) AS inProgress,
            COALESCE(SUM(t.status = 'done'), 0) AS done
     FROM team_members tm
     JOIN users u ON u.id = tm.user_id
     LEFT JOIN tasks t ON t.assigned_to = tm.user_id AND t.team_id = tm.team_id${dateSql}
     WHERE tm.team_id = ?${memberSql}
     GROUP BY u.id, u.name, tm.role
     ORDER BY total DESC, u.name`,
    params,
  );
  return rows.map((r) => ({
    userId: r.id, name: r.name, role: r.role,
    total: Number(r.total), todo: Number(r.todo), inProgress: Number(r.inProgress), done: Number(r.done),
  }));
}

/**
 * Completions per day, from task_status_history. A task counts only while it is CURRENTLY
 * done, on the date of its most recent move into 'done' — so reopening a task removes it from
 * the trend, and completing it again counts it once, on the new date. Missing days are 0.
 */
async function completionTrends(user, { scope, from, to }) {
  const end = to || today();
  const s = scoped(user, scope);
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(c.completed_at, '%Y-%m-%d') AS day, COUNT(*) AS completed
     FROM (
       SELECT h.task_id, MAX(h.changed_at) AS completed_at
       FROM task_status_history h
       JOIN tasks t ON t.id = h.task_id
       WHERE h.to_status = 'done' AND t.status = 'done' AND h.team_id = ? AND ${s.sql}
       GROUP BY h.task_id
     ) c
     WHERE c.completed_at >= ? AND c.completed_at < ? + INTERVAL 1 DAY
     GROUP BY day ORDER BY day`,
    [user.teamId, ...s.params, `${from} 00:00:00`, `${end} 00:00:00`],
  );
  const byDay = Object.fromEntries(rows.map((r) => [r.day, Number(r.completed)]));
  const series = [];
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d = new Date(d.getTime() + 86400000)) {
    const day = d.toISOString().slice(0, 10);
    series.push({ date: day, completed: byDay[day] || 0 });
  }
  const [[first]] = await pool.query('SELECT MIN(changed_at) AS since FROM task_status_history WHERE team_id = ?', [user.teamId]);
  return { from, to: end, series, totalCompleted: series.reduce((a, p) => a + p.completed, 0), trackingSince: first.since };
}

module.exports = { overview, taskDistribution, teamWorkload, completionTrends };
