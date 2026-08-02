import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import routes from './api/routes';
import { requestLogger, notFound, errorHandler } from './api/middleware/http';
import { globalLimiter } from './api/middleware/rateLimit';
import { prisma } from './services/prisma';

const app = express();

app.set('trust proxy', config.trustProxy ? 1 : false);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(cookieParser());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);
app.use(globalLimiter);

app.use(config.apiPrefix, routes);

const healthHandler = async (_req: express.Request, res: express.Response) => {
  const db = { status: 'up' as string };
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 8000)),
    ]);
  } catch (err) {
    db.status = 'down';
    console.error('[health] DB check failed:', (err as Error).message);
  }
  const healthy = db.status === 'up';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    status: healthy ? 'OK' : 'DEGRADED',
    db,
    uptime: Math.round(process.uptime()),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get(`${config.apiPrefix}/health`, healthHandler);

app.use(notFound);
app.use(errorHandler);

export default app;
