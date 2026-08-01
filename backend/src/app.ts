import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import routes from './api/routes';
import { requestLogger, notFound, errorHandler } from './api/middleware/http';
import { globalLimiter } from './api/middleware/rateLimit';
import { prisma } from './services/prisma';

const app = express();

app.set('trust proxy', config.trustProxy ? 1 : false);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);
app.use(globalLimiter);

app.use(config.apiPrefix, routes);

app.get('/health', async (_req, res) => {
  const db = { status: 'up' as string };
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db.status = 'down';
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
});

app.use(notFound);
app.use(errorHandler);

export default app;
