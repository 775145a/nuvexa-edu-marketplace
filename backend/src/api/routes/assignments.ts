import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

async function getAssignmentWithCourse(id: string) {
  return prisma.assignment.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, instructorId: true, title: true } },
      section: { select: { id: true, title: true } },
    },
  });
}

router.get('/courses/:courseId/assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      select: { instructorId: true, status: true },
    });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const isOwner = course.instructorId === req.userId || req.userRole === 'ADMIN';

    const assignments = await prisma.assignment.findMany({
      where: { courseId: req.params.courseId, ...(isOwner ? {} : { isPublished: true }) },
      orderBy: { order: 'asc' },
      include: { _count: { select: { submissions: true } } },
    });

    res.json({ success: true, data: assignments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/courses/:courseId/assignments', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, titleAr, description, descriptionAr, dueDate, totalScore, passingScore, sectionId, isPublished, order } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const maxOrder = order ?? (await prisma.assignment.aggregate({
      where: { courseId: req.params.courseId },
      _max: { order: true },
    }))._max.order ?? -1;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        totalScore: totalScore ? parseFloat(totalScore) : 100,
        passingScore: passingScore ? parseFloat(passingScore) : 50,
        isPublished: isPublished ?? true,
        order: order ?? maxOrder + 1,
        courseId: req.params.courseId,
        sectionId: sectionId || undefined,
      },
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/assignments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const assignment = await getAssignmentWithCourse(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const data: any = { ...req.body };
    if (data.dueDate !== undefined) data.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.totalScore !== undefined) data.totalScore = parseFloat(data.totalScore);
    if (data.passingScore !== undefined) data.passingScore = parseFloat(data.passingScore);

    const updated = await prisma.assignment.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/assignments/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const assignment = await getAssignmentWithCourse(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await prisma.assignment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/assignments/:id/submissions', authenticate, async (req: AuthRequest, res) => {
  try {
    const assignment = await getAssignmentWithCourse(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId: req.params.id },
      include: { student: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    res.json({ success: true, data: submissions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/assignment-submissions/:id/grade', authenticate, async (req: AuthRequest, res) => {
  try {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: req.params.id },
      include: { assignment: { include: { course: { select: { instructorId: true } } } } },
    });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (submission.assignment.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { score, feedback } = req.body;
    const updated = await prisma.assignmentSubmission.update({
      where: { id: req.params.id },
      data: { score: score !== undefined ? parseFloat(score) : undefined, feedback, gradedAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assignments/:id/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const assignment = await getAssignmentWithCourse(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (!assignment.isPublished) return res.status(400).json({ success: false, message: 'Assignment is not published' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: req.userId!, courseId: assignment.course.id } },
    });
    if (!enrollment) return res.status(403).json({ success: false, message: 'You must enroll in the course first' });

    const { content, fileUrl } = req.body;
    if (!content && !fileUrl) return res.status(400).json({ success: false, message: 'Provide content or a file' });

    const submission = await prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.userId! } },
      update: { content, fileUrl, submittedAt: new Date() },
      create: { assignmentId: assignment.id, studentId: req.userId!, content, fileUrl },
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
