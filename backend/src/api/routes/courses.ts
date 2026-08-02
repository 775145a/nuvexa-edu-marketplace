import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { cache } from '../../services/cache';
import { config } from '../../config';
import { Prisma } from '@prisma/client';

const router = Router();

const OTHER_CATEGORY_VALUE = '__other__';
const OTHER_CATEGORY_SLUG = 'other';

async function resolveCategoryId(categoryId: string): Promise<string> {
  if (categoryId !== OTHER_CATEGORY_VALUE) return categoryId;
  let cat = await prisma.category.findUnique({ where: { slug: OTHER_CATEGORY_SLUG } });
  if (!cat) {
    cat = await prisma.category.create({
      data: { name: 'أخرى', nameAr: 'أخرى', slug: OTHER_CATEGORY_SLUG, icon: '➕', isActive: true, order: 999 },
    });
  }
  return cat.id;
}

async function invalidateCourseLists(): Promise<void> {
  await cache.delByPrefix('courses:list:');
  await cache.delByPrefix('categories:');
}

function canEditCourse(course: { instructorId: string; status: string }, userId?: string, role?: string): boolean {
  if (role === 'ADMIN') return true;
  if (course.instructorId !== userId) return false;
  if (course.status === 'PENDING_REVIEW') return false;
  return true;
}

const isPostgres = config.db.provider === 'postgres';

export async function attachLectureStats(courses: any[]): Promise<any[]> {
  if (courses.length === 0) return courses;
  const ids = courses.map((c) => c.id);
  let stats: Record<string, { totalLectures: number; totalDuration: number }> = {};

  if (isPostgres) {
    try {
      const rows = await prisma.$queryRaw<
        { courseId: string; totalLectures: number; totalDuration: number }[]
      >(Prisma.sql`
        SELECT s."courseId" AS "courseId",
               COUNT(l.id)::int AS "totalLectures",
               COALESCE(SUM(COALESCE(l.duration, 0)), 0) AS "totalDuration"
        FROM course_sections s
        LEFT JOIN course_lectures l ON l."sectionId" = s.id
        WHERE s."courseId" IN (${Prisma.join(ids)})
        GROUP BY s."courseId"
      `);
      for (const r of rows) stats[r.courseId] = { totalLectures: r.totalLectures, totalDuration: r.totalDuration };
    } catch (err) {
      console.warn('lecture stats aggregation failed', (err as Error).message);
    }
  }

  if (Object.keys(stats).length === 0) {
    const sections = await prisma.courseSection.findMany({
      where: { courseId: { in: ids } },
      select: { courseId: true, lectures: { select: { duration: true } } },
    });
    for (const s of sections) {
      const cur = stats[s.courseId] || { totalLectures: 0, totalDuration: 0 };
      cur.totalLectures += s.lectures.length;
      cur.totalDuration += s.lectures.reduce((sum, l) => sum + (l.duration || 0), 0);
      stats[s.courseId] = cur;
    }
  }

  return courses.map((c) => ({
    ...c,
    totalLectures: stats[c.id]?.totalLectures ?? c.totalLectures ?? 0,
    totalDuration: stats[c.id]?.totalDuration ?? 0,
  }));
}

