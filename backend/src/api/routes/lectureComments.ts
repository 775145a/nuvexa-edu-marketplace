import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

async function canInteract(lectureId: string, userId: string, role?: string): Promise<boolean> {
  if (role === 'ADMIN') return true;
  const lecture = await prisma.courseLecture.findUnique({
    where: { id: lectureId },
    select: { isFree: true, isPreview: true, section: { select: { course: { select: { instructorId: true, id: true } } } } },
  });
  if (!lecture) return false;
  if (lecture.section.course.instructorId === userId) return true;
  if (lecture.isFree || lecture.isPreview) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: userId, courseId: lecture.section.course.id } },
  });
  return !!enrollment;
}

router.get('/lectures/:lectureId/questions', async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    const lecture = await prisma.courseLecture.findUnique({ where: { id: lectureId } });
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    const where = { lectureId, parentId: null };
    const [total, questions] = await Promise.all([
      prisma.lectureComment.count({ where }),
      prisma.lectureComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true, role: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: questions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/lectures/:lectureId/questions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { lectureId } = req.params;
    const { body } = req.body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: 'Question body required' });
    }
    const allowed = await canInteract(lectureId, req.userId!, req.userRole);
    if (!allowed) return res.status(403).json({ success: false, message: 'Enroll in the course to ask questions' });

    const comment = await prisma.lectureComment.create({
      data: { lectureId, userId: req.userId!, body: String(body).trim() },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
    });

    const lecture = await prisma.courseLecture.findUnique({
      where: { id: lectureId },
      select: { title: true, titleAr: true, section: { select: { course: { select: { instructorId: true } } } } },
    });
    if (lecture && lecture.section.course.instructorId !== req.userId) {
      const { notifyUser } = await import('../../services/notification');
      await notifyUser(lecture.section.course.instructorId, {
        type: 'QA',
        title: 'سؤال جديد',
        message: `سؤال جديد على المحاضرة «${lecture.titleAr || lecture.title}»`,
        link: `/learn/${lectureId}`,
      });
    }

    res.status(201).json({ success: true, data: comment });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/questions/:questionId/reply', authenticate, async (req: AuthRequest, res) => {
  try {
    const { questionId } = req.params;
    const { body } = req.body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: 'Reply body required' });
    }
    const question = await prisma.lectureComment.findUnique({
      where: { id: questionId },
      select: { lectureId: true, userId: true },
    });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    const allowed = await canInteract(question.lectureId, req.userId!, req.userRole);
    if (!allowed) return res.status(403).json({ success: false, message: 'Not authorized' });

    const reply = await prisma.lectureComment.create({
      data: { lectureId: question.lectureId, userId: req.userId!, body: String(body).trim(), parentId: questionId },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true, role: true } } },
    });

    if (question.userId !== req.userId) {
      const { notifyUser } = await import('../../services/notification');
      await notifyUser(question.userId, {
        type: 'QA',
        title: 'إجابة على سؤالك',
        message: 'تمت الإجابة على سؤالك في المحاضرة',
        link: `/learn/${question.lectureId}`,
      });
    }

    res.status(201).json({ success: true, data: reply });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/comments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const comment = await prisma.lectureComment.findUnique({
      where: { id: req.params.id },
      include: { lecture: { select: { section: { select: { course: { select: { instructorId: true } } } } } } },
    });
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    const isOwner = comment.userId === req.userId;
    const isInstructor = comment.lecture.section.course.instructorId === req.userId;
    const isAdmin = req.userRole === 'ADMIN';
    if (!isOwner && !isInstructor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await prisma.lectureComment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
