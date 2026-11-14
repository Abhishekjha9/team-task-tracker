/** Analytics correctness + isolation (real MySQL; DB_TESTS=1). */
const run = process.env.DB_TESTS === '1' ? describe : describe.skip;

run('Analytics', () => {
  const { request, app, createTeam, createTask } = require('./helpers');
  const pool = require('../config/db');
  let t;
  let other;
  const get = (actor, path) => request(app).get(`/api/analytics/${path}`).set(actor.auth);

  beforeAll(async () => {
    t = await createTeam('An');
    other = await createTeam('Noise');
    // Known dataset for team t: 6 tasks.
    await createTask(t.admin, { title: 'a', status: 'todo', assigned_to: t.member.id });
    await createTask(t.admin, { title: 'b', status: 'in-progress', assigned_to: t.member.id });
    await createTask(t.admin, { title: 'c', status: 'done', assigned_to: t.member.id });
    await createTask(t.admin, { title: 'd', status: 'done', assigned_to: t.manager.id });
    await createTask(t.admin, { title: 'e', status: 'todo' }); // unassigned
    await createTask(t.admin, { title: 'f', status: 'todo', assigned_to: t.member2.id, due_date: '2020-01-01' }); // overdue
    // Noise in another team that must never leak in.
    for (const s of ['todo', 'done', 'done', 'in-progress']) await createTask(other.admin, { title: 'x', status: s, assigned_to: other.member.id });
  });
  afterAll(() => pool.end());

  it('overview: correct totals, status counts and assigned/unassigned counts', async () => {
    const res = await get(t.admin, 'overview');
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe('team');
    expect(res.body.data).toEqual({ total: 6, todo: 3, inProgress: 1, done: 2, assigned: 5, unassigned: 1, overdue: 1 });
  });

  it('task-distribution: status and assignment are separate breakdowns with percentages', async () => {
    const { body } = await get(t.manager, 'task-distribution');
    expect(body.data.total).toBe(6);
    expect(body.data.status).toEqual([
      { status: 'todo', label: 'To Do', count: 3, percentage: 50 },
      { status: 'in-progress', label: 'In Progress', count: 1, percentage: 16.7 },
      { status: 'done', label: 'Completed', count: 2, percentage: 33.3 },
    ]);
    expect(body.data.assignment).toEqual([
      { key: 'assigned', label: 'Assigned', count: 5, percentage: 83.3 },
      { key: 'unassigned', label: 'Unassigned', count: 1, percentage: 16.7 },
    ]);
    // assignment is independent of status: 2 of the 3 To Do tasks are assigned
    expect(body.data.assignmentByStatus).toEqual([
      { status: 'todo', label: 'To Do', assigned: 2, unassigned: 1 },
      { status: 'in-progress', label: 'In Progress', assigned: 1, unassigned: 0 },
      { status: 'done', label: 'Completed', assigned: 2, unassigned: 0 },
    ]);
  });

  it('team-workload: per-member assigned counts, only for this team', async () => {
    const { body } = await get(t.admin, 'team-workload');
    const byId = Object.fromEntries(body.data.map((r) => [r.userId, r]));
    expect(body.data).toHaveLength(4); // admin, manager, member, member2 — nobody from other team
    expect(byId[t.member.id]).toMatchObject({ total: 3, todo: 1, inProgress: 1, done: 1 });
    expect(byId[t.manager.id]).toMatchObject({ total: 1, done: 1 });
    expect(byId[t.member2.id]).toMatchObject({ total: 1, todo: 1 });
    expect(byId[t.admin.id]).toMatchObject({ total: 0 });
    expect(body.data[0].userId).toBe(t.member.id); // sorted by load
  });

  it('completion-trends: counts real completions from status history', async () => {
    const before = await get(t.admin, 'completion-trends');
    expect(before.body.data.totalCompleted).toBe(2); // c, d were created as done today
    expect(before.body.data.series).toHaveLength(30);

    const { body: task } = await createTask(t.admin, { title: 'g', status: 'todo', assigned_to: t.member.id });
    await request(app).put(`/api/tasks/${task.id}`).set(t.member.auth).send({ status: 'done' });
    const after = await get(t.admin, 'completion-trends');
    expect(after.body.data.totalCompleted).toBe(3);
    expect(after.body.data.series.at(-1).completed).toBe(3);

    // Reopening a completed task removes it from the trend…
    await request(app).put(`/api/tasks/${task.id}`).set(t.member.auth).send({ status: 'in-progress' });
    expect((await get(t.admin, 'completion-trends')).body.data.totalCompleted).toBe(2);
    // …and completing it again counts it once, not twice.
    await request(app).put(`/api/tasks/${task.id}`).set(t.member.auth).send({ status: 'done' });
    expect((await get(t.admin, 'completion-trends')).body.data.totalCompleted).toBe(3);
  });

  it("members get only their own numbers and can't request team scope", async () => {
    const mine = await get(t.member2, 'overview');
    expect(mine.body.scope).toBe('me');
    expect(mine.body.data).toMatchObject({ total: 1, todo: 1, assigned: 1 });
    expect((await get(t.member2, 'overview?scope=team')).status).toBe(403);
    const wl = await get(t.member2, 'team-workload');
    expect(wl.body.data.map((r) => r.userId)).toEqual([t.member2.id]);
  });

  it("scope=me means tasks I'm responsible for, not everything I created", async () => {
    // The admin created all 7 tasks but is assigned none; only unassigned ones they created count.
    const { body } = await get(t.admin, 'overview?scope=me');
    expect(body.scope).toBe('me');
    expect(body.data).toMatchObject({ total: 1, assigned: 0, unassigned: 1 });
  });

  it('no cross-team leakage: the other team sees only its own data', async () => {
    const { body } = await get(other.admin, 'overview');
    expect(body.data).toMatchObject({ total: 4, todo: 1, inProgress: 1, done: 2 });
  });

  it('respects the date range and validates it', async () => {
    const future = await get(t.admin, 'overview?from=2099-01-01');
    expect(future.body.data.total).toBe(0);
    expect((await get(t.admin, 'overview?from=2026-02-31')).status).toBe(400);
    expect((await get(t.admin, 'overview?from=2026-05-01&to=2026-04-01')).status).toBe(400);
  });
});
