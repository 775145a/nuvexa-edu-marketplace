import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';

const router = Router();

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

router.post('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { code, discountType = 'PERCENT', value, maxUses = 0, courseId, expiresAt } = req.body;
    if (!code || !value || value <= 0) {
      return res.status(400).json({ success: false, message: 'Code and positive value required' });
    }
    if (!['PERCENT', 'FIXED'].includes(discountType)) {
      return res.status(400).json({ success: false, message: 'discountType must be PERCENT or FIXED' });
    }
    if (discountType === 'PERCENT' && value > 100) {
      return res.status(400).json({ success: false, message: 'Percent discount cannot exceed 100' });
    }
    const codeClean = normalizeCode(code);
    const existing = await prisma.coupon.findUnique({ where: { code: codeClean } });
    if (existing) return res.status(409).json({ success: false, message: 'Coupon code already exists' });

    const coupon = await prisma.coupon.create({
      data: {
        code: codeClean,
        discountType,
        value,
        maxUses: Math.max(0, parseInt(maxUses) || 0),
        courseId: courseId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', authenticate, authorize('ADMIN'), async (_req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { id: true, title: true } } },
      take: 200,
    });
    res.json({ success: true, data: coupons });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { isActive, maxUses, value, expiresAt } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        isActive: isActive !== undefined ? !!isActive : undefined,
        maxUses: maxUses !== undefined ? Math.max(0, parseInt(maxUses) || 0) : undefined,
        value: value !== undefined ? parseFloat(value) : undefined,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
      },
    });
    res.json({ success: true, data: coupon });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/apply', authenticate, async (req: AuthRequest, res) => {
  try {
    const { code, courseId } = req.query;
    if (!code || !courseId) {
      return res.status(400).json({ success: false, message: 'code and courseId required' });
    }
    const coupon = await prisma.coupon.findUnique({ where: { code: normalizeCode(code as string) } });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    if (!coupon.isActive) return res.status(400).json({ success: false, message: 'Coupon is inactive' });
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
    }
    if (coupon.courseId && coupon.courseId !== (courseId as string)) {
      return res.status(400).json({ success: false, message: 'Coupon does not apply to this course' });
    }
    const course = await prisma.course.findUnique({ where: { id: courseId as string } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const base = course.discountedPrice || course.price;
    let discount = coupon.discountType === 'PERCENT' ? (base * coupon.value) / 100 : coupon.value;
    discount = Math.min(discount, base);
    res.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        discount: Math.round(discount * 100) / 100,
        total: Math.round((base - discount) * 100) / 100,
        expiresAt: coupon.expiresAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
