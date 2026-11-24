import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import uploadRoutes from './routes/upload.routes';
import userRoutes from './routes/user.routes';

import { errorHandler } from './middlewares/error.middleware';
import { limiter } from './middlewares/rateLimit.middleware';

const app = express();
const allowedOrigins = new Set([
  'http://localhost:4064',
  'http://127.0.0.1:4064',
  'http://localhost:4065',
  'http://127.0.0.1:4065',
  process.env.CLIENT_ORIGIN || 'http://localhost:4064',
]);

// ✅ Apply rate limiter early
app.use(limiter);

app.use((req, _res, next) => {
  console.log('[http]', req.method, req.originalUrl, {
    origin: req.headers.origin,
  });
  next();
});

// ✅ Enable CORS with credentials (cookie support)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// ✅ Middleware for JSON parsing and cookies
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// ✅ API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/user', userRoutes);

// ✅ Global error handler should be last
app.use(errorHandler);

export default app;
