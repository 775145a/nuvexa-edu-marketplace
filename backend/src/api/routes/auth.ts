import { Router, Response } from 'express';
import {
  registerUser,
  resendOtp,
  verifyRegistrationOtp,
  loginWithPassword,
  verifyLoginOtp,
  refreshTokens,
  logout,
  getUserById,
  verifyAccessToken,
} from '../../services/auth';
import { authLimiter, otpLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema, refreshSchema } from '../validators/auth';
import { config } from '../../config';

const router = Router();

const COOKIE_MAX_AGE = config.auth.sessionDays * 24 * 60 * 60 * 1000;
const COOKIE_SAME_SITE = config.auth.cookieSecure ? 'none' : 'lax';

function setAuthCookies(res: Response, tokens: any) {
  const base = {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: COOKIE_SAME_SITE as 'none' | 'lax',
    path: '/',
  } as const;
  res.cookie(config.auth.cookieRefresh, tokens.refreshToken, { ...base, maxAge: COOKIE_MAX_AGE });
  res.cookie(config.auth.cookieSession, tokens.sessionToken, { ...base, maxAge: COOKIE_MAX_AGE });
}

function clearAuthCookies(res: Response) {
  const base = {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: COOKIE_SAME_SITE as 'none' | 'lax',
    path: '/',
  } as const;
  res.clearCookie(config.auth.cookieRefresh, base);
  res.clearCookie(config.auth.cookieSession, base);
}

function csrfGuard(req: any, res: Response, next: any) {
  if (req.headers['x-nuvexa-client'] !== '1') {
    return res.status(403).json({ success: false, message: 'Invalid request origin' });
  }
  next();
}

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;

    const result = await registerUser({ email, password, fullName, phone, role });
    res.json({ success: true, message: 'OTP sent to email', data: result });
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') return res.status(409).json({ success: false, message: 'Email already registered' });
    if (err.message === 'WEAK_PASSWORD') return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, and number' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), async (req, res) => {
  try {
    const { userId, otp, type } = req.body;
    if (!userId || !otp || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] as string | undefined };

    if (type === 'register') {
      const tokens = await verifyRegistrationOtp(userId, otp);
      setAuthCookies(res, tokens);
      return res.json({ success: true, message: 'Registration verified', data: tokens });
    }

    if (type === 'login') {
      const tokens = await verifyLoginOtp(userId, otp, meta);
      setAuthCookies(res, tokens);
      return res.json({ success: true, message: 'Login successful', data: tokens });
    }

    res.status(400).json({ success: false, message: 'Invalid OTP type' });
  } catch (err: any) {
    if (err.message === 'INVALID_OTP') return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    if (err.message === 'EMAIL_NOT_VERIFIED') return res.status(403).json({ success: false, message: 'Email not verified' });
    if (err.message === 'ACCOUNT_DISABLED') return res.status(403).json({ success: false, message: 'Account is disabled' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/resend-otp', otpLimiter, validate(resendOtpSchema), async (req, res) => {
  try {
    const { email, type } = req.body;
    await resendOtp(email, type);
    res.json({ success: true, message: 'OTP resent' });
  } catch (err: any) {
    if (err.message === 'USER_NOT_FOUND') return res.status(404).json({ success: false, message: 'User not found' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginWithPassword(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
    res.json({ success: true, message: 'OTP sent to email', data: result });
  } catch (err: any) {
    if (err.message === 'ACCOUNT_LOCKED') return res.status(429).json({ success: false, message: 'Too many failed attempts. Try again later.' });
    if (err.message === 'INVALID_CREDENTIALS') return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (err.message === 'ACCOUNT_DISABLED') return res.status(403).json({ success: false, message: 'Account is disabled' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/refresh', authLimiter, csrfGuard, validate(refreshSchema), async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies?.[config.auth.cookieRefresh];
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const tokens = await refreshTokens(refreshToken);
    setAuthCookies(res, tokens);
    res.json({ success: true, data: tokens });
  } catch (err: any) {
    clearAuthCookies(res);
    if (err.message === 'SESSION_EXPIRED') return res.status(401).json({ success: false, message: 'Session expired. Login again.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', csrfGuard, async (req, res) => {
  try {
    const sessionToken = req.body.sessionToken || req.cookies?.[config.auth.cookieSession];
    if (sessionToken) await logout(sessionToken);
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out' });
  } catch {
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const decoded = verifyAccessToken(header.split(' ')[1]);
    const user = await getUserById(decoded.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!(user as any).referralCode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      const crypto = await import('crypto');
      for (let i = 0; i < 8; i++) code += chars[crypto.default.randomInt(0, chars.length)];
      const prisma = (await import('../../services/prisma')).prisma;
      await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
      (user as any).referralCode = code;
    }
    const { passwordHash, ...safe } = user as any;
    res.json({ success: true, data: safe });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

export default router;
