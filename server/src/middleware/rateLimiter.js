/**
 * Lightweight, zero-dependency in-memory rate limiting middleware for TripTally.
 * Provides sliding window request tracking with automatic eviction of expired entries.
 */

export function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 300,                  // Max requests per window
  message = 'Too many requests from this IP. Please try again later.',
  statusCode = 429,
  skipTests = true,
} = {}) {
  // Map of clientKey -> { count, resetTime }
  const store = new Map();

  // Periodic cleanup of expired entries every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it does not block Node process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Optionally bypass during automated test runs
    if (skipTests && process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const clientKey = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';

    const now = Date.now();
    let record = store.get(clientKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(clientKey, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    // Standard rate limit response headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(statusCode).json({
        success: false,
        message,
        retryAfter: resetSeconds,
      });
    }

    next();
  };
}

// General API Rate Limiter (300 requests per 15 min per IP)
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many API requests from this client. Please slow down and try again shortly.',
});

// Stricter Rate Limiter for Authentication / Password Endpoints (50 attempts per 15 min per IP)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

// Dedicated Rate Limiter for Gemini AI Itinerary Generation (20 calls per 15 min per IP)
export const aiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many AI itinerary generation requests. Please wait a few minutes before trying again.',
});

export default {
  createRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  aiRateLimiter,
};

