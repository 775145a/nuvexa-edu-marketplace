import { prisma } from '../prisma';
import { notifyUser } from '../notification';
import { enqueueMail } from '../queue';
import { cache } from '../cache';
import { logger } from '../logger';

export interface CompleteOptions {
  transactionId?: string;
  providerRef?: string;
  phoneNumber?: string;
  metadata?: unknown;
}

export async function completeOrderAndEnroll(orderId: string, opts: CompleteOptions = {}) {
  const payment = await prisma.payment.findFirst({
    where: { orderId, status: { in: ['PENDING', 'AWAITING_CONFIRMATION'] } },
    include: {
      order: {
        include: {
          items: { include: { course: { select: { id: true, title: true, titleAr: true, instructorId: true } } } },
          student: { select: { id: true, email: true, fullName: true } },
        },
      },
    },
  });

  if (!payment) {
    return { alreadyCompleted: true, changed: false };
  }

  const order = payment.order;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        transactionId: opts.transactionId,
        providerRef: opts.providerRef,
        phoneNumber: opts.phoneNumber,
        metadata: opts.metadata !== undefined ? JSON.stringify(opts.metadata) : undefined,
      },
    });

    await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (order.referrerId && order.referrerId !== order.studentId) {
      const rewardPercent = parseFloat(process.env.REFERRAL_REWARD_PERCENT || '10');
      const base = order.total - order.taxAmount;
      const reward = Math.round((base * rewardPercent) / 100 * 100) / 100;
      const existingReferral = await tx.referral.findUnique({ where: { orderId } });
      if (!existingReferral) {
        await tx.referral.create({
          data: { referrerId: order.referrerId, orderId, reward },
        });
        await tx.user.update({
          where: { id: order.referrerId },
          data: { walletBalance: { increment: reward } },
        });
      }
    }

    for (const item of order.items) {
      await tx.enrollment.upsert({
        where: { studentId_courseId: { studentId: order.studentId, courseId: item.courseId } },
        update: {},
        create: { studentId: order.studentId, courseId: item.courseId },
      });

      await tx.course.update({
        where: { id: item.courseId },
        data: {
          enrollmentCount: { increment: 1 },
          totalRevenue: { increment: item.price },
        },
      });
    }
  });

  try {
    const studentName = order.student.fullName || 'there';
    const courseTitles = order.items.map((i) => i.course?.titleAr || i.course?.title || 'Course').join(', ');

    for (const item of order.items) {
      const course = item.course;
      if (!course) continue;

      await notifyUser(order.studentId, {
        type: 'PAYMENT',
        title: 'تم الدفع بنجاح',
        message: `تم تفعيل اشتراكك في «${course.titleAr || course.title}». استمتع بالتعلم!`,
        link: `/learn/${course.id}`,
      });

      await notifyUser(course.instructorId, {
        type: 'SALE',
        title: 'مبيعات جديدة 🎉',
        message: `اشترك ${studentName} في كورسك «${course.titleAr || course.title}».`,
      });
    }

    if (order.referrerId && order.referrerId !== order.studentId) {
      const rewardPercent = parseFloat(process.env.REFERRAL_REWARD_PERCENT || '10');
      const base = order.total - order.taxAmount;
      const reward = Math.round((base * rewardPercent) / 100 * 100) / 100;
      await notifyUser(order.referrerId, {
        type: 'REFERRAL',
        title: 'مكافأة إحالة 🎁',
        message: `تمت إضافة ${reward} ${order.currency} إلى رصيدك من مكافأة الإحالة.`,
      });
    }

    await enqueueMail({
      to: order.student.email,
      subject: `إيصال شراء من ${process.env.PLATFORM_NAME || 'Nuvexa'} - ${order.orderNumber}`,
      html: `
        <h2>شكرًا لاشتراكك، ${studentName}!</h2>
        <p>تم تأكيد الدفع للطلب <strong>${order.orderNumber}</strong> بمبلغ <strong>${order.total} ${order.currency}</strong>.</p>
        <ul>${order.items.map((i) => `<li>${i.course?.titleAr || i.course?.title} - ${i.price} ${order.currency}</li>`).join('')}</ul>
        <p>يمكنك بدء التعلم الآن.</p>
      `,
    });
  } catch (err) {
    logger.warn(`[payments] post-completion side effects failed: ${err instanceof Error ? err.message : err}`);
  }

  await cache.delByPrefix('courses:list:');
  await cache.delByPrefix('categories:');

  return { alreadyCompleted: false, changed: true };
}

export function providerNameToLabel(name: string): string {
  switch (name) {
    case 'vodafone_cash': return 'فودافون كاش';
    case 'paymob': return 'بطاقة / محفظة';
    default: return 'محفظة';
  }
}
