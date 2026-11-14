/**
 * End-to-end CRUD tests against a real MySQL database (no mocks).
 * Opt-in: DB_TESTS=1 npm test  — runs against <DB_NAME>_test, recreated each run.
 */
const run = process.env.DB_TESTS === '1' ? describe : describe.skip;

run('Integration: CRUD, filters, isolation (real MySQL)', () => {
  const { request, app, signup } = require('./helpers');
  const pool = require('../config/db');
  let alice;
  let bob;

  beforeAll(async () => {
    alice = await signup('Alice'); // each signup gets their own team
    bob = await signup('Bob');
  });
  afterAll(() => pool.end());

  it('supports full CRUD, filtering, search and pagination', async () => {
    for (const [title, status, priority] of [
      ['Website redesign', 'todo', 'high'],
      ['Website copy', 'done', 'low'],
      ['Write 50% report', 'in-progress', 'medium'],
    ]) {
      const r = await request(app).post('/api/tasks').set(alice.auth).send({ title, status, priority, due_date: '2026-12-01' });
      expect(r.status).toBe(201);
      expect(r.body.due_date).toBe('2026-12-01');
      expect(r.body.creator).toMatchObject({ id: alice.id, name: 'Alice' });
      expect(r.body.assignee).toBeNull();
    }

    const filtered = await request(app).get('/api/tasks?status=todo&priority=high&search=website').set(alice.auth);
    expect(filtered.body.totalTasks).toBe(1);
    expect(filtered.body.tasks[0].title).toBe('Website redesign');

    // LIKE wildcards are escaped: "%" only matches a literal percent sign
    const pct = await request(app).get('/api/tasks?search=%25').set(alice.auth);
    expect(pct.body.tasks.map((t) => t.title)).toEqual(['Write 50% report']);

    const page2 = await request(app).get('/api/tasks?page=2&limit=2').set(alice.auth);
    expect(page2.body).toMatchObject({ currentPage: 2, totalPages: 2, totalTasks: 3 });
    expect(page2.body.tasks).toHaveLength(1);

    const id = filtered.body.tasks[0].id;
    const upd = await request(app).put(`/api/tasks/${id}`).set(alice.auth).send({ status: 'done' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('done');

    const stats = await request(app).get('/api/tasks/stats').set(alice.auth);
    expect(stats.body).toEqual({ total: 3, todo: 0, 'in-progress': 1, done: 2 });

    expect((await request(app).delete(`/api/tasks/${id}`).set(alice.auth)).status).toBe(200);
    expect((await request(app).get(`/api/tasks/${id}`).set(alice.auth)).status).toBe(404);
  });

  it("prevents a user in another team from reading, updating or deleting a task", async () => {
    const { body: task } = await request(app).post('/api/tasks').set(alice.auth).send({ title: 'Private' });

    expect((await request(app).get(`/api/tasks/${task.id}`).set(bob.auth)).status).toBe(404);
    expect((await request(app).put(`/api/tasks/${task.id}`).set(bob.auth).send({ title: 'Hacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${task.id}`).set(bob.auth)).status).toBe(404);
    expect((await request(app).get('/api/tasks').set(bob.auth)).body.totalTasks).toBe(0);

    const still = await request(app).get(`/api/tasks/${task.id}`).set(alice.auth);
    expect(still.body.title).toBe('Private');
  });

  it('ignores team_id / created_by smuggled in the request body', async () => {
    const r = await request(app).post('/api/tasks').set(bob.auth).send({ title: 'Mine', team_id: alice.teamId, created_by: alice.id });
    expect(r.status).toBe(201);
    expect(r.body.team_id).toBe(bob.teamId);
    expect(r.body.created_by).toBe(bob.id);
  });
});
