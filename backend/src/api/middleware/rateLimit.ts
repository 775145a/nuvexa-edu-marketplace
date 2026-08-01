import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { config } from '../../config';

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { ip: false, trustProxy: false },
  keyGenerator: (req: Request): string =>
    (req.ip as string) ||
    ((req.headers['x-forwarded-for'] as string) || '').split(',')[0] ||
    'unknown',
} as const;

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimit.global,
  ...common,
  skip: (req) =>
    req.path === '/health' ||
    req.path.startsWith('/files/') ||
    req.path.startsWith('/payments/webhook/'),
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimit.auth,
  ...common,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: config.rateLimit.otp,
  ...common,
  message: { success: false, message: 'Too many OTP attempts. Please try again in an hour.' },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimit.upload,
  ...common,
  message: { success: false, message: 'Too many uploads. Please try again later.' },
});
