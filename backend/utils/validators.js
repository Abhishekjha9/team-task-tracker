const AppError = require('./AppError');
const { ROLES } = require('./permissions');
const { today } = require('./dates');

const STATUSES = ['todo', 'in-progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Round-trip check rejects impossible dates like 2026-02-31 that Date.parse would accept.
const isValidDate = (s) => {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const toPositiveInt = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isInteger(n) && n > 0 ? n : null;
};

const fail = (errors, message = 'Validation failed') => {
  if (Object.keys(errors).length) throw new AppError(400, message, errors);
};

function checkName(name, errors) {
  if (!name || typeof name !== 'string' || !name.trim()) errors.name = 'Name is required';
  else if (name.trim().length > 100) errors.name = 'Name must be at most 100 characters';
}
function checkEmail(email, errors) {
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 255) errors.email = 'A valid email is required';
}
function checkPassword(password, errors) {
  if (!password || typeof password !== 'string' || password.length < 6) errors.password = 'Password must be at least 6 characters';
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters'; // bcrypt limit
}

function validateSignup({ name, email, password, teamName } = {}) {
  const errors = {};
  checkName(name, errors);
  checkEmail(email, errors);
  checkPassword(password, errors);
  if (teamName !== undefined && teamName !== null && teamName !== '' && (typeof teamName !== 'string' || teamName.trim().length > 100)) {
    errors.teamName = 'Team name must be at most 100 characters';
  }
  fail(errors);
  const cleanName = name.trim();
  return {
    name: cleanName,
    email: email.trim().toLowerCase(),
    password,
    teamName: (typeof teamName === 'string' && teamName.trim()) || `${cleanName}'s Team`,
  };
}

function validateLogin({ email, password } = {}) {
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError(400, 'Email and password are required');
  }
  return { email: email.trim().toLowerCase(), password };
}

/**
 * Validates a task payload. With partial=true (updates) only provided fields are checked,
 * but at least one field must be present. assigned_to: positive user id or null.
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
    else if (body.description && body.description.length > 5000) errors.description = 'Description must be at most 5000 characters';
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
    else if (!isValidDate(body.due_date)) errors.due_date = 'Due date must be YYYY-MM-DD';
    else data.due_date = body.due_date;
  }
  if (body.assigned_to !== undefined) {
    if (body.assigned_to === null || body.assigned_to === '') data.assigned_to = null;
    else if (toPositiveInt(body.assigned_to) === null) errors.assigned_to = 'Assignee must be a valid user id';
    else data.assigned_to = toPositiveInt(body.assigned_to);
  }

  fail(errors);
  if (partial && Object.keys(data).length === 0) throw new AppError(400, 'No valid fields provided for update');
  return data;
}

/** `me` is accepted for assignedTo/createdBy and resolved to the caller's id. */
function validateListQuery(query = {}, userId) {
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
  for (const key of ['assignedTo', 'createdBy']) {
    if (query[key] === undefined || query[key] === '') continue;
    const id = query[key] === 'me' ? userId : toPositiveInt(query[key]);
    if (!id) errors[key] = `${key} must be a user id or "me"`;
    else out[key] = id;
  }
  if (query.assignmentStatus) {
    if (!['assigned', 'unassigned'].includes(query.assignmentStatus)) errors.assignmentStatus = 'assignmentStatus must be "assigned" or "unassigned"';
    else if (query.assignmentStatus === 'unassigned' && out.assignedTo) errors.assignmentStatus = 'Cannot combine assignedTo with assignmentStatus=unassigned';
    else out.assignmentStatus = query.assignmentStatus;
  }
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) errors.page = 'Page must be a positive integer';
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.limit = 'Limit must be between 1 and 100';
  fail(errors, 'Invalid query parameters');
  return { ...out, page, limit };
}

function validateMember(body = {}, { partial = false } = {}) {
  const errors = {};
  const data = {};
  if (body.name !== undefined || !partial) {
    checkName(body.name, errors);
    if (!errors.name) data.name = body.name.trim();
  }
  if (body.email !== undefined || !partial) {
    checkEmail(body.email, errors);
    if (!errors.email) data.email = body.email.trim().toLowerCase();
  }
  if (body.role !== undefined || !partial) {
    if (!ROLES.includes(body.role)) errors.role = `Role must be one of: ${ROLES.join(', ')}`;
    else data.role = body.role;
  }
  // Creating: password optional — omitted means "generate a temporary one".
  if (!partial && body.password !== undefined && body.password !== '') {
    checkPassword(body.password, errors);
    if (!errors.password) data.password = body.password;
  }
  fail(errors);
  if (partial && Object.keys(data).length === 0) throw new AppError(400, 'No valid fields provided for update');
  return data;
}

const MAX_RANGE_DAYS = 366;

/** scope: 'me' | 'team'; optional from/to (YYYY-MM-DD, inclusive). */
function validateAnalyticsQuery(query = {}, { defaultDays } = {}) {
  const errors = {};
  const scope = query.scope || null;
  if (scope && !['me', 'team'].includes(scope)) errors.scope = 'scope must be "me" or "team"';
  let { from, to } = query;
  if (from && !isValidDate(from)) errors.from = 'from must be YYYY-MM-DD';
  if (to && !isValidDate(to)) errors.to = 'to must be YYYY-MM-DD';
  fail(errors, 'Invalid query parameters');

  if (defaultDays && !from) {
    const end = new Date(`${to || today()}T00:00:00Z`);
    from = new Date(end.getTime() - (defaultDays - 1) * 86400000).toISOString().slice(0, 10);
  }
  if (from && to && from > to) throw new AppError(400, 'Invalid query parameters', { from: 'from must be on or before to' });
  if (defaultDays) {
    const end = to || today();
    const days = (Date.parse(end) - Date.parse(from)) / 86400000 + 1;
    if (days > MAX_RANGE_DAYS) throw new AppError(400, 'Invalid query parameters', { from: `Range must be at most ${MAX_RANGE_DAYS} days` });
  }
  return { scope, from: from || null, to: to || null };
}

function parseId(raw, label = 'task') {
  const id = toPositiveInt(raw);
  if (!id) throw new AppError(400, `Invalid ${label} id`);
  return id;
}

module.exports = {
  STATUSES, PRIORITIES, isValidDate, validateSignup, validateLogin, validateTask,
  validateListQuery, validateMember, validateAnalyticsQuery, parseId,
};
