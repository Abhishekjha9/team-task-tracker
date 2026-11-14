const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body from express.json()
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  // Race on the unique email index
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Resource already exists' });
  }

  const status = err instanceof AppError ? err.statusCode : 500;
  if (status === 500 && process.env.NODE_ENV !== 'test') console.error(err);

  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message,
    ...(err.details && { errors: err.details }),
  });
}

module.exports = { notFound, errorHandler };
