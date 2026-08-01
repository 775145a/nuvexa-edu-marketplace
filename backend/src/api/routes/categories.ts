import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { cache } from '../../services/cache';

const router = Router();

router.get('/', async (_req, res) => {
  const key = 'categories:all';
  const cached = await cache.get(key);
  if (cached) return res.json({ success: true, data: cached });

  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { courses: true } },
        children: { where: { isActive: true }, select: { id: true, name: true, slug: true } },
      },
    });
    await cache.set(key, categories);
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