async function buildSearchWhere(search: string, baseWhere: any): Promise<any> {
  const where: any = { ...baseWhere };
  if (!search) return where;

  const term = search.trim();
  if (!term) return where;

  if (isPostgres) {
    try {
      const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT c.id
        FROM courses c
        JOIN categories cat ON cat.id = c."categoryId"
        WHERE c.status = 'APPROVED'
          AND c."isPublished" = ${baseWhere.isPublished ?? true}
          ${baseWhere.categoryId ? Prisma.sql`AND c."categoryId" = ${baseWhere.categoryId}` : Prisma.empty}
          ${baseWhere.level ? Prisma.sql`AND c.level = ${baseWhere.level}` : Prisma.empty}
          AND (
            to_tsvector('simple', coalesce(c.title, '')) @@ websearch_to_tsquery('simple', ${term})
            OR to_tsvector('simple', coalesce(c."titleAr", '')) @@ websearch_to_tsquery('simple', ${term})
            OR to_tsvector('simple', coalesce(c."shortDescription", '')) @@ websearch_to_tsquery('simple', ${term})
            OR to_tsvector('simple', coalesce(c."shortDescriptionAr", '')) @@ websearch_to_tsquery('simple', ${term})
            OR to_tsvector('simple', coalesce(c.tags, '')) @@ websearch_to_tsquery('simple', ${term})
          )
      `);
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) return { ...baseWhere, id: { in: [] } };
      where.id = { in: ids };
      return where;
    } catch (err) {
      console.warn('Postgres FTS search failed, falling back to LIKE', (err as Error).message);
    }
  }

  where.OR = [
    { title: { contains: term } },
    { titleAr: { contains: term } },
    { shortDescription: { contains: term } },
    { shortDescriptionAr: { contains: term } },
    { tags: { contains: term } },
  ];
  return where;
}

router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '12', category, level, search, sort = 'newest' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: 'APPROVED' };
    if (category) where.categoryId = category as string;
    if (level) where.level = level as string;
    const finalWhere = await buildSearchWhere((search as string) || '', where);

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'popular') orderBy = { enrollmentCount: 'desc' };
    if (sort === 'rating') orderBy = { averageRating: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };

    const cacheKey = `courses:list:${pageNum}:${limitNum}:${category || ''}:${level || ''}:${search || ''}:${sort}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [coursesRaw, total] = await Promise.all([
      prisma.course.findMany({
        where: finalWhere,
        orderBy,
        skip,
        take: limitNum,
        include: {
          instructor: { select: { id: true, fullName: true, avatarUrl: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
      prisma.course.count({ where: finalWhere }),
    ]);

    const courses = await attachLectureStats(coursesRaw);

    const result = {
      success: true,
      data: courses,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
    await cache.set(cacheKey, result);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/id/:id', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructor: { select: { id: true, fullName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lectures: { orderBy: { order: 'asc' } },
            exams: { select: { id: true, title: true, duration: true, passingScore: true } },
          },
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/mine', authenticate, async (req: AuthRequest, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where = req.userRole === 'ADMIN'
      ? undefined
      : { instructorId: req.userId, status: { not: 'DELETED' } };
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          instructor: { select: { id: true, fullName: true, avatarUrl: true } },
          category: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, reviews: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);
    res.json({
      success: true,
      data: courses,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/manage/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lectures: {
              orderBy: { order: 'asc' },
              include: { resources: { orderBy: { order: 'asc' } } },
            },
            exams: { orderBy: { order: 'asc' }, include: { questions: { include: { options: { orderBy: { order: 'asc' } } } } } },
            assignments: { orderBy: { order: 'asc' } },
          },
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        sections: { select: { id: true, lectures: { select: { id: true } } } },
      },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const lectureIds = course.sections.flatMap((s) => s.lectures.map((l) => l.id));
    const progress = await prisma.lectureProgress.findMany({
      where: { studentId: req.userId, lectureId: { in: lectureIds } },
    });

    const byLecture = Object.fromEntries(progress.map((p) => [p.lectureId, p]));
    const total = lectureIds.length;
    const completed = progress.filter((p) => p.completed).length;

    res.json({
      success: true,
      data: {
        lectureIds,
        progress: byLecture,
        total,
        completed,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { slug: req.params.slug },
      include: {
        instructor: {
          select: { id: true, fullName: true, avatarUrl: true },
          include: { instructorProfile: { select: { headline: true, biography: true } } },
        },
        category: true,
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lectures: { orderBy: { order: 'asc' }, include: { _count: { select: { resources: true } } } },
            exams: { where: { isPublished: true }, select: { id: true, title: true, duration: true, passingScore: true } },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { student: { select: { id: true, fullName: true, avatarUrl: true } } },
        },
        _count: { select: { enrollments: true, reviews: true } },
      },
    });

    if (!course || course.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'INSTRUCTOR' && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only instructors can create courses' });
    }

    const { title, description, price, categoryId, level, language, shortDescription, customFieldAr, customFieldEn } = req.body;
    if (!title || !description || !price || !categoryId) {
      return res.status(400).json({ success: false, message: 'Title, description, price, and category are required' });
    }
    if (categoryId === OTHER_CATEGORY_VALUE && !customFieldAr) {
      return res.status(400).json({ success: false, message: 'Course field in Arabic is required' });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const course = await prisma.course.create({
      data: {
        title,
        slug,
        description,
        shortDescription,
        price: parseFloat(price),
        level: level || 'ALL_LEVELS',
        language: language || 'Arabic',
        categoryId: await resolveCategoryId(categoryId),
        customFieldAr: customFieldAr || null,
        customFieldEn: customFieldEn || null,
        instructorId: req.userId!,
        status: req.userRole === 'ADMIN' ? 'APPROVED' : 'DRAFT',
        isPublished: req.userRole === 'ADMIN',
      },
    });

    res.status(201).json({ success: true, data: course });
    await invalidateCourseLists();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/submit-review', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (course.status === 'PENDING_REVIEW') {
      return res.status(400).json({ success: false, message: 'Course is already under review' });
    }
    if (course.status === 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Course is already approved and published' });
    }

    const sectionCount = await prisma.courseSection.count({ where: { courseId: course.id } });
    const lectureCount = await prisma.courseLecture.count({ where: { section: { courseId: course.id } } });

    if (!course.title || !course.description || !course.price || !course.categoryId) {
      return res.status(400).json({ success: false, message: 'Complete title, description, price, and category before submitting' });
    }
    const cat = await prisma.category.findUnique({ where: { id: course.categoryId } });
    if (cat?.slug === OTHER_CATEGORY_SLUG && !course.customFieldAr) {
      return res.status(400).json({ success: false, message: 'Course field in Arabic is required' });
    }
    if (sectionCount === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one section before submitting' });
    }
    if (lectureCount === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one lecture before submitting' });
    }

    const updated = await prisma.course.update({
      where: { id: course.id },
      data: {
        status: 'PENDING_REVIEW',
        isPublished: false,
        submittedForReviewAt: new Date(),
        rejectionReason: null,
      },
    });

    res.json({
      success: true,
      message: 'Course submitted for review successfully',
      data: updated,
    });
    await invalidateCourseLists();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!canEditCourse(course, req.userId, req.userRole)) {
      if (course.instructorId !== req.userId) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      return res.status(409).json({ success: false, message: 'Course is under review and cannot be edited. Wait for the review result.' });
    }

    const EDITABLE_FIELDS = [
      'title', 'titleAr', 'description', 'descriptionAr', 'shortDescription', 'shortDescriptionAr',
      'price', 'discountedPrice', 'level', 'language', 'thumbnailUrl', 'promoVideoUrl',
      'requirements', 'requirementsAr', 'objectives', 'objectivesAr',
      'targetAudience', 'targetAudienceAr', 'tags', 'tagsAr',
      'customFieldAr', 'customFieldEn', 'allowCertificate', 'categoryId',
    ];

    const body: any = {};
    for (const key of EDITABLE_FIELDS) {
      if (req.body[key] !== undefined) body[key] = req.body[key];
    }

    if (body.price !== undefined) {
      const price = parseFloat(body.price);
      if (isNaN(price) || price < 0 || price > 1_000_000) {
        return res.status(400).json({ success: false, message: 'Price must be a number between 0 and 1,000,000' });
      }
      body.price = price;
    }
    if (body.discountedPrice !== undefined && body.discountedPrice !== null) {
      const discounted = parseFloat(body.discountedPrice);
      if (isNaN(discounted) || discounted < 0 || discounted > (body.price ?? course.price)) {
        return res.status(400).json({ success: false, message: 'Discounted price must be a valid number below the base price' });
      }
      body.discountedPrice = discounted;
    }

    if (body.categoryId) body.categoryId = await resolveCategoryId(body.categoryId);
    if (body.customFieldAr === '') body.customFieldAr = null;
    if (body.customFieldEn === '') body.customFieldEn = null;
    const categoryId = body.categoryId;
    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (category?.slug !== OTHER_CATEGORY_SLUG) {
        body.customFieldAr = null;
        body.customFieldEn = null;
      }
    }

    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data: { ...body },
    });

    res.json({ success: true, data: updated });
    await invalidateCourseLists();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const isAdmin = req.userRole === 'ADMIN';
    if (!isAdmin && course.instructorId !== req.userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own courses' });
    }

    const deleted = await prisma.course.update({
      where: { id: req.params.id },
      data: { status: 'DELETED', isPublished: false },
    });

    res.json({ success: true, message: 'Course deleted successfully', data: deleted });
    await invalidateCourseLists();
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
