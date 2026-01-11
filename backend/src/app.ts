import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';

const app: Application = express();

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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