/**
 * Centralized error handling middleware for TripTally API.
 * Normalizes Mongoose, JWT, Multer, and application errors.
 * Ensures consistent JSON error responses without leaking sensitive stack traces in production.
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';

  let errors = err.errors || undefined;

  // 1. Mongoose Bad ObjectId / CastError (e.g. invalid tripId or itemId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier format: "${err.value}"`;
  }

  // 2. Mongoose Schema Validation Error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation error: please check required fields and data formats';
    errors = Object.values(err.errors).map((val) => val.message);
  }

  // 3. MongoDB Duplicate Key Error (e.g. unique email or compound index conflict)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  }

  // 4. JWT Authentication / Expiration Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
  }

  // 5. Multer File Upload Errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum allowed limit of 5MB';
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Structured error logging
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${req.method} ${req.originalUrl} - Status: ${statusCode} - ${message}`);
  if (process.env.NODE_ENV !== 'production' && err.stack && statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler for unmapped routes
 */
export function notFound(req, res, next) {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

export default errorHandler;
