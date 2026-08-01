import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../../services/logger';
import { config } from '../../config';
import { recordRequest } from '../../services/metrics';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const id = crypto.randomBytes(8).toString('hex');
  req.id = id;
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const route = req.baseUrl + ((req.route && req.route.path) || req.path);
    recordRequest(route, res.statusCode, ms);
    if (ms > 2000) {
      logger.warn(`Slow request ${ms.toFixed(0)}ms ${req.method} ${req.originalUrl}`, { requestId: id });
    }
    logger.http(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms.toFixed(1)}ms`, {
      requestId: id,
      ip: req.ip,
      ua: (req.get('user-agent') || '').slice(0, 120),
    });
  });

  next();
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  let status = err.status || err.statusCode;
  let message = err.message || 'Internal server error';

  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : `Upload error: ${err.code}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  } else if (!status || status >= 500) {
    status = 500;
    if (config.env === 'production') message = 'Internal server error';
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, {
    requestId: req.id,
    stack: err.stack,
    status,
  });

  res.status(status).json({ success: false, message });
}
