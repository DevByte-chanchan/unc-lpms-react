/**
 * Centralized error handling middleware
 */

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error (in production, use proper logging service)
  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Duplicate Entry';
    details = err.errors.map(e => ({
      field: e.path,
      message: `${e.path} already exists`
    }));
  }

  // Sequelize foreign key errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid Reference';
    details = 'Referenced record does not exist';
  }

  // Handle missing resources
  if (err.statusCode === 404) {
    statusCode = 404;
    message = err.message || 'Resource not found';
  }

  // Handle authorization errors
  if (err.statusCode === 403) {
    statusCode = 403;
    message = err.message || 'Access denied';
  }

  // Respond with error
  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

// Async error wrapper (for use in route handlers)
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found middleware (should be last)
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404
  );
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
