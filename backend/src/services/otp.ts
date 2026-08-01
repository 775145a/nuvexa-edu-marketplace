import crypto from 'crypto';
import { prisma } from './prisma';
import { config } from '../config';
import { logger } from './logger';

export function generateOtp(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < config.otp.length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

async function cleanupExpired(userId: string, type: string): Promise<void> {
  try {
    await prisma.otpVerification.deleteMany({
      where: {
        userId,
        type,
        OR: [
          { usedAt: { not: null } },
          { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  } catch (err) {
    logger.warn(`OTP cleanup failed for user ${userId}: ${err instanceof Error ? err.message : err}`);
  }
}

export async function createOtp(userId: string, type: 'register' | 'login'): Promise<string> {
  await prisma.otpVerification.updateMany({
    where: { userId, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

  await prisma.otpVerification.create({
    data: { userId, otp, type, expiresAt },
  });

  await cleanupExpired(userId, type);

  return otp;
}

export async function verifyOtp(userId: string, otp: string, type: 'register' | 'login'): Promise<boolean> {
  const record = await prisma.otpVerification.findFirst({
    where: {
      userId,
      type,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;

  if (record.attempts >= config.otp.maxAttempts) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return false;
  }

  if (record.otp !== otp) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return true;
}
