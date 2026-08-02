import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getRequestUser, canAccessCourse, sanitizeLectures } from '../../services/access';

const router = Router();

router.get('/courses/:courseId/sections', async (req, res) => {
  try {
    const sections = await prisma.courseSection.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { order: 'asc' },
      include: {
        lectures: { orderBy: { order: 'asc' } },
        exams: { where: { isPublished: true }, select: { id: true, title: true, titleAr: true, duration: true, passingScore: true } },
      },
    });
    const viewer = getRequestUser(req);
    const hasAccess = await canAccessCourse(req.params.courseId, viewer.userId, viewer.role);
    for (const section of sections) {
      section.lectures = sanitizeLectures(section.lectures, hasAccess);
    }
    res.json({ success: true, data: sections });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/courses/:courseId/sections', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, titleAr, description, descriptionAr, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const maxOrder = order ?? (await prisma.courseSection.aggregate({
      where: { courseId: req.params.courseId },
      _max: { order: true },
    }))._max.order ?? -1;

    const section = await prisma.courseSection.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        order: order ?? maxOrder + 1,
        courseId: req.params.courseId,
      },
    });

    res.status(201).json({ success: true, data: section });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/sections/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const section = await prisma.courseSection.findUnique({
      where: { id: req.params.id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    if (section.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await prisma.courseSection.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/sections/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const section = await prisma.courseSection.findUnique({
      where: { id: req.params.id },
      include: { course: { select: { instructorId: true } } },
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    if (section.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.courseSection.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Section deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/sections/:sectionId/lectures', async (req, res) => {
  try {
    const section = await prisma.courseSection.findUnique({
      where: { id: req.params.sectionId },
      select: { courseId: true },
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const lectures = await prisma.courseLecture.findMany({
      where: { sectionId: req.params.sectionId },
      orderBy: { order: 'asc' },
    });
    const viewer = getRequestUser(req);
    const hasAccess = await canAccessCourse(section.courseId, viewer.userId, viewer.role);
    res.json({ success: true, data: sanitizeLectures(lectures, hasAccess) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sections/:sectionId/lectures', authenticate, async (req: AuthRequest, res) => {
  try {
    const section = await prisma.courseSection.findUnique({
      where: { id: req.params.sectionId },
      include: { course: { select: { instructorId: true } } },
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });
    if (section.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, titleAr, description, descriptionAr, videoUrl, duration, isFree, isPreview, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const maxOrder = order ?? (await prisma.courseLecture.aggregate({
      where: { sectionId: req.params.sectionId },
      _max: { order: true },
    }))._max.order ?? -1;

    const lecture = await prisma.courseLecture.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        videoUrl,
        duration: duration ? parseInt(duration) : undefined,
        isFree: isFree ?? false,
        isPreview: isPreview ?? false,
        order: order ?? maxOrder + 1,
        sectionId: req.params.sectionId,
      },
    });

    res.status(201).json({ success: true, data: lecture });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
