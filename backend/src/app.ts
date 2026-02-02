import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';

const app: Application = express();

// Allowed origins: single CORS_ORIGIN + comma-separated CORS_ORIGINS (web, mobile, etc.)
const allowedOrigins = [
  config.corsOrigin,
  ...config.corsOrigins,
].filter(Boolean);

// CORS configuration - supports multiple origins for web + iOS + dev
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Mobile/native apps may not send Origin
      if (allowedOrigins.some(o => origin === o || origin?.startsWith(o))) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting - 100 requests per 15 min per IP (scalable for 1000+ users)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.nodeEnv === 'production' ? 200 : 1000,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Mount API routes
app.use('/api', routes);

// 404 handler
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;