const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const AppError = require('../utils/AppError');
const { validateSignup, validateLogin } = require('../utils/validators');

const SALT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicUser = ({ id, name, email }) => ({ id, name, email });

async function signup(req, res) {
  const { name, email, password } = validateSignup(req.body);

  if (await userService.findByEmail(email)) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userService.create({ name, email, passwordHash });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

async function login(req, res) {
  const { email, password } = validateLogin(req.body);
  const user = await userService.findByEmail(email);

  // Same message for unknown email and wrong password to avoid account enumeration.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, 'Invalid email or password');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}

async function me(req, res) {
  const user = await userService.findById(req.user.id);
  if (!user) throw new AppError(401, 'User no longer exists');
  res.json({ user: publicUser(user) });
}

module.exports = { signup, login, me };
