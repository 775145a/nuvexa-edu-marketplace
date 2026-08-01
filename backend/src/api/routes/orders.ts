import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { config } from '../../config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { initiatePayment, verifyPayment, paymentStatus, providerName, isMockMode } from '../../services/payments';
import { completeOrderAndEnroll } from '../../services/payments/completeOrder';
import { notifyUser } from '../../services/notification';

const router = Router();

function genOrderNumber(): string {
  return 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

router.post('/create', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId, paymentMethod = 'vodafone_cash', couponCode, referralCode } = req.body;
    if (!courseId) return res.status(400).json({ success: false, message: 'Course ID required' });

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: req.userId!, courseId } },
    });
    if (existing) return res.status(409).json({ success: false, message: 'Already enrolled' });

    const base = course.discountedPrice || course.price;
    let subtotal = base;
    let discount = course.discountedPrice ? course.price - course.discountedPrice : 0;

    let coupon = null;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).trim().toUpperCase() } });
      if (!coupon) return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      if (!coupon.isActive) return res.status(400).json({ success: false, message: 'Coupon is inactive' });
      if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Coupon has expired' });
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
      if (coupon.courseId && coupon.courseId !== course.id) return res.status(400).json({ success: false, message: 'Coupon does not apply to this course' });
      const couponDiscount = coupon.discountType === 'PERCENT' ? (base * coupon.value) / 100 : coupon.value;
      discount += Math.min(couponDiscount, base);
      subtotal = base;
    }

    let referrerId = null;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode: String(referralCode).trim().toUpperCase() } });
      if (referrer && referrer.id !== req.userId && referrer.isActive) {
        referrerId = referrer.id;
      }
    }

    const vatRate = config.payment.vatRate;
    const afterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const taxAmount = Math.round(afterDiscount * vatRate) / 100;
    const total = Math.round((afterDiscount + taxAmount) * 100) / 100;

    const order = await prisma.order.create({
      data: {
        orderNumber: genOrderNumber(),
        studentId: req.userId!,
        subtotal: subtotal,
        discount: Math.round(discount * 100) / 100,
        vatRate,
        taxAmount,
        total,
        currency: course.currency,
        paymentMethod,
        couponId: coupon?.id || null,
        referrerId: referrerId || null,
        items: { create: { courseId: course.id, price: total } },
        payments: {
          create: {
            amount: total,
            currency: course.currency,
            method: paymentMethod,
            provider: providerName(),
            status: 'PENDING',
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { ...order, mock: isMockMode(), vatBreakdown: { subtotal: order.subtotal, discount: order.discount, vatRate: order.vatRate, taxAmount: order.taxAmount, total: order.total }, couponApplied: coupon ? { code: coupon.code, discountType: coupon.discountType, value: coupon.value } : null },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/initiate', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId, phoneNumber } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required' });

    const order = await prisma.order.findFirst({
      where: { id: orderId, studentId: req.userId! },
      include: { payments: { where: { status: 'PENDING' }, take: 1 } },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const provider = providerName();
    if (provider === 'paymob' && !phoneNumber) {
      return res.status(400).json({ success: false, message: 'رقم محفظة فودافون كاش مطلوب لإتمام الدفع' });
    }

    const payment = order.payments[0];
    if (!payment) return res.status(400).json({ success: false, message: 'No pending payment for this order' });

    const intent = await initiatePayment({
      orderId: order.id,
      userId: req.userId!,
      phoneNumber,
      amount: order.total,
      currency: order.currency,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: intent.providerRef || payment.providerRef,
        phoneNumber: intent.phoneNumber || phoneNumber,
        metadata: JSON.stringify({ provider: intent.provider, mode: intent.mode, store: intent.storeName }),
      },
    });

    res.json({ success: true, data: intent });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/verify-payment', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId, transactionId, reference, phoneNumber } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required' });

    const order = await prisma.order.findFirst({
      where: { id: orderId, studentId: req.userId! },
      include: { payments: { where: { status: 'PENDING' }, take: 1 } },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const payment = order.payments[0];
    if (!payment) {
      if (order.status === 'COMPLETED') {
        return res.json({ success: true, message: 'Payment already verified' });
      }
      return res.status(400).json({ success: false, message: 'No pending payment for this order' });
    }

    const manualMode = providerName() === 'mock';
    const ref = (transactionId || reference || '').trim();
    const phone = (phoneNumber || '').replace(/[\s-]/g, '');

    if (manualMode) {
      if (ref.length < 4) {
        return res.status(400).json({ success: false, message: 'أدخل رقم عملية التحويل الصحيح للتأكيد' });
      }
      if (!/^01[0125][0-9]{8}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'أدخل رقم محفظة فودافون كاش الصحيح (01xxxxxxxxx) الذي حوّلت منه' });
      }
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'AWAITING_CONFIRMATION',
          transactionId: ref,
          providerRef: ref,
          phoneNumber: phone,
        },
      });

      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      await Promise.all(admins.map((a) => notifyUser(a.id, {
        type: 'PAYMENT',
        title: 'طلب تأكيد دفع يدوي 💰',
        message: `الطلب ${order.orderNumber} — الرقم ${phone} يحوّل رقم العملية ${ref}. تأكد من وصول المبلغ من هذه المحفظة.`,
        link: '/admin/payments',
      }).catch(() => undefined)));

      return res.json({
        success: true,
        message: 'تم استلام رقم الهاتف ورقم العملية. سيُفعّل الكورس فور تأكيد وصول المبلغ.',
        data: { status: 'AWAITING_CONFIRMATION' },
      });
    }

    const result = await verifyPayment({
      orderId: order.id,
      transactionId: transactionId || payment.transactionId || undefined,
      reference: reference || payment.providerRef || undefined,
      phoneNumber,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.reason || 'Payment was not successful' });
    }

    const completed = await completeOrderAndEnroll(order.id, {
      transactionId: result.transactionId,
      providerRef: result.providerRef,
      phoneNumber,
    });

    res.json({
      success: true,
      message: completed.alreadyCompleted ? 'Payment already verified' : 'Payment verified and course activated',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, studentId: req.userId! },
      include: { payments: { take: 1 } },
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const payment = order.payments[0];
    if (!payment || payment.status === 'COMPLETED' || order.status === 'COMPLETED') {
      return res.json({ success: true, data: { status: 'COMPLETED' } });
    }

    if (payment.status === 'AWAITING_CONFIRMATION') {
      return res.json({ success: true, data: { status: 'AWAITING_CONFIRMATION' } });
    }

    if (providerName() !== 'mock' && payment.providerRef) {
      const s = await paymentStatus(payment.providerRef);
      if (s.status === 'COMPLETED' || s.status === 'SUCCESS') {
        await completeOrderAndEnroll(order.id, { providerRef: payment.providerRef, transactionId: s.transactionId });
        return res.json({ success: true, data: { status: 'COMPLETED' } });
      }
      return res.json({ success: true, data: { status: s.status } });
    }

    res.json({ success: true, data: { status: payment.status } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { studentId: req.userId! },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true } } } },
        payments: { select: { status: true, method: true, transactionId: true, createdAt: true } },
      },
    });
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
