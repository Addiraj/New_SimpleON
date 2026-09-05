import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFound.js';

// Global BigInt serialization support for JSON response payloads
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app: Express = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite inline scripts & dev compatibility
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Configuration
const allowedOrigins = [env.FRONTEND_URL, env.CORS_ORIGIN].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.CORS_ORIGIN === '*' || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request Body Limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Structured Logging Middleware
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url?.startsWith('/api/health') || false,
    },
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

// Rate Limiter for API Routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
    },
  },
});

app.use('/api', apiLimiter);

// Main API Routes
app.use('/api', apiRouter);

// Root Healthcheck Alias
app.get('/health', (_req, res) => {
  res.redirect('/api/health');
});

// 404 Handler for unhandled API routes
app.use('/api/*', notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
export { app };
