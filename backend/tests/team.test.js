/** Team management + RBAC (real MySQL; DB_TESTS=1). */
const run = process.env.DB_TESTS === '1' ? describe : describe.skip;

run('Team management', () => {
  const { request, app, createTeam, signup, login, addMember, createTask } = require('./helpers');
  const pool = require('../config/db');
  let t;

  beforeAll(async () => {
    t = await createTeam('Tm');
  });
  afterAll(() => pool.end());

  const email = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

  it('admin can add a member; password is bcrypt-hashed and they can log in', async () => {
    const e = email('new');
    const res = await request(app).post('/api/team/members').set(t.admin.auth).send({ name: 'New Person', email: e, role: 'member', password: 'hunter22' });
    expect(res.status).toBe(201);
    expect(res.body.member).toMatchObject({ name: 'New Person', email: e, role: 'member' });
    expect(res.body.temporaryPassword).toBeUndefined();

    const [[row]] = await pool.query('SELECT password FROM users WHERE email = ?', [e]);
    expect(row.password).toMatch(/^\$2[aby]\$10\$/);
    const li = await login(e, 'hunter22');
    expect(li.status).toBe(200);
    expect(li.body.user.team.id).toBe(t.admin.teamId);

    const list = await request(app).get('/api/team/members').set(t.admin.auth);
    expect(list.body.members.map((m) => m.email)).toContain(e);
  });

  it('generates a temporary password when none is given', async () => {
    const e = email('temp');
    const res = await request(app).post('/api/team/members').set(t.admin.auth).send({ name: 'Temp', email: e, role: 'member' });
    expect(res.status).toBe(201);
    expect(res.body.temporaryPassword).toHaveLength(12);
    expect((await login(e, res.body.temporaryPassword)).status).toBe(200);
  });

  it('rejects duplicate emails (409), including existing accounts in other teams', async () => {
    const dup = await request(app).post('/api/team/members').set(t.admin.auth).send({ name: 'Dup', email: t.member.email, role: 'member' });
    expect(dup.status).toBe(409);
    const other = await signup('Elsewhere');
    const dup2 = await request(app).post('/api/team/members').set(t.admin.auth).send({ name: 'Dup', email: other.email.toUpperCase(), role: 'member' });
    expect(dup2.status).toBe(409);
  });

  it('admin can change member roles, effective on the next request', async () => {
    const p = await addMember(t.admin, 'member', 'Promotee');
    const res = await request(app).put(`/api/team/members/${p.id}`).set(t.admin.auth).send({ role: 'manager' });
    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('manager');
    const me = await request(app).get('/api/auth/me').set(p.auth); // same token, new role
    expect(me.body.user.role).toBe('manager');
  });

  it('regular members cannot add, edit or remove users', async () => {
    expect((await request(app).post('/api/team/members').set(t.member.auth).send({ name: 'X', email: email('x'), role: 'member' })).status).toBe(403);
    expect((await request(app).put(`/api/team/members/${t.member2.id}`).set(t.member.auth).send({ role: 'admin' })).status).toBe(403);
    expect((await request(app).delete(`/api/team/members/${t.member2.id}`).set(t.member.auth)).status).toBe(403);
    // and can't promote themselves
    expect((await request(app).put(`/api/team/members/${t.member.id}`).set(t.member.auth).send({ role: 'admin' })).status).toBe(403);
  });

  it('managers cannot remove admins, edit admins, or grant admin', async () => {
    expect((await request(app).delete(`/api/team/members/${t.admin.id}`).set(t.manager.auth)).status).toBe(403);
    expect((await request(app).put(`/api/team/members/${t.admin.id}`).set(t.manager.auth).send({ name: 'Hacked' })).status).toBe(403);
    expect((await request(app).put(`/api/team/members/${t.member2.id}`).set(t.manager.auth).send({ role: 'admin' })).status).toBe(403);
    expect((await request(app).post('/api/team/members').set(t.manager.auth).send({ name: 'A', email: email('a'), role: 'admin' })).status).toBe(403);
    // but can add regular members
    expect((await request(app).post('/api/team/members').set(t.manager.auth).send({ name: 'M', email: email('m'), role: 'member' })).status).toBe(201);
  });

  it('never leaves a team without an admin', async () => {
    const solo = await signup('Solo');
    expect((await request(app).put(`/api/team/members/${solo.id}`).set(solo.auth).send({ role: 'member' })).status).toBe(409);
    expect((await request(app).delete(`/api/team/members/${solo.id}`).set(solo.auth)).status).toBe(400); // can't remove self
  });

  it("removing a member reassigns or unassigns their tasks — never deletes them", async () => {
    const leaving = await addMember(t.admin, 'member', 'Leaving');
    const { body: t1 } = await createTask(t.admin, { title: 'L1', assigned_to: leaving.id });
    const { body: t2 } = await createTask(t.admin, { title: 'L2', assigned_to: leaving.id });
    const { body: created } = await createTask(leaving, { title: 'Created by leaver' });

    const res = await request(app).delete(`/api/team/members/${leaving.id}`).set(t.admin.auth).send({ reassignTo: t.member2.id });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ tasksReassigned: 2, tasksUnassigned: 0 });

    for (const id of [t1.id, t2.id]) {
      const r = await request(app).get(`/api/tasks/${id}`).set(t.admin.auth);
      expect(r.body.assignee.id).toBe(t.member2.id);
    }
    const kept = await request(app).get(`/api/tasks/${created.id}`).set(t.admin.auth);
    expect(kept.status).toBe(200);
    expect(kept.body.creator.name).toBe('Leaving'); // creator still shown

    // the removed user can no longer use their token or log in
    expect((await request(app).get('/api/tasks').set(leaving.auth)).status).toBe(401);
    expect((await login(leaving.email)).status).toBe(403);
  });

  it('removing without a target leaves tasks unassigned', async () => {
    const leaving = await addMember(t.admin, 'member', 'Leaving2');
    const { body: task } = await createTask(t.admin, { title: 'Orphan', assigned_to: leaving.id });
    const res = await request(app).delete(`/api/team/members/${leaving.id}`).set(t.admin.auth);
    expect(res.body).toMatchObject({ tasksReassigned: 0, tasksUnassigned: 1 });
    const r = await request(app).get(`/api/tasks/${task.id}`).set(t.admin.auth);
    expect(r.status).toBe(200);
    expect(r.body.assignee).toBeNull();
  });

  it('cannot see or manage members of another team', async () => {
    const other = await signup('OtherAdmin');
    expect((await request(app).get(`/api/team/members/${t.member.id}`).set(other.auth)).status).toBe(404);
    expect((await request(app).put(`/api/team/members/${t.member.id}`).set(other.auth).send({ role: 'manager' })).status).toBe(404);
    expect((await request(app).delete(`/api/team/members/${t.member.id}`).set(other.auth)).status).toBe(404);
    const list = await request(app).get('/api/team/members').set(other.auth);
    expect(list.body.members.map((m) => m.id)).toEqual([other.id]);
  });

  it('members see the roster without workload stats; leads see stats', async () => {
    const asMember = await request(app).get('/api/team/members').set(t.member.auth);
    expect(asMember.body.members[0].stats).toBeUndefined();
    const asAdmin = await request(app).get('/api/team/members').set(t.admin.auth);
    expect(asAdmin.body.members[0].stats).toEqual(expect.objectContaining({ total: expect.any(Number), completionRate: expect.any(Number) }));
  });
});
