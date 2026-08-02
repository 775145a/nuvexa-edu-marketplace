import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'nuvexa',
    audience: process.env.JWT_AUDIENCE || 'nuvexa-web',
    algorithm: 'HS256',
  },
  auth: {
    cookieRefresh: process.env.AUTH_COOKIE_REFRESH || 'nvx_refresh',
    cookieSession: process.env.AUTH_COOKIE_SESSION || 'nvx_session',
    cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    cookieSameSite: (process.env.AUTH_COOKIE_SAME_SITE || 'none') as 'none' | 'lax' | 'strict',
    sessionDays: parseInt(process.env.SESSION_DAYS || '30'),
    maxFailedAttempts: parseInt(process.env.LOGIN_MAX_FAILED || '5'),
    lockoutMinutes: parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15'),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@learnhub.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Nuvexa',
  },
  paymob: {
    apiKey: process.env.PAYMOB_API_KEY || '',
    integrationId: parseInt(process.env.PAYMOB_INTEGRATION_ID || '0'),
    iframeId: process.env.PAYMOB_IFRAME_ID || '',
    walletIntegrationId: process.env.PAYMOB_WALLET_INTEGRATION_ID || '',
    hmacSecret: process.env.PAYMOB_HMAC_SECRET || '',
    currency: process.env.PAYMOB_CURRENCY || 'EGP',
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock',
    vatRate: parseFloat(process.env.VAT_RATE || '14'),
  },
  db: {
    provider: (process.env.DATABASE_URL || '').startsWith('postgres') ? 'postgres' : 'sqlite',
  },
  vodafoneCash: {
    enabled: process.env.VODAFONE_CASH_ENABLED === 'true',
    baseUrl: process.env.VODAFONE_CASH_BASE_URL || 'https://openapi.vodafone.com.eg',
    clientId: process.env.VODAFONE_CASH_CLIENT_ID || '',
    clientSecret: process.env.VODAFONE_CASH_CLIENT_SECRET || '',
    merchantId: process.env.VODAFONE_CASH_MERCHANT_ID || '',
    secretKey: process.env.VODAFONE_CASH_SECRET_KEY || '',
    keyId: process.env.VODAFONE_CASH_KEY_ID || '',
    publicKey: process.env.VODAFONE_CASH_PUBLIC_KEY || '',
    storeWallet: process.env.STORE_WALLET || '01000000000',
  },
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '2147483648'),
    path: process.env.UPLOAD_PATH || './uploads',
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    signedUrlTtl: parseInt(process.env.SIGNED_URL_TTL || '3600'),
  },
  image: {
    optimize: process.env.OPTIMIZE_IMAGES !== 'false',
    maxWidth: parseInt(process.env.IMAGE_MAX_WIDTH || '1600'),
    quality: parseInt(process.env.IMAGE_QUALITY || '80'),
  },
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
  },
  platform: {
    name: process.env.PLATFORM_NAME || 'Nuvexa',
    url: process.env.PLATFORM_URL || 'http://localhost:3000',
    commissionRate: parseFloat(process.env.DEFAULT_COMMISSION_RATE || '15'),
  },
  corsOrigins: (process.env.CORS_ORIGINS || process.env.PLATFORM_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  otp: {
    length: parseInt(process.env.OTP_LENGTH || '6'),
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5'),
  },
  rateLimit: {
    global: parseInt(process.env.RATE_LIMIT_GLOBAL || '300'),
    auth: parseInt(process.env.RATE_LIMIT_AUTH || '15'),
    otp: parseInt(process.env.RATE_LIMIT_OTP || '10'),
    upload: parseInt(process.env.RATE_LIMIT_UPLOAD || '60'),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  trustProxy: process.env.TRUST_PROXY === 'true' || !!process.env.VERCEL,
  cache: {
    provider: process.env.CACHE_PROVIDER || 'memory',
    ttl: parseInt(process.env.CACHE_TTL || '60'),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  queue: {
    provider: process.env.QUEUE_PROVIDER || 'direct',
  },
  transcode: {
    enabled: process.env.TRANSCODE_VIDEOS === 'true',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    segmentSeconds: parseInt(process.env.HLS_SEGMENT_SECONDS || '6'),
    maxHeight: parseInt(process.env.HLS_MAX_HEIGHT || '720'),
    segmentTtlSeconds: parseInt(process.env.HLS_SEGMENT_TTL || '604800'),
  },
};

if (config.env === 'production') {
  if (config.jwt.secret === 'fallback-secret' || config.jwt.refreshSecret === 'fallback-refresh-secret') {
    console.error('[config] SECURITY WARNING: JWT secrets are using fallback values in production. Set JWT_SECRET and JWT_REFRESH_SECRET.');
  }
  if (config.smtp.user.includes('your-email')) {
    console.error('[config] SECURITY WARNING: SMTP is not configured in production.');
  }
  if (config.payment.provider === 'vodafone_cash' && !config.vodafoneCash.clientId) {
    console.error('[config] PAYMENT WARNING: PAYMENT_PROVIDER=vodafone_cash but VODAFONE_CASH_CLIENT_ID is not set. Falling back to mock mode.');
  }
  if (config.payment.provider === 'paymob' && !config.paymob.walletIntegrationId) {
    console.error('[config] PAYMENT WARNING: PAYMENT_PROVIDER=paymob but PAYMOB_WALLET_INTEGRATION_ID is not set. Vodafone Cash payments will fail.');
  }
}
