import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from './logger';

let io: SocketIOServer | null = null;

export async function initRealtime(httpServer: import('http').Server): Promise<SocketIOServer> {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  });

  if (config.cache.provider === 'redis') {
    try {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const { default: Redis } = await import('ioredis');
      const pub = new Redis(config.redis.url);
      const sub = pub.duplicate();
      io.adapter(createAdapter(pub, sub));
      logger.info('Realtime uses Redis adapter (multi-instance ready)');
    } catch (err) {
      logger.warn(`Redis adapter unavailable: ${err instanceof Error ? err.message : err}`);
    }
  }

  io.use((socket, next) => {
    const auth = socket.handshake.auth as { token?: string } | undefined;
    const query = socket.handshake.query as { token?: string } | undefined;
    const token = auth?.token || query?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const decoded = jwt.verify(String(token), config.jwt.secret) as { userId: string };
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) socket.join(`user:${userId}`);
  });

  logger.info('Realtime server initialized');
  return io;
}

export function getIo(): SocketIOServer | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
