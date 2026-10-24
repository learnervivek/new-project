import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { paymentPublicRouter } from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';
import { connectDB, getDBStatus } from './config/db.js';

dotenv.config();

const app = express();

// Ensure database connection is initialized
app.use(async (req, res, next) => {
  // Health endpoint always responds even if DB is down
  if (req.path === '/health' || req.path === '/api/health' || req.path === '/') {
    return next();
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('[Database] Connection attempt failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        message: `Database connection error: ${err.message}. Please verify MONGODB_URI in your environment variables and ensure MongoDB Atlas Network Access allows your server IP.`,
      });
    }
  }

  next();
});

// Trust reverse proxy (for secure cookies, rate limiting, and correct IP resolution in production)
app.set('trust proxy', 1);

// Serve uploaded receipts and files with security headers and prevent directory browsing
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },

  express.static(
    process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    {
      dotfiles: 'ignore',
      index: false,
      maxAge: '1d',
    }
  )
);

// Structured request logging
app.use(requestLogger);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://triptally.work.gd',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile clients, curl, testing tools)
      if (!origin) return callback(null, true);

      // Allow configured origins or local development
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }

      // Allow the origin for client web requests
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base Route
app.get('/', (req, res) => {
  res.json({
    name: 'TripTally API',
    version: '1.0.0',
    description: 'Collaborative Trip Planning & Group Expense Tallying',
    status: 'online',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        profile: 'PUT /api/auth/profile',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'PUT /api/auth/reset-password/:token',
      },
    },
  });
});

// General API Rate Limiting
app.use('/api', apiRateLimiter);

// Stricter Rate Limiting on Authentication Endpoints
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/forgot-password', authRateLimiter);

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentPublicRouter);
app.use('/api/ai', aiRoutes);


// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
