import { Router } from 'express';
import authRoutes from './auth';
import courseRoutes from './courses';
import categoryRoutes from './categories';
import orderRoutes from './orders';
import adminRoutes from './admin';
import sectionRoutes from './sections';
import lectureRoutes from './lectures';
import examRoutes from './exams';
import paymentRoutes from './payments';
import assignmentRoutes from './assignments';
import storageRoutes from './storage';
import videoJobRoutes from './videoJobs';
import couponRoutes from './coupons';
import lectureCommentRoutes from './lectureComments';
import { prisma } from '../../services/prisma';
import { attachLectureStats } from './courses';

const router = Router();

const coursePublicInclude = {
  instructor: { select: { id: true, fullName: true, avatarUrl: true } },
  category: { select: { id: true, name: true, nameAr: true, slug: true } },
  _count: { select: { enrollments: true, reviews: true } },
};

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/', sectionRoutes);
router.use('/', lectureRoutes);
router.use('/', examRoutes);
router.use('/', assignmentRoutes);
router.use('/', storageRoutes);
router.use('/', videoJobRoutes);
router.use('/coupons', couponRoutes);
router.use('/', lectureCommentRoutes);

router.get('/stats', async (_req, res) => {
  try {
    const [
      approvedCourses,
      students,
      instructors,
      users,
      enrollments,
      completedOrders,
      reviews,
      latest,
      topSelling,
      topRated,
    ] = await Promise.all([
      prisma.course.count({ where: { status: 'APPROVED' } }),
      prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      prisma.user.count({ where: { role: 'INSTRUCTOR', isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.enrollment.count(),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.review.count(),
      prisma.course.findMany({
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: coursePublicInclude,
      }),
      prisma.course.findMany({
        where: { status: 'APPROVED' },
        orderBy: { enrollmentCount: 'desc' },
        take: 8,
        include: coursePublicInclude,
      }),
      prisma.course.findMany({
        where: { status: 'APPROVED', averageRating: { gt: 0 } },
        orderBy: [{ averageRating: 'desc' }, { enrollmentCount: 'desc' }],
        take: 8,
        include: coursePublicInclude,
      }),
    ]);

    const [latestWithStats, topSellingWithStats, topRatedWithStats] = await Promise.all([
      attachLectureStats(latest),
      attachLectureStats(topSelling),
      attachLectureStats(topRated),
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          courses: approvedCourses,
          students,
          instructors,
          users,
          enrollments,
          sales: completedOrders,
          reviews,
        },
        latest: latestWithStats,
        topSelling: topSellingWithStats,
        topRated: topRatedWithStats,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reviews', async (_req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true, titleAr: true, slug: true } },
      },
    });
    res.json({ success: true, data: reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/instructors', async (_req, res) => {
  try {
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR', isActive: true },
      select: {
        id: true, fullName: true, email: true, avatarUrl: true,
        instructorProfile: { select: { headline: true, isVerified: true, biography: true } },
        _count: { select: { courses: true } },
      },
    });
    res.json({ success: true, data: instructors });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/instructors/:id', async (req, res) => {
  try {
    const instructor = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, fullName: true, avatarUrl: true,
        instructorProfile: { select: { headline: true, biography: true, website: true, linkedin: true, skills: true } },
        courses: {
          where: { status: 'APPROVED' },
          select: { id: true, title: true, slug: true, price: true, thumbnailUrl: true, level: true, averageRating: true, enrollmentCount: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { courses: true } },
      },
    });
    if (!instructor) return res.status(404).json({ success: false, message: 'Instructor not found' });
    res.json({ success: true, data: instructor });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/enrolled', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(header.split(' ')[1], process.env.JWT_SECRET || '') as any;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: decoded.userId },
      include: {
        course: {
          include: {
            instructor: { select: { fullName: true } },
            category: { select: { name: true } },
            sections: { select: { id: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    res.json({ success: true, data: enrollments });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.get('/enrolled/:courseId', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(header.split(' ')[1], process.env.JWT_SECRET || '') as any;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: decoded.userId, courseId: req.params.courseId },
      },
    });

    res.json({ success: true, data: { enrolled: !!enrollment } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.get('/instructor/dashboard', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(header.split(' ')[1], process.env.JWT_SECRET || '') as any;

    const instructorId = decoded.userId;

    const [courses, courseCount, publishedCount, pendingCount, rejectedCount] = await Promise.all([
      prisma.course.findMany({
        where: { instructorId },
        select: {
          id: true, title: true, status: true, price: true, discountedPrice: true,
          enrollmentCount: true, averageRating: true, totalRevenue: true, thumbnailUrl: true, createdAt: true,
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
      prisma.course.count({ where: { instructorId } }),
      prisma.course.count({ where: { instructorId, status: 'APPROVED' } }),
      prisma.course.count({ where: { instructorId, status: 'PENDING_REVIEW' } }),
      prisma.course.count({ where: { instructorId, status: 'REJECTED' } }),
    ]);

    const courseIds = courses.map((c) => c.id);
    const sales = await prisma.orderItem.findMany({
      where: { courseId: { in: courseIds }, order: { status: 'COMPLETED' } },
      select: { price: true, createdAt: true, courseId: true },
    });

    const totalStudents = courses.reduce((s, c) => s + (c.enrollmentCount || 0), 0);
    const totalRevenue = courses.reduce((s, c) => s + (c.totalRevenue || 0), 0);
    const salesCount = sales.length;
    const averageRating = courses.length > 0
      ? Math.round((courses.reduce((s, c) => s + (c.averageRating || 0), 0) / courses.length) * 10) / 10
      : 0;
    const commissionRate = process.env.DEFAULT_COMMISSION_RATE ? parseFloat(process.env.DEFAULT_COMMISSION_RATE) : 15;
    const pendingPayout = totalRevenue * (1 - commissionRate / 100);

    const seriesMap = new Map<string, { revenue: number; sales: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      seriesMap.set(d.toISOString().slice(0, 10), { revenue: 0, sales: 0 });
    }
    for (const s of sales) {
      const key = s.createdAt.toISOString().slice(0, 10);
      const entry = seriesMap.get(key);
      if (entry) {
        entry.revenue += s.price || 0;
        entry.sales += 1;
      }
    }

    const latestSales = await prisma.order.findMany({
      where: { status: 'COMPLETED', items: { some: { courseId: { in: courseIds } } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        student: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        items: { where: { courseId: { in: courseIds } }, include: { course: { select: { id: true, title: true, thumbnailUrl: true } } } },
      },
    });

    const topCourses = [...courses]
      .sort((a: any, b: any) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0))
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        stats: {
          courseCount, publishedCount, pendingCount, rejectedCount,
          totalStudents, totalRevenue, pendingPayout, salesCount, averageRating,
        },
        revenueSeries: Array.from(seriesMap.entries()).map(([date, v]) => ({ date, ...v })),
        latestSales,
        topCourses,
        courses,
      },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.get('/student/dashboard', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(header.split(' ')[1], process.env.JWT_SECRET || '') as any;
    const studentId = decoded.userId;

    const [enrollments, certificates, notifications, unreadCount, examResults, assignments] = await Promise.all([
      prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            select: {
              id: true, title: true, titleAr: true, thumbnailUrl: true, level: true, price: true,
              averageRating: true, enrollmentCount: true, slug: true,
              instructor: { select: { fullName: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { lastAccessedAt: 'desc' },
      }),
      prisma.certificate.findMany({
        where: { studentId },
        include: { course: { select: { id: true, title: true, thumbnailUrl: true } } },
        orderBy: { completionDate: 'desc' },
      }),
      prisma.notification.findMany({
        where: { userId: studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.notification.count({ where: { userId: studentId, isRead: false } }),
      prisma.examResult.findMany({
        where: { studentId },
        include: { exam: { select: { id: true, title: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: { assignment: { select: { id: true, title: true, courseId: true } } },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
    ]);

    const continueLearning = await prisma.lectureProgress.findMany({
      where: { studentId, completed: false },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        lecture: {
          select: {
            id: true, title: true, thumbnailUrl: true, duration: true,
            section: { select: { id: true, title: true, course: { select: { id: true, title: true, thumbnailUrl: true, slug: true } } } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        enrollments,
        certificates,
        notifications,
        unreadCount,
        examResults,
        assignmentSubmissions: assignments,
        continueLearning,
      },
    });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(header.split(' ')[1], process.env.JWT_SECRET || '') as any;

    const notifications = await prisma.notification.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ success: true, data: notifications });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(header.split(' ')[1], process.env.JWT_SECRET || '') as any;

    await prisma.notification.updateMany({
      where: { userId: decoded.userId, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

export default router;
