import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/video-jobs/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const jobs = await prisma.videoJob.findMany({
      where: { ownerId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true, status: true, progress: true, duration: true, resultUrl: true, posterUrl: true, error: true, createdAt: true,
      },
    });
    res.json({ success: true, data: jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/video-jobs/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.videoJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const isOwner = job.ownerId === req.userId;
    const isAdmin = req.userRole === 'ADMIN';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        duration: job.duration,
        segments: job.segments,
        resultUrl: job.resultUrl,
        posterUrl: job.posterUrl,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
