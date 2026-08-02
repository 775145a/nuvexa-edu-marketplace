import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { notifyUser } from '../../services/notification';
import { enqueueMail } from '../../services/queue';
import { logger } from '../../services/logger';
import { cache } from '../../services/cache';
import { getMetricsSnapshot } from '../../services/metrics';
import { completeOrderAndEnroll } from '../../services/payments/completeOrder';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/courses', async (_req: AuthRequest, res) => {
  try {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        instructor: { select: { id: true, fullName: true } },
        category: { select: { name: true } },
        _count: { select: { enrollments: true } },
      },
    });
    res.json({ success: true, data: courses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/courses/pending', async (_req: AuthRequest, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { submittedForReviewAt: 'desc' },
      include: {
        instructor: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
        category: { select: { id: true, name: true, nameAr: true } },
        _count: {
          select: {
            sections: true,
            exams: true,
            assignments: true,
            enrollments: true,
          },
        },
      },
    });

    const data = await Promise.all(
      courses.map(async (c: any) => {
        const lectureCount = await prisma.courseLecture.count({ where: { section: { courseId: c.id } } });
        const videoCount = await prisma.courseLecture.count({
          where: { section: { courseId: c.id }, videoUrl: { not: null } },
        });
        return {
          id: c.id,
          title: c.title,
          titleAr: c.titleAr,
          slug: c.slug,
          price: c.price,
          discountedPrice: c.discountedPrice,
          thumbnailUrl: c.thumbnailUrl,
          level: c.level,
          language: c.language,
          submittedForReviewAt: c.submittedForReviewAt,
          updatedAt: c.updatedAt,
          instructor: c.instructor,
          category: c.category,
          sectionsCount: c._count.sections,
          lecturesCount: lectureCount,
          videosCount: videoCount,
          examsCount: c._count.exams,
          assignmentsCount: c._count.assignments,
          enrollmentsCount: c._count.enrollments,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/courses/:id', async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructor: {
          select: {
            id: true, fullName: true, email: true, avatarUrl: true, createdAt: true,
            instructorProfile: { select: { headline: true, biography: true, isVerified: true } },
          },
        },
        category: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lectures: {
              orderBy: { order: 'asc' },
              include: { resources: { orderBy: { order: 'asc' } } },
            },
            exams: {
              orderBy: { order: 'asc' },
              include: { questions: { include: { options: { orderBy: { order: 'asc' } } } } },
            },
            assignments: {
              orderBy: { order: 'asc' },
              include: { _count: { select: { submissions: true } } },
            },
          },
        },
        approvals: { orderBy: { reviewedAt: 'desc' } },
        _count: { select: { enrollments: true, reviews: true, orders: true } },
      },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/courses/:id/review', async (req: AuthRequest, res) => {
  try {
    const { action, comments } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be APPROVED or REJECTED' });
    }

    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { instructor: { select: { fullName: true, email: true } } },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (action === 'REJECTED' && !comments) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }

    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        status: action,
        isPublished: action === 'APPROVED',
        publishedAt: action === 'APPROVED' ? new Date() : null,
        rejectionReason: action === 'REJECTED' ? comments : null,
      },
    });

    await prisma.courseApproval.create({
      data: {
        courseId: req.params.id,
        reviewerId: req.userId!,
        action,
        comments,
      },
    });

    const link = `/instructor/courses/${course.id}/manage`;
    const frontendUrl = process.env.FRONTEND_URL || 'https://nuvexa-edu.vercel.app';
    if (action === 'APPROVED') {
      await notifyUser(course.instructorId, {
        type: 'COURSE_APPROVED',
        title: 'Course approved',
        message: `Congratulations! Your course "${course.title}" has been approved and published.`,
        link,
      });
      if (course.instructor.email) {
        await enqueueMail({
          to: course.instructor.email,
          subject: `تمت الموافقة على كورسك - ${process.env.PLATFORM_NAME || 'Nuvexa'}`,
          html: `
            <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color:#0f172a; margin:0 0 8px;">أهلًا ${course.instructor.fullName}! 🎉</h2>
              <p style="color:#475569; line-height:1.7;">تمت الموافقة على كورسك <strong>«${course.titleAr || course.title}»</strong> وتم نشره للطلاب.</p>
              <a href="${frontendUrl}${link}" style="display:inline-block; margin-top:12px; background:#4f46e5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none;">إدارة الكورس</a>
            </div>
          `,
        }).catch((err) => logger.warn(`[course] approval email failed: ${err instanceof Error ? err.message : err}`));
      }
    } else {
      await notifyUser(course.instructorId, {
        type: 'COURSE_REJECTED',
        title: 'Course rejected',
        message: `Your course "${course.title}" was rejected: ${comments}`,
        link,
      });
      if (course.instructor.email) {
        await enqueueMail({
          to: course.instructor.email,
          subject: `ملاحظات على كورسك - ${process.env.PLATFORM_NAME || 'Nuvexa'}`,
          html: `
            <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color:#0f172a; margin:0 0 8px;">أهلًا ${course.instructor.fullName}،</h2>
              <p style="color:#475569; line-height:1.7;">لم تتم الموافقة على كورسك <strong>«${course.titleAr || course.title}»</strong> للأسباب التالية:</p>
              <p style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:12px; border-radius:8px; line-height:1.7;">${comments}</p>
              <p style="color:#475569; line-height:1.7;">يمكنك تعديل الكورس وإعادة إرساله للمراجعة.</p>
              <a href="${frontendUrl}${link}" style="display:inline-block; margin-top:12px; background:#4f46e5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none;">تعديل الكورس</a>
            </div>
          `,
        }).catch((err) => logger.warn(`[course] rejection email failed: ${err instanceof Error ? err.message : err}`));
      }
    }

    res.json({
      success: true,
      data: updated,
      message: action === 'APPROVED' ? 'Course approved and published' : 'Course rejected',
    });
    await cache.delByPrefix('courses:list:');
    await cache.delByPrefix('categories:');
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users', async (_req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, email: true, fullName: true, role: true, isActive: true,
        isVerified: true, createdAt: true, phone: true,
        studentProfile: { select: { country: true, occupation: true } },
        instructorProfile: { select: { headline: true, isVerified: true } },
      },
    });
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users/:id', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, fullName: true, email: true, phone: true, role: true, isActive: true,
        isVerified: true, avatarUrl: true, createdAt: true,
        studentProfile: true,
        instructorProfile: true,
        _count: { select: { courses: true, enrollments: true, certificates: true, reviews: true, orders: true } },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let courses: any[] = [];
    let stats: any = { _count: user._count };
    let activity: any = {};

    if (user.role === 'INSTRUCTOR') {
      courses = await prisma.course.findMany({
        where: { instructorId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, slug: true, price: true, discountedPrice: true, status: true,
          enrollmentCount: true, averageRating: true, totalRevenue: true, thumbnailUrl: true, createdAt: true,
          _count: { select: { enrollments: true, reviews: true } },
        },
      });
      const courseIds = courses.map((c) => c.id);
      const sales = await prisma.orderItem.findMany({
        where: { courseId: { in: courseIds }, order: { status: 'COMPLETED' } },
        select: { price: true },
      });
      const commissionRate = process.env.DEFAULT_COMMISSION_RATE ? parseFloat(process.env.DEFAULT_COMMISSION_RATE) : 15;
      const totalRevenue = courses.reduce((s, c) => s + (c.totalRevenue || 0), 0);
      stats = {
        ...stats,
        courseCount: courses.length,
        approvedCount: courses.filter((c) => c.status === 'APPROVED').length,
        pendingCount: courses.filter((c) => c.status === 'PENDING_REVIEW').length,
        rejectedCount: courses.filter((c) => c.status === 'REJECTED').length,
        totalStudents: courses.reduce((s, c) => s + (c.enrollmentCount || 0), 0),
        totalRevenue,
        salesCount: sales.length,
        averageRating: courses.length
          ? Math.round((courses.reduce((s, c) => s + (c.averageRating || 0), 0) / courses.length) * 10) / 10
          : 0,
        commissionRate,
        pendingPayout: Math.round(totalRevenue * (1 - commissionRate / 100) * 100) / 100,
      };
    } else if (user.role === 'STUDENT') {
      const [enrollments, orders] = await Promise.all([
        prisma.enrollment.findMany({
          where: { studentId: user.id },
          orderBy: { enrolledAt: 'desc' },
          take: 50,
          include: {
            course: {
              select: {
                id: true, title: true, slug: true, thumbnailUrl: true, level: true, price: true,
                instructor: { select: { fullName: true } },
              },
            },
          },
        }),
        prisma.order.findMany({
          where: { studentId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            items: { include: { course: { select: { id: true, title: true } } } },
          },
        }),
      ]);
      const totalSpent = await prisma.order.aggregate({
        where: { studentId: user.id, status: 'COMPLETED' },
        _sum: { total: true },
      });
      activity = { enrollments, orders };
      stats = {
        ...stats,
        totalSpent: totalSpent._sum.total || 0,
        completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
      };
    }

    res.json({ success: true, data: { ...user, courses, stats, activity } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id/toggle-status', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
    });

    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/orders', async (_req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        student: { select: { fullName: true, email: true } },
        items: { include: { course: { select: { title: true } } } },
        payments: { select: { status: true, method: true, amount: true } },
      },
    });
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/payments/pending', async (_req: AuthRequest, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'AWAITING_CONFIRMATION' },
      orderBy: { updatedAt: 'desc' },
      include: {
        order: {
          include: {
            student: { select: { id: true, fullName: true, email: true, phone: true } },
            items: { include: { course: { select: { id: true, title: true, titleAr: true } } } },
          },
        },
      },
    });
    res.json({ success: true, data: payments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/payments/confirm', async (req: AuthRequest, res) => {
  try {
    const { paymentId, orderId, action } = req.body;
    if (action !== 'confirm' && action !== 'reject') {
      return res.status(400).json({ success: false, message: 'action must be confirm or reject' });
    }
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId || undefined,
        orderId: orderId || undefined,
        status: 'AWAITING_CONFIRMATION',
      },
      include: { order: { select: { studentId: true, orderNumber: true } } },
    });
    if (!payment) return res.status(404).json({ success: false, message: 'No pending manual payment found' });

    if (action === 'confirm') {
      const result = await completeOrderAndEnroll(payment.orderId, {
        transactionId: payment.transactionId || undefined,
        providerRef: payment.providerRef || undefined,
        phoneNumber: payment.phoneNumber || undefined,
      });
      await notifyUser(payment.order.studentId, {
        type: 'PAYMENT',
        title: 'تم تأكيد الدفع ✅',
        message: `تم التحقق من رقم العملية وتأكيد وصول المبلغ للطلب ${payment.order.orderNumber}. كورسك مفعّل الآن.`,
        link: '/learn',
      });
      return res.json({ success: true, message: result.alreadyCompleted ? 'Payment already completed' : 'Payment confirmed and course activated' });
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'REJECTED' } });
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } });
    await notifyUser(payment.order.studentId, {
      type: 'PAYMENT',
      title: 'لم يتم تأكيد الدفع ❌',
      message: `تعذر التحقق من رقم العملية للطلب ${payment.order.orderNumber}. تواصل مع الدعم إن كان المبلغ قد وصل فعلًا.`,
      link: '/orders',
    });
    return res.json({ success: true, message: 'Payment rejected and order cancelled' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/categories', async (_req: AuthRequest, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { courses: true } } },
    });
    res.json({ success: true, data: categories });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const { name, nameAr, slug, description, icon } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, message: 'Name and slug required' });

    const category = await prisma.category.create({
      data: { name, nameAr, slug, description, icon },
    });
    res.status(201).json({ success: true, data: category });
    await cache.del('categories:all');
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Category already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/categories/:id', async (req: AuthRequest, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: category });
    await cache.del('categories:all');
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/categories/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.category.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Category disabled' });
    await cache.del('categories:all');
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/settings', async (_req: AuthRequest, res) => {
  try {
    const settings = await prisma.platformSettings.findMany();
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/settings/:key', async (req: AuthRequest, res) => {
  try {
    const setting = await prisma.platformSettings.upsert({
      where: { key: req.params.key },
      update: { value: req.body.value },
      create: { key: req.params.key, value: req.body.value },
    });
    res.json({ success: true, data: setting });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/instructors', async (_req: AuthRequest, res) => {
  try {
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR', isActive: true },
      select: {
        id: true, fullName: true, email: true, avatarUrl: true, createdAt: true,
        instructorProfile: { select: { headline: true, isVerified: true } },
        _count: { select: { courses: true } },
      },
    });
    res.json({ success: true, data: instructors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/instructors/:id/verify', async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.instructorProfile.update({
      where: { userId: req.params.id },
      data: { isVerified: req.body.verified ?? true },
    });
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/dashboard', async (_req: AuthRequest, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const paidWhere = { status: 'COMPLETED' } as any;

    const [
      users, students, instructors, courses, pendingCourses, approvedCourses,
      orders, paidOrders,
      todayOrders, weekOrders, monthOrders, yearOrders,
      revenueToday, revenueWeek, revenueMonth, revenueYear, revenueTotal,
      recentOrders, recentUsers, recentCourses, recentPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR' } }),
      prisma.course.count(),
      prisma.course.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.course.count({ where: { status: 'APPROVED' } }),
      prisma.order.count(),
      prisma.order.count({ where: paidWhere }),
      prisma.order.count({ where: { ...paidWhere, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { ...paidWhere, createdAt: { gte: startOfWeek } } }),
      prisma.order.count({ where: { ...paidWhere, createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { ...paidWhere, createdAt: { gte: startOfYear } } }),
      prisma.order.aggregate({ where: { ...paidWhere, createdAt: { gte: startOfDay } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...paidWhere, createdAt: { gte: startOfWeek } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...paidWhere, createdAt: { gte: startOfMonth } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...paidWhere, createdAt: { gte: startOfYear } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: paidWhere, _sum: { total: true } }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
          items: { include: { course: { select: { id: true, title: true, thumbnailUrl: true } } } },
        },
      }),
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, email: true, avatarUrl: true, role: true, createdAt: true },
      }),
      prisma.course.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, thumbnailUrl: true, price: true, status: true, createdAt: true, enrollmentCount: true,
          instructor: { select: { fullName: true } },
          category: { select: { name: true } },
        },
      }),
      prisma.payment.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { student: { select: { fullName: true, email: true } } } } },
      }),
    ]);

    const revenueSeries = await buildRevenueSeries();

    const topCourses = await prisma.course.findMany({
      orderBy: { enrollmentCount: 'desc' },
      take: 5,
      select: { id: true, title: true, enrollmentCount: true, totalRevenue: true, averageRating: true, thumbnailUrl: true },
    });

    res.json({
      success: true,
      data: {
        counts: {
          users, students, instructors, courses,
          pendingCourses, approvedCourses, orders, paidOrders,
          revenueToday: revenueToday._sum.total || 0,
          revenueWeek: revenueWeek._sum.total || 0,
          revenueMonth: revenueMonth._sum.total || 0,
          revenueYear: revenueYear._sum.total || 0,
          revenueTotal: revenueTotal._sum.total || 0,
          salesToday: todayOrders,
          salesWeek: weekOrders,
          salesMonth: monthOrders,
          salesYear: yearOrders,
        },
        revenueSeries,
        recentOrders,
        recentUsers,
        recentCourses,
        recentPayments,
        topCourses,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/monitoring', async (_req: AuthRequest, res) => {
  try {
    const start = Date.now();
    const dbHealth = await prisma.$queryRaw`SELECT 1 as ok`;
    const latencyMs = Date.now() - start;

    const [
      totalUsers, totalCourses, totalOrders, totalPayments, totalVideos, totalFiles,
      sessions7d, newUsers7d, newOrders7d, failedLogins, storageRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.order.count(),
      prisma.payment.count(),
      prisma.courseLecture.count({ where: { videoUrl: { not: null } } }),
      prisma.courseResource.count(),
      prisma.session.count({ where: { isActive: true, lastAccessAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.order.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.loginHistory.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.courseMedia.count(),
    ]);

    const statusBuckets = await prisma.course.groupBy({
      by: ['status'],
      _count: true,
    });

    let storageUsed = 0;
    try {
      const fs = require('fs');
      const path = require('path');
      const root = path.resolve(process.cwd(), './uploads');
      const walk = (dir: string): number => {
        let sum = 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) sum += walk(full);
          else sum += fs.statSync(full).size;
        }
        return sum;
      };
      storageUsed = fs.existsSync(root) ? walk(root) : 0;
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        uptimeSeconds: Math.floor(process.uptime()),
        dbHealth: dbHealth ? 'OK' : 'DEGRADED',
        apiLatencyMs: latencyMs,
        counts: { totalUsers, totalCourses, totalOrders, totalPayments, totalVideos, totalFiles, storageRows },
        activeSessions7d: sessions7d,
        newUsers7d,
        newOrders7d,
        failedLogins7d: failedLogins,
        storageUsedBytes: storageUsed,
        coursesByStatus: statusBuckets,
        runtime: getMetricsSnapshot(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

async function buildRevenueSeries(days = 14): Promise<Array<{ date: string; revenue: number; orders: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: since } },
    select: { total: true, createdAt: true },
  });

  const map = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { revenue: 0, orders: 0 });
  }
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    const entry = map.get(key);
    if (entry) {
      entry.revenue += o.total || 0;
      entry.orders += 1;
    }
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

export default router;
