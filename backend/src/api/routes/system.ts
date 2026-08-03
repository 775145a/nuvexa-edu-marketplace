import { Router } from 'express';
import crypto from 'crypto';
import { runBackup } from '../../services/backup';
import { prisma } from '../../services/prisma';

const router = Router();

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a || '');
  const bufB = Buffer.from(b || '');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isCronAuthorized(req: any): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization || '';
  const fromHeader = header.startsWith('Bearer ') ? header.slice(7) : header;
  return safeEqual(fromHeader, secret);
}

router.post('/backup', async (req: any, res: any) => {
  try {
    if (!isCronAuthorized(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const result = await runBackup();
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[backup] failed:', err.message);
    res.status(500).json({ success: false, message: 'Backup failed', error: err.message });
  }
});

router.get('/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'up' } });
  } catch {
    res.status(503).json({ success: false, data: { status: 'down' } });
  }
});

export default router;
