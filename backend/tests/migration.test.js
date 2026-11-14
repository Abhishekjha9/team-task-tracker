/**
 * Applies 001 to a scratch database, inserts legacy single-user data, then runs 002 and
 * checks nothing is lost and ownership is mapped. Also proves re-running is safe.
 */
const run = process.env.DB_TESTS === '1' ? describe : describe.skip;

run('Migration 002 (legacy data)', () => {
  const mysql = require('mysql2/promise');
  const { migrate } = require('../scripts/migrate');
  const db = `${process.env.DB_NAME}_mig`;
  let conn;

  beforeAll(async () => {
    const base = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
    const admin = await mysql.createConnection(base);
    await admin.query(`DROP DATABASE IF EXISTS \`${db}\``);
    await admin.end();
    await migrate({ database: db, only: ['001_initial_schema.sql'], log: () => {} });
    conn = await mysql.createConnection({ ...base, database: db });

    await conn.query("INSERT INTO users (id, name, email, password) VALUES (1,'Ann','ann@x.com','h'), (2,'Ben','ben@x.com','h')");
    await conn.query(`INSERT INTO tasks (user_id, title, status, priority, due_date) VALUES
      (1,'Ann 1','todo','high','2026-01-05'), (1,'Ann 2','done','low',NULL), (2,'Ben 1','in-progress','medium',NULL)`);
  });
  afterAll(async () => {
    await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
    await conn.end();
  });

  it('maps legacy ownership into personal teams without losing tasks', async () => {
    await migrate({ database: db, log: () => {} });

    const [tasks] = await conn.query("SELECT title, status, priority, DATE_FORMAT(due_date,'%Y-%m-%d') due, created_by, assigned_to, team_id FROM tasks ORDER BY id");
    expect(tasks).toHaveLength(3);
    expect(tasks[0]).toMatchObject({ title: 'Ann 1', status: 'todo', priority: 'high', due: '2026-01-05', created_by: 1, assigned_to: 1 });
    expect(tasks[2]).toMatchObject({ title: 'Ben 1', created_by: 2, assigned_to: 2 });
    expect(tasks[0].team_id).toBe(tasks[1].team_id);
    expect(tasks[0].team_id).not.toBe(tasks[2].team_id); // previously private data stays separated

    const [members] = await conn.query('SELECT user_id, role FROM team_members ORDER BY user_id');
    expect(members).toEqual([{ user_id: 1, role: 'admin' }, { user_id: 2, role: 'admin' }]);

    const [[col]] = await conn.query("SELECT COUNT(*) n FROM information_schema.columns WHERE table_schema = ? AND table_name='tasks' AND column_name='user_id'", [db]);
    expect(col.n).toBe(0);
  });

  it('is safe to re-run', async () => {
    await expect(require('../migrations/002_teams_and_assignment').up(conn)).resolves.toBeUndefined();
    const [[{ n }]] = await conn.query('SELECT COUNT(*) n FROM teams');
    expect(n).toBe(2);
    const result = await migrate({ database: db, log: () => {} });
    expect(result.ran).toEqual([]);
  });
});
