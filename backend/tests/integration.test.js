/**
 * End-to-end tests against a real MySQL database (no mocks).
 * Opt-in: DB_TESTS=1 npm test  — uses the credentials in .env and DB_NAME
 * (point it at a throwaway database; the test users are deleted afterwards).
 */
require('dotenv').config();
process.env.NODE_ENV = 'test';

const run = process.env.DB_TESTS === '1' ? describe : describe.skip;

run('Integration (real MySQL)', () => {
  const request = require('supertest');
  const app = require('../app');
  const pool = require('../config/db');
  const stamp = Date.now();
  const emails = [`alice${stamp}@test.com`, `bob${stamp}@test.com`];
  let alice;
  let bob;

  const signup = async (name, email) => {
    const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
    expect(res.status).toBe(201);
    return { Authorization: `Bearer ${res.body.token}` };
  };

  beforeAll(async () => {
    alice = await signup('Alice', emails[0]);
    bob = await signup('Bob', emails[1]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email IN (?, ?)', emails); // cascades to tasks
    await pool.end();
  });

  it('supports full CRUD, filtering, search and pagination', async () => {
    for (const [title, status, priority] of [
      ['Website redesign', 'todo', 'high'],
      ['Website copy', 'done', 'low'],
      ['Write 50% report', 'in-progress', 'medium'],
    ]) {
      const r = await request(app).post('/api/tasks').set(alice).send({ title, status, priority, due_date: '2026-12-01' });
      expect(r.status).toBe(201);
      expect(r.body.due_date).toBe('2026-12-01');
    }

    const filtered = await request(app).get('/api/tasks?status=todo&priority=high&search=website').set(alice);
    expect(filtered.body.totalTasks).toBe(1);
    expect(filtered.body.tasks[0].title).toBe('Website redesign');

    // LIKE wildcards are escaped: "%" only matches a literal percent sign
    const pct = await request(app).get('/api/tasks?search=%25').set(alice);
    expect(pct.body.tasks.map((t) => t.title)).toEqual(['Write 50% report']);

    const page2 = await request(app).get('/api/tasks?page=2&limit=2').set(alice);
    expect(page2.body).toMatchObject({ currentPage: 2, totalPages: 2, totalTasks: 3 });
    expect(page2.body.tasks).toHaveLength(1);

    const id = filtered.body.tasks[0].id;
    const upd = await request(app).put(`/api/tasks/${id}`).set(alice).send({ status: 'done' });
    expect(upd.status).toBe(200);
    expect(upd.body.status).toBe('done');

    const stats = await request(app).get('/api/tasks/stats').set(alice);
    expect(stats.body).toEqual({ total: 3, todo: 0, 'in-progress': 1, done: 2 });

    expect((await request(app).delete(`/api/tasks/${id}`).set(alice)).status).toBe(200);
    expect((await request(app).get(`/api/tasks/${id}`).set(alice)).status).toBe(404);
  });

  it("prevents a user from reading, updating or deleting another user's task", async () => {
    const { body: task } = await request(app).post('/api/tasks').set(alice).send({ title: 'Private' });

    expect((await request(app).get(`/api/tasks/${task.id}`).set(bob)).status).toBe(404);
    expect((await request(app).put(`/api/tasks/${task.id}`).set(bob).send({ title: 'Hacked' })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${task.id}`).set(bob)).status).toBe(404);
    expect((await request(app).get('/api/tasks').set(bob)).body.totalTasks).toBe(0);

    const still = await request(app).get(`/api/tasks/${task.id}`).set(alice);
    expect(still.body.title).toBe('Private');
  });
});
