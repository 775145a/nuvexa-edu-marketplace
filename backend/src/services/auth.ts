import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { config } from '../config';
import { createOtp, verifyOtp } from './otp';
import { sendOtpEmail } from './email';
import crypto from 'crypto';

function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[crypto.randomInt(0, chars.length)];
  return code;
}

export interface JwtPayload {
  userId: string;
  role: string;
}

export async function registerUser(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error('EMAIL_EXISTS');

  if (data.password.length < 8 || !/[A-Z]/.test(data.password) || !/[a-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    throw new Error('WEAK_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      phone: data.phone || null,
      role: data.role,
      referralCode: generateReferralCode(),
      isVerified: false,
      ...(data.role === 'STUDENT'
        ? { studentProfile: { create: {} } }
        : { instructorProfile: { create: {} } }),
    },
  });

  const otp = await createOtp(user.id, 'register');
  await sendOtpEmail(data.email, otp, 'register');

  return { userId: user.id, email: user.email };
}

export async function resendOtp(email: string, type: 'register' | 'login') {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('USER_NOT_FOUND');
  const otp = await createOtp(user.id, type);
  await sendOtpEmail(email, otp, type);
  return { userId: user.id };
}

export async function verifyRegistrationOtp(userId: string, otp: string) {
  const valid = await verifyOtp(userId, otp, 'register');
  if (!valid) throw new Error('INVALID_OTP');

  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  return createSession(userId);
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.isActive) throw new Error('ACCOUNT_DISABLED');

  const otp = await createOtp(user.id, 'login');
  await sendOtpEmail(email, otp, 'login');

  return { userId: user.id, email: user.email };
}

export async function verifyLoginOtp(userId: string, otp: string) {
  const valid = await verifyOtp(userId, otp, 'login');
  if (!valid) throw new Error('INVALID_OTP');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isVerified: true, isActive: true },
  });
  if (!user || !user.isActive) throw new Error('ACCOUNT_DISABLED');
  if (!user.isVerified) throw new Error('EMAIL_NOT_VERIFIED');

  return createSession(user.id);
}

async function createSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, fullName: true, isActive: true },
  });
  if (!user || !user.isActive) throw new Error('ACCOUNT_DISABLED');

  const payload: JwtPayload = { userId, role: user.role };
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });

  const refreshToken = generateSessionToken();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.session.create({
    data: { userId, token: sessionToken, refreshToken, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    sessionToken,
    expiresAt: expiresAt.toISOString(),
    userId,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  };
}

export async function refreshTokens(refreshToken: string) {
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: { select: { id: true, role: true, isActive: true } } },
  });

  if (!session || !session.isActive || session.expiresAt < new Date()) {
    throw new Error('SESSION_EXPIRED');
  }
  if (!session.user.isActive) throw new Error('ACCOUNT_DISABLED');

  await prisma.session.update({
    where: { id: session.id },
    data: { isActive: false },
  });

  return createSession(session.user.id);
}

export async function logout(sessionToken: string) {
  await prisma.session.updateMany({
    where: { token: sessionToken, isActive: true },
    data: { isActive: false },
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      instructorProfile: true,
    },
  });
}
