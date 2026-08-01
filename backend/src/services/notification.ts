import { prisma } from './prisma';
import { emitToUser } from './realtime';
import { logger } from './logger';

export interface NotifyInput {
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function notifyUser(userId: string, input: NotifyInput): Promise<void> {
  try {
    const record = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      },
    });
    emitToUser(userId, 'notification:new', {
      id: record.id,
      type: record.type,
      title: record.title,
      message: record.message,
      link: record.link,
      createdAt: record.createdAt,
    });
  } catch (err) {
    logger.warn(`[notify] failed for user ${userId}: ${err instanceof Error ? err.message : err}`);
  }
}

export async function notifyMany(userIds: string[], input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, ...input })),
    });
    const now = new Date();
    for (const userId of userIds) {
      emitToUser(userId, 'notification:new', {
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        createdAt: now,
      });
    }
  } catch (err) {
    logger.warn(`[notifyMany] failed: ${err instanceof Error ? err.message : err}`);
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}
