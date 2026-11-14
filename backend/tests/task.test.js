/**
 * API tests for auth + task routes. The service (SQL) layer is mocked so these run
 * without a database; they verify routing, JWT protection, validation, status codes,
 * and that every task operation is scoped to the authenticated user loaded by protect().
 */
jest.mock('../services/taskService');
jest.mock('../services/userService');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../app');
const taskService = require('../services/taskService');
const userService = require('../services/userService');

const member = (id, role = 'admin') => ({ id, name: `U${id}`, email: `u${id}@test.com`, teamId: 1, teamName: 'Team', role });
const auth = (id) => ({ Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}` });

beforeEach(() => {
  // protect() resolves the caller's team + role from the DB on every request.
  userService.findWithMembership.mockImplementation(async (id) => member(id));
});
afterEach(() => jest.resetAllMocks());

describe('Auth', () => {
  it('signs up a user with their own team, hashes the password and returns a JWT', async () => {
    userService.findByEmail.mockResolvedValue(null);
    userService.createWithTeam.mockImplementation(async (u) => ({ id: 1, name: u.name, email: u.email }));
    userService.findWithMembership.mockResolvedValue({ id: 1, name: 'Ada', email: 'ada@test.com', teamId: 5, teamName: "Ada's Team", role: 'admin' });

    const res = await request(app).post('/api/auth/signup').send({ name: 'Ada', email: 'ADA@test.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: 1, name: 'Ada', email: 'ada@test.com', role: 'admin', team: { id: 5, name: "Ada's Team" } });
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).id).toBe(1);
    const { passwordHash, teamName } = userService.createWithTeam.mock.calls[0][0];
    expect(teamName).toBe("Ada's Team");
    expect(await bcrypt.compare('secret123', passwordHash)).toBe(true);
  });

  it('rejects signup with invalid data (400) and duplicate email (409)', async () => {
    const bad = await request(app).post('/api/auth/signup').send({ email: 'nope', password: '1' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toHaveProperty('email');

    userService.findByEmail.mockResolvedValue({ id: 9 });
    const dup = await request(app).post('/api/auth/signup').send({ name: 'Ada', email: 'ada@test.com', password: 'secret123' });
    expect(dup.status).toBe(409);
  });

  it('rejects login with wrong password (401)', async () => {
    userService.findByEmail.mockResolvedValue({ id: 1, email: 'a@test.com', password: await bcrypt.hash('right', 4) });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects a valid token whose user no longer belongs to a team (401)', async () => {
    userService.findWithMembership.mockResolvedValue({ ...member(4), teamId: null, role: null });
    const res = await request(app).get('/api/tasks').set(auth(4));
    expect(res.status).toBe(401);
    expect(taskService.listTasks).not.toHaveBeenCalled();
  });
});

describe('Tasks', () => {
  it('requires a valid token (401)', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
    expect((await request(app).get('/api/tasks').set('Authorization', 'Bearer garbage')).status).toBe(401);
    expect(taskService.listTasks).not.toHaveBeenCalled();
  });

  it('passes validated filters + pagination to the service, scoped to the DB-loaded user', async () => {
    taskService.listTasks.mockResolvedValue({ tasks: [], currentPage: 2, totalPages: 3, totalTasks: 25 });

    const res = await request(app)
      .get('/api/tasks?status=todo&priority=high&search=website&page=2&limit=10&assignedTo=me&assignmentStatus=assigned')
      .set(auth(7));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [], currentPage: 2, totalPages: 3, totalTasks: 25 });
    expect(taskService.listTasks).toHaveBeenCalledWith(member(7), {
      status: 'todo', priority: 'high', search: 'website', page: 2, limit: 10, assignedTo: 7, assignmentStatus: 'assigned',
    });
  });

  it('rejects invalid query params (400)', async () => {
    const res = await request(app).get('/api/tasks?status=bogus&limit=1000&assignedTo=abc&assignmentStatus=maybe').set(auth(7));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(expect.arrayContaining(['status', 'limit', 'assignedTo', 'assignmentStatus']));
  });

  it('creates a task (201) and validates the title and assignee (400)', async () => {
    taskService.createTask.mockImplementation(async (user, data) => ({ id: 1, team_id: user.teamId, created_by: user.id, ...data }));

    const ok = await request(app).post('/api/tasks').set(auth(3)).send({ title: '  Ship it ', priority: 'high', assigned_to: 4 });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ created_by: 3, title: 'Ship it', priority: 'high', assigned_to: 4 });

    const bad = await request(app).post('/api/tasks').set(auth(3)).send({ title: '', status: 'later', assigned_to: -1 });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.errors)).toEqual(expect.arrayContaining(['title', 'status', 'assigned_to']));
  });

  it('returns 404 for a task outside the caller\'s scope on get/update/delete', async () => {
    taskService.getTaskById.mockResolvedValue(null);
    taskService.updateTask.mockResolvedValue(null);
    taskService.deleteTask.mockResolvedValue(false);

    expect((await request(app).get('/api/tasks/42').set(auth(2))).status).toBe(404);
    expect((await request(app).put('/api/tasks/42').set(auth(2)).send({ status: 'done' })).status).toBe(404);
    expect((await request(app).delete('/api/tasks/42').set(auth(2))).status).toBe(404);

    expect(taskService.getTaskById).toHaveBeenCalledWith(member(2), 42);
    expect(taskService.updateTask).toHaveBeenCalledWith(member(2), 42, { status: 'done' });
    expect(taskService.deleteTask).toHaveBeenCalledWith(member(2), 42);
  });

  it('returns 500 with a generic message when the database fails', async () => {
    taskService.listTasks.mockRejectedValue(new Error('connection lost'));
    const res = await request(app).get('/api/tasks').set(auth(1));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});

describe('Role gates (no DB)', () => {
  it('blocks members from team-management routes before reaching any service', async () => {
    userService.findWithMembership.mockImplementation(async (id) => member(id, 'member'));
    const add = await request(app).post('/api/team/members').set(auth(5)).send({ name: 'X', email: 'x@test.com', role: 'member' });
    const del = await request(app).delete('/api/team/members/9').set(auth(5));
    expect(add.status).toBe(403);
    expect(del.status).toBe(403);
  });

  it('blocks members from team-wide analytics', async () => {
    userService.findWithMembership.mockImplementation(async (id) => member(id, 'member'));
    const res = await request(app).get('/api/analytics/overview?scope=team').set(auth(5));
    expect(res.status).toBe(403);
  });
});
