/** Task assignment + role-based task permissions (real MySQL; DB_TESTS=1). */
const run = process.env.DB_TESTS === '1' ? describe : describe.skip;

run('Task assignment', () => {
  const { request, app, createTeam, createTask, signup } = require('./helpers');
  const pool = require('../config/db');
  let t; // { admin, manager, member, member2 }
  let outsider;

  beforeAll(async () => {
    t = await createTeam('Asg');
    outsider = await signup('Outsider');
  });
  afterAll(() => pool.end());

  it('creates an assigned task and returns assignee + creator details', async () => {
    const res = await createTask(t.admin, { title: 'Write spec', assigned_to: t.member.id });
    expect(res.status).toBe(201);
    expect(res.body.assignee).toEqual({ id: t.member.id, name: t.member.name, email: t.member.email });
    expect(res.body.creator).toMatchObject({ id: t.admin.id });
    expect(res.body.created_by).toBe(t.admin.id);
  });

  it("changes a task's assignee and can unassign it", async () => {
    const { body: task } = await createTask(t.manager, { title: 'Reassign me', assigned_to: t.member.id });
    const moved = await request(app).put(`/api/tasks/${task.id}`).set(t.manager.auth).send({ assigned_to: t.member2.id });
    expect(moved.status).toBe(200);
    expect(moved.body.assignee.id).toBe(t.member2.id);

    const cleared = await request(app).put(`/api/tasks/${task.id}`).set(t.manager.auth).send({ assigned_to: null });
    expect(cleared.body.assignee).toBeNull();
  });

  it('filters by assignee, assignment status and creator', async () => {
    const { body: a } = await createTask(t.admin, { title: 'For member2 A', assigned_to: t.member2.id });
    const { body: b } = await createTask(t.admin, { title: 'For member2 B', assigned_to: t.member2.id });
    await createTask(t.admin, { title: 'Nobody' });

    const byAssignee = await request(app).get(`/api/tasks?assignedTo=${t.member2.id}&limit=100`).set(t.admin.auth);
    const ids = byAssignee.body.tasks.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining([a.id, b.id]));
    expect(byAssignee.body.tasks.every((x) => x.assigned_to === t.member2.id)).toBe(true);

    const unassigned = await request(app).get('/api/tasks?assignmentStatus=unassigned&limit=100').set(t.admin.auth);
    expect(unassigned.body.totalTasks).toBeGreaterThan(0);
    expect(unassigned.body.tasks.every((x) => x.assigned_to === null)).toBe(true);

    const assigned = await request(app).get('/api/tasks?assignmentStatus=assigned&limit=100').set(t.admin.auth);
    expect(assigned.body.tasks.every((x) => x.assigned_to !== null)).toBe(true);

    const mine = await request(app).get('/api/tasks?createdBy=me&limit=100').set(t.manager.auth);
    expect(mine.body.tasks.every((x) => x.created_by === t.manager.id)).toBe(true);
  });

  it('rejects assignment to users outside the team (or nonexistent)', async () => {
    const res = await createTask(t.admin, { title: 'Bad', assigned_to: outsider.id });
    expect(res.status).toBe(400);
    expect(res.body.errors.assigned_to).toMatch(/member of your team/);

    expect((await createTask(t.admin, { title: 'Bad', assigned_to: 99999999 })).status).toBe(400);

    const { body: task } = await createTask(t.admin, { title: 'Mine' });
    const upd = await request(app).put(`/api/tasks/${task.id}`).set(t.admin.auth).send({ assigned_to: outsider.id });
    expect(upd.status).toBe(400);
  });

  it('lets members create tasks for themselves but not assign others', async () => {
    const self = await createTask(t.member, { title: 'My own', assigned_to: t.member.id });
    expect(self.status).toBe(201);
    const other = await createTask(t.member, { title: 'For someone else', assigned_to: t.member2.id });
    expect(other.status).toBe(403);
  });

  it('members see only tasks assigned to/created by them and may only change status of assigned ones', async () => {
    const { body: assigned } = await createTask(t.admin, { title: 'Admin -> member', assigned_to: t.member.id });
    const { body: hidden } = await createTask(t.admin, { title: 'Admin -> member2', assigned_to: t.member2.id });

    const list = await request(app).get('/api/tasks?limit=100').set(t.member.auth);
    expect(list.body.tasks.every((x) => x.assigned_to === t.member.id || x.created_by === t.member.id)).toBe(true);
    expect((await request(app).get(`/api/tasks/${hidden.id}`).set(t.member.auth)).status).toBe(404);

    const got = await request(app).get(`/api/tasks/${assigned.id}`).set(t.member.auth);
    expect(got.body.permissions).toEqual({ canEdit: false, canDelete: false, canAssign: false, canChangeStatus: true });

    expect((await request(app).put(`/api/tasks/${assigned.id}`).set(t.member.auth).send({ status: 'in-progress' })).status).toBe(200);
    expect((await request(app).put(`/api/tasks/${assigned.id}`).set(t.member.auth).send({ title: 'Renamed' })).status).toBe(403);
    expect((await request(app).put(`/api/tasks/${assigned.id}`).set(t.member.auth).send({ assigned_to: t.member2.id })).status).toBe(403);
    expect((await request(app).delete(`/api/tasks/${assigned.id}`).set(t.member.auth)).status).toBe(403);
  });

  it('managers edit team tasks but only admins delete tasks they did not create', async () => {
    const { body: task } = await createTask(t.admin, { title: 'Admin task' });
    expect((await request(app).put(`/api/tasks/${task.id}`).set(t.manager.auth).send({ title: 'Edited by manager' })).status).toBe(200);
    expect((await request(app).delete(`/api/tasks/${task.id}`).set(t.manager.auth)).status).toBe(403);
    expect((await request(app).delete(`/api/tasks/${task.id}`).set(t.admin.auth)).status).toBe(200);
  });
});
