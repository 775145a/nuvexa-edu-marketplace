import { prisma } from './prisma';

export async function logAudit(input: {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId || null,
        before: input.before === undefined ? null : safeStringify(input.before),
        after: input.after === undefined ? null : safeStringify(input.after),
        ipAddress: input.ipAddress || null,
      },
    });
  } catch (err) {
    const { logger } = require('./logger');
    logger.warn(`[audit] failed to write audit log: ${err instanceof Error ? err.message : err}`);
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
