const AppError = require('./AppError');

const STATUSES = ['todo', 'in-progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (s) => DATE_RE.test(s) && !Number.isNaN(Date.parse(s));

function validateSignup({ name, email, password } = {}) {
  const errors = {};
  if (!name || typeof name !== 'string' || !name.trim()) errors.name = 'Name is required';
  else if (name.trim().length > 100) errors.name = 'Name must be at most 100 characters';
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) errors.email = 'A valid email is required';
  if (!password || typeof password !== 'string' || password.length < 6) errors.password = 'Password must be at least 6 characters';
  if (Object.keys(errors).length) throw new AppError(400, 'Validation failed', errors);
  return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

function validateLogin({ email, password } = {}) {
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'Email and password are required');
  }
  return { email: email.trim().toLowerCase(), password };
}

/**
 * Validates a task payload. With partial=true (updates) only provided fields are checked,
 * but at least one field must be present.
 */
function validateTask(body = {}, { partial = false } = {}) {
  const errors = {};
  const data = {};

  if (body.title !== undefined || !partial) {
    if (typeof body.title !== 'string' || !body.title.trim()) errors.title = 'Title is required';
    else if (body.title.trim().length > 200) errors.title = 'Title must be at most 200 characters';
    else data.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') errors.description = 'Description must be text';
    else data.description = body.description ? body.description.trim() : null;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}`;
    else data.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!PRIORITIES.includes(body.priority)) errors.priority = `Priority must be one of: ${PRIORITIES.join(', ')}`;
    else data.priority = body.priority;
  }
  if (body.due_date !== undefined) {
    if (body.due_date === null || body.due_date === '') data.due_date = null;
    else if (typeof body.due_date !== 'string' || !isValidDate(body.due_date)) errors.due_date = 'Due date must be YYYY-MM-DD';
    else data.due_date = body.due_date;
  }

  if (Object.keys(errors).length) throw new AppError(400, 'Validation failed', errors);
  if (partial && Object.keys(data).length === 0) throw new AppError(400, 'No valid fields provided for update');
  return data;
}

function validateListQuery(query = {}) {
  const errors = {};
  const out = {};
  if (query.status) {
    if (!STATUSES.includes(query.status)) errors.status = 'Invalid status filter';
    else out.status = query.status;
  }
  if (query.priority) {
    if (!PRIORITIES.includes(query.priority)) errors.priority = 'Invalid priority filter';
    else out.priority = query.priority;
  }
  if (query.search && typeof query.search === 'string' && query.search.trim()) {
    out.search = query.search.trim().slice(0, 200);
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.page = 'Page must be a positive integer';
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.limit = 'Limit must be between 1 and 100';
  if (Object.keys(errors).length) throw new AppError(400, 'Invalid query parameters', errors);
  return { ...out, page, limit };
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, 'Invalid task id');
  return id;
}

module.exports = { STATUSES, PRIORITIES, validateSignup, validateLogin, validateTask, validateListQuery, parseId };
