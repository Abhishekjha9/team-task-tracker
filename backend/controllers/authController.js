const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const AppError = require('../utils/AppError');
const { validateSignup, validateLogin } = require('../utils/validators');

const SALT_ROUNDS = 10;

// The token identifies the user only. Team and role are looked up from the DB per request.
const signToken = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  team: u.teamId ? { id: u.teamId, name: u.teamName } : null,
});

async function signup(req, res) {
  const { name, email, password, teamName } = validateSignup(req.body);

  if (await userService.findByEmail(email)) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await userService.createWithTeam({ name, email, passwordHash, teamName });
  await userService.touchLogin(created.id);
  const user = await userService.findWithMembership(created.id);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

async function login(req, res) {
  const { email, password } = validateLogin(req.body);
  const found = await userService.findByEmail(email);

  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!found || !(await bcrypt.compare(password, found.password))) {
    throw new AppError(401, 'Invalid email or password');
  }
  const user = await userService.findWithMembership(found.id);
  if (!user.teamId) throw new AppError(403, 'Your account is not part of a team. Ask a team admin to add you.');

  await userService.touchLogin(user.id);
  res.json({ token: signToken(user), user: publicUser(user) });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

module.exports = { signup, login, me, publicUser };
