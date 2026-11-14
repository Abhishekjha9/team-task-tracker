/**
 * 002: teams, roles, task assignment and status history.
 *
 * MySQL DDL auto-commits, so this migration can't be one transaction. Instead every
 * step checks the current state first, which makes it safe to re-run after a partial
 * failure. Data steps (team backfill, task mapping) run inside transactions.
 *
 * Data mapping for existing rows:
 *  - Each existing user gets their own team ("<name>'s Team") and is its admin. We do
 *    NOT pool all users into one team: their tasks were private and must stay private.
 *  - tasks.user_id -> created_by AND assigned_to (the previous owner did both roles),
 *    team_id = that user's team. user_id is dropped only after every row is mapped.
 */
const { columnExists, indexExists, foreignKeyExists, tableExists } = require('../scripts/schemaHelpers');

exports.up = async (conn) => {
  // 1. Track logins so the Team page can report "active" members.
  if (!(await columnExists(conn, 'users', 'last_login_at'))) {
    await conn.query('ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER password');
  }

  // 2. Teams and memberships. UNIQUE(user_id) = one team per user (initial scope).
  await conn.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name        VARCHAR(100) NOT NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS team_members (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      team_id    INT UNSIGNED NOT NULL,
      user_id    INT UNSIGNED NOT NULL,
      role       ENUM('admin','manager','member') NOT NULL DEFAULT 'member',
      joined_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_team_members_user (user_id),
      KEY idx_team_members_team_role (team_id, role),
      CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

  // 3. Give every user without a team their own team, as admin.
  await conn.beginTransaction();
  try {
    const [orphans] = await conn.query(
      `SELECT u.id, u.name, u.created_at FROM users u
       LEFT JOIN team_members tm ON tm.user_id = u.id
       WHERE tm.id IS NULL FOR UPDATE`,
    );
    for (const u of orphans) {
      const [team] = await conn.query('INSERT INTO teams (name, created_at) VALUES (?, ?)', [`${u.name}'s Team`, u.created_at]);
      await conn.query(
        "INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
        [team.insertId, u.id, u.created_at],
      );
    }
    await conn.commit();
    if (orphans.length) console.log(`  created a personal team for ${orphans.length} existing user(s)`);
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  // 4. New task columns (nullable while we backfill).
  if (!(await columnExists(conn, 'tasks', 'team_id'))) {
    await conn.query(`ALTER TABLE tasks
      ADD COLUMN team_id INT UNSIGNED NULL AFTER id,
      ADD COLUMN created_by INT UNSIGNED NULL AFTER team_id,
      ADD COLUMN assigned_to INT UNSIGNED NULL AFTER created_by`);
  }

  // 5. Map existing ownership (only while the legacy column still exists).
  if (await columnExists(conn, 'tasks', 'user_id')) {
    await conn.beginTransaction();
    try {
      const [res] = await conn.query(
        `UPDATE tasks t JOIN team_members tm ON tm.user_id = t.user_id
         SET t.team_id = tm.team_id, t.created_by = t.user_id, t.assigned_to = t.user_id
         WHERE t.team_id IS NULL`,
      );
      await conn.commit();
      if (res.affectedRows) console.log(`  mapped ${res.affectedRows} existing task(s) to created_by/assigned_to`);
    } catch (err) {
      await conn.rollback();
      throw err;
    }
  }

  // 6. Refuse to continue if anything is unmapped — never drop data we couldn't place.
  const [[{ unmapped }]] = await conn.query('SELECT COUNT(*) AS unmapped FROM tasks WHERE team_id IS NULL');
  if (unmapped > 0) throw new Error(`${unmapped} task(s) could not be mapped to a team; aborting before schema changes`);

  // 7. Constraints + indexes for the new model.
  await conn.query('ALTER TABLE tasks MODIFY team_id INT UNSIGNED NOT NULL');
  const fks = [
    ['fk_tasks_team', 'FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE'],
    // Users are never hard-deleted by the app; SET NULL keeps tasks if one ever is.
    ['fk_tasks_created_by', 'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'],
    ['fk_tasks_assigned_to', 'FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL'],
  ];
  const indexes = [
    ['idx_tasks_team_created', '(team_id, created_at)'],
    ['idx_tasks_team_status', '(team_id, status)'],
    ['idx_tasks_team_priority', '(team_id, priority)'],
    ['idx_tasks_assignee_status', '(assigned_to, status)'],
    ['idx_tasks_created_by', '(created_by)'],
  ];
  for (const [name, def] of indexes) {
    if (!(await indexExists(conn, 'tasks', name))) await conn.query(`ALTER TABLE tasks ADD KEY ${name} ${def}`);
  }
  for (const [name, def] of fks) {
    if (!(await foreignKeyExists(conn, 'tasks', name))) await conn.query(`ALTER TABLE tasks ADD CONSTRAINT ${name} ${def}`);
  }

  // 8. Retire the legacy owner column (its data now lives in created_by/assigned_to).
  if (await foreignKeyExists(conn, 'tasks', 'fk_tasks_user')) await conn.query('ALTER TABLE tasks DROP FOREIGN KEY fk_tasks_user');
  for (const name of ['idx_tasks_user_created', 'idx_tasks_user_status', 'idx_tasks_user_priority']) {
    if (await indexExists(conn, 'tasks', name)) await conn.query(`ALTER TABLE tasks DROP INDEX ${name}`);
  }
  if (await columnExists(conn, 'tasks', 'user_id')) await conn.query('ALTER TABLE tasks DROP COLUMN user_id');

  // 9. Status history powers the completion-trend chart. Starts empty: we don't know
  //    when pre-existing tasks were completed, so we don't fabricate it.
  if (!(await tableExists(conn, 'task_status_history'))) {
    await conn.query(`
      CREATE TABLE task_status_history (
        id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        task_id      INT UNSIGNED NOT NULL,
        team_id      INT UNSIGNED NOT NULL,
        from_status  ENUM('todo','in-progress','done') NULL,
        to_status    ENUM('todo','in-progress','done') NOT NULL,
        changed_by   INT UNSIGNED NULL,
        changed_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_history_team_status_time (team_id, to_status, changed_at),
        KEY idx_history_task (task_id),
        CONSTRAINT fk_history_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_history_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB`);
  }
};
