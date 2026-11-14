const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const userService = require('../services/userService');

/**
 * Verifies "Authorization: Bearer <token>", then loads the user's CURRENT team and role
 * from the database. Role changes and removals therefore take effect on the very next
 * request, and nothing about authorization is trusted from the token or request body.
 */
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new AppError(401, 'Authentication required'));

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }

  try {
    const user = await userService.findWithMembership(payload.id);
    if (!user) return next(new AppError(401, 'User no longer exists'));
    if (!user.teamId) return next(new AppError(401, 'Your account is no longer part of a team'));
    req.user = user; // { id, name, email, teamId, teamName, role }
    next();
  } catch (err) {
    next(err);
  }
}

/** Route-level role gate, e.g. requireRole('admin', 'manager'). Fine-grained checks live in services. */
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new AppError(403, 'You do not have permission to perform this action'));

module.exports = { protect, requireRole };
