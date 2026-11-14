// Builders for DB-backed tests: real signups, real member creation, real logins.
const request = require('supertest');
const app = require('../app');

let seq = 0;
const unique = (prefix) => `${prefix}_${Date.now()}_${process.pid}_${++seq}@test.com`.toLowerCase();
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

async function signup(name = 'Admin') {
  const email = unique(name);
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id, name, email, role: 'admin', teamId: res.body.user.team.id, auth: bearer(res.body.token) };
}

async function login(email, password = 'password123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function addMember(actor, role = 'member', name = role) {
  const email = unique(name);
  const res = await request(app).post('/api/team/members').set(actor.auth).send({ name, email, role, password: 'password123' });
  if (res.status !== 201) throw new Error(`addMember failed: ${res.status} ${JSON.stringify(res.body)}`);
  const auth = await login(email);
  return { id: res.body.member.id, name, email, role, auth: bearer(auth.body.token) };
}

/** A team with one admin, one manager and two members. */
async function createTeam(label = 'T') {
  const admin = await signup(`${label}Admin`);
  const manager = await addMember(admin, 'manager', `${label}Manager`);
  const member = await addMember(admin, 'member', `${label}Member`);
  const member2 = await addMember(admin, 'member', `${label}MemberTwo`);
  return { admin, manager, member, member2 };
}

const createTask = (actor, body) => request(app).post('/api/tasks').set(actor.auth).send({ title: 'Task', ...body });

module.exports = { app, request, signup, login, addMember, createTeam, createTask, bearer };
