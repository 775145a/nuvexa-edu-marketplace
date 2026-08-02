import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  fullName: z.string().min(2, 'Full name is required').max(100),
  phone: z.string().max(20).optional(),
  role: z.enum(['STUDENT', 'INSTRUCTOR']),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(100),
});

export const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  otp: z.string().min(4).max(8),
  type: z.enum(['register', 'login']),
});

export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  type: z.enum(['register', 'login']),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
