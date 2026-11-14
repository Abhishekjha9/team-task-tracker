/**
 * API tests for auth + task routes. The service (SQL) layer is mocked so these run
 * without a database; they verify routing, JWT protection, validation, status codes,
 * and that every task operation is scoped to the authenticated user's id.
 */
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

jest.mock('../services/taskService');
jest.mock('../services/userService');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../app');
const taskService = require('../services/taskService');
const userService = require('../services/userService');

const tokenFor = (id) => jwt.sign({ id, email: `u${id}@test.com` }, process.env.JWT_SECRET);
const auth = (id) => ({ Authorization: `Bearer ${tokenFor(id)}` });

afterEach(() => jest.resetAllMocks());

describe('Auth', () => {
  it('signs up a user, hashes the password and returns a JWT', async () => {
    userService.findByEmail.mockResolvedValue(null);
    userService.create.mockImplementation(async (u) => ({ id: 1, name: u.name, email: u.email }));

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ADA@test.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: 1, name: 'Ada', email: 'ada@test.com' });
    expect(jwt.verify(res.body.token, 'test-secret').id).toBe(1);
    const { passwordHash } = userService.create.mock.calls[0][0];
    expect(await bcrypt.compare('secret123', passwordHash)).toBe(true);
  });

  it('rejects signup with invalid data (400) and duplicate email (409)', async () => {
    const bad = await request(app).post('/api/auth/signup').send({ email: 'nope', password: '1' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toHaveProperty('email');

    userService.findByEmail.mockResolvedValue({ id: 9 });
    const dup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Ada', email: 'ada@test.com', password: 'secret123' });
    expect(dup.status).toBe(409);
  });

  it('rejects login with wrong password (401)', async () => {
    userService.findByEmail.mockResolvedValue({ id: 1, email: 'a@test.com', password: await bcrypt.hash('right', 4) });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

describe('Tasks', () => {
  it('requires a valid token (401)', async () => {
    expect((await request(app).get('/api/tasks')).status).toBe(401);
    expect((await request(app).get('/api/tasks').set('Authorization', 'Bearer garbage')).status).toBe(401);
    expect(taskService.listTasks).not.toHaveBeenCalled();
  });

  it('passes validated filters + pagination to the service, scoped to the user', async () => {
    taskService.listTasks.mockResolvedValue({ tasks: [], currentPage: 2, totalPages: 3, totalTasks: 25 });

    const res = await request(app)
      .get('/api/tasks?status=todo&priority=high&search=website&page=2&limit=10')
      .set(auth(7));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [], currentPage: 2, totalPages: 3, totalTasks: 25 });
    expect(taskService.listTasks).toHaveBeenCalledWith(7, {
      status: 'todo', priority: 'high', search: 'website', page: 2, limit: 10,
    });
  });

  it('rejects invalid query params (400)', async () => {
    const res = await request(app).get('/api/tasks?status=bogus&limit=1000').set(auth(7));
    expect(res.status).toBe(400);
    expect(res.body.errors).toHaveProperty('status');
    expect(res.body.errors).toHaveProperty('limit');
  });

  it('creates a task (201) and validates the title (400)', async () => {
    taskService.createTask.mockImplementation(async (userId, data) => ({ id: 1, user_id: userId, ...data }));

    const ok = await request(app).post('/api/tasks').set(auth(3)).send({ title: '  Ship it ', priority: 'high' });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ user_id: 3, title: 'Ship it', priority: 'high' });

    const bad = await request(app).post('/api/tasks').set(auth(3)).send({ title: '', status: 'later' });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toEqual(expect.objectContaining({ title: expect.any(String), status: expect.any(String) }));
  });

  it("returns 404 for another user's task on get/update/delete", async () => {
    taskService.getTaskById.mockResolvedValue(null);
    taskService.updateTask.mockResolvedValue(null);
    taskService.deleteTask.mockResolvedValue(false);

    expect((await request(app).get('/api/tasks/42').set(auth(2))).status).toBe(404);
    expect((await request(app).put('/api/tasks/42').set(auth(2)).send({ status: 'done' })).status).toBe(404);
    expect((await request(app).delete('/api/tasks/42').set(auth(2))).status).toBe(404);

    expect(taskService.getTaskById).toHaveBeenCalledWith(2, 42);
    expect(taskService.updateTask).toHaveBeenCalledWith(2, 42, { status: 'done' });
    expect(taskService.deleteTask).toHaveBeenCalledWith(2, 42);
  });

  it('returns 500 with a generic message when the database fails', async () => {
    taskService.listTasks.mockRejectedValue(new Error('connection lost'));
    const res = await request(app).get('/api/tasks').set(auth(1));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal server error');
  });
});
