/**
 * Structured request logging middleware for TripTally API.
 * Tracks incoming requests, response times, and status codes while masking sensitive fields.
 */

const SENSITIVE_FIELDS = new Set([
  'password',
  'confirmpassword',
  'token',
  'secret',
  'authorization',
  'credit_card',
  'cvv',
  'devresettoken',
  'refreshtoken',
]);

/**
 * Recursively redacts sensitive keys from objects before logging
 */
export function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeLogData);

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function requestLogger(req, res, next) {
  // Suppress verbose request logging during automated tests
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  req.id = requestId;

  // Mask client IP if behind proxies
  const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const userTag = req.user ? `[User: ${req.user._id || req.user.id}]` : '[Anon]';
    const timestamp = new Date().toISOString();

    const logLevel = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';

    console.log(
      `[${timestamp}] [${logLevel}] [${requestId}] ${req.method} ${req.originalUrl} ${status} (${duration}ms) ${userTag} - IP: ${clientIp}`
    );
  });

  next();
}

export default requestLogger;
