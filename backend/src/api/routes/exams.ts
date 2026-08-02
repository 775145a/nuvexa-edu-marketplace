import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config } from '../../config';
import { verifyAccessToken, JwtPayload } from '../../services/auth';

const router = Router();

async function getExamWithCourse(examId: string) {
  return prisma.exam.findUnique({
    where: { id: examId },
    include: { course: { select: { instructorId: true } } },
  });
}

router.post('/courses/:courseId/exams', authenticate, async (req: AuthRequest, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, titleAr, description, descriptionAr, duration, passingScore, maxAttempts, sectionId, order } = req.body;
    if (!title || !duration) return res.status(400).json({ success: false, message: 'Title and duration are required' });

    const maxOrder = order ?? (await prisma.exam.aggregate({
      where: { courseId: req.params.courseId },
      _max: { order: true },
    }))._max.order ?? -1;

    const exam = await prisma.exam.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        duration: parseInt(duration),
        passingScore: passingScore ? parseFloat(passingScore) : 50,
        maxAttempts: maxAttempts ? parseInt(maxAttempts) : 3,
        isPublished: true,
        order: order ?? maxOrder + 1,
        courseId: req.params.courseId,
        sectionId,
      },
    });

    res.status(201).json({ success: true, data: exam });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/exams/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await getExamWithCourse(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, titleAr, description, descriptionAr, duration, passingScore, maxAttempts, sectionId, order, isPublished, shuffleQuestions, showResultImmediately } = req.body;

    const updated = await prisma.exam.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleAr !== undefined && { titleAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(passingScore !== undefined && { passingScore: parseFloat(passingScore) }),
        ...(maxAttempts !== undefined && { maxAttempts: parseInt(maxAttempts) }),
        ...(sectionId !== undefined && { sectionId }),
        ...(order !== undefined && { order }),
        ...(isPublished !== undefined && { isPublished }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(showResultImmediately !== undefined && { showResultImmediately }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/exams/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await getExamWithCourse(req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.exam.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/exams/:examId/questions', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await getExamWithCourse(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { text, textAr, type, score, order, options } = req.body;
    if (!text || !type || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Question text, type, and at least 2 options are required' });
    }

    const maxOrder = order ?? (await prisma.examQuestion.aggregate({
      where: { examId: req.params.examId },
      _max: { order: true },
    }))._max.order ?? -1;

    const question = await prisma.examQuestion.create({
      data: {
        text,
        textAr,
        type,
        score: score ? parseFloat(score) : 1,
        order: order ?? maxOrder + 1,
        examId: req.params.examId,
        options: {
          create: options.map((opt: any, idx: number) => ({
            text: opt.text,
            textAr: opt.textAr,
            isCorrect: opt.isCorrect ?? false,
            order: opt.order ?? idx,
          })),
        },
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json({ success: true, data: question });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/questions/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const question = await prisma.examQuestion.findUnique({
      where: { id: req.params.id },
      include: { exam: { include: { course: { select: { instructorId: true } } } } },
    });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    if (question.exam.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { text, textAr, type, score, order, options } = req.body;

    if (options && Array.isArray(options)) {
      await prisma.examOption.deleteMany({ where: { questionId: req.params.id } });
      await prisma.examOption.createMany({
        data: options.map((opt: any, idx: number) => ({
          text: opt.text,
          textAr: opt.textAr,
          isCorrect: opt.isCorrect ?? false,
          order: opt.order ?? idx,
          questionId: req.params.id,
        })),
      });
    }

    const updated = await prisma.examQuestion.update({
      where: { id: req.params.id },
      data: {
        ...(text !== undefined && { text }),
        ...(textAr !== undefined && { textAr }),
        ...(type !== undefined && { type }),
        ...(score !== undefined && { score: parseFloat(score) }),
        ...(order !== undefined && { order }),
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/questions/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const question = await prisma.examQuestion.findUnique({
      where: { id: req.params.id },
      include: { exam: { include: { course: { select: { instructorId: true } } } } },
    });
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    if (question.exam.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.examQuestion.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Question deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId', async (req, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.examId },
      include: {
        course: { select: { id: true, instructorId: true, title: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    let userId: string | undefined;
    let userRole: string | undefined;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      try {
        const decoded = verifyAccessToken(header.split(' ')[1]);
        userId = decoded.userId;
        userRole = decoded.role;
      } catch {
        // treat invalid token as anonymous
      }
    }

    const isOwner = exam.course.instructorId === userId || userRole === 'ADMIN';

    if (isOwner) {
      return res.json({ success: true, data: exam });
    }

    const { questions, course, ...examMeta } = exam;

    if (!userId) {
      return res.json({ success: true, data: { ...examMeta, questions: [] } });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: course.id } },
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'You must be enrolled in this course' });
    }

    const safeQuestions = questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      textAr: q.textAr,
      type: q.type,
      score: q.score,
      order: q.order,
      options: q.options.map((opt: any) => {
        const { isCorrect: _isCorrect, ...rest } = opt;
        return rest;
      }),
    }));

    res.json({ success: true, data: { ...examMeta, questions: safeQuestions } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/exams/:examId/submit', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: req.params.examId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: req.userId!, courseId: exam.courseId } },
    });
    if (!enrollment) return res.status(403).json({ success: false, message: 'You must be enrolled in this course' });

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Answers array is required' });
    }

    const attemptCount = await prisma.examResult.count({
      where: { examId: req.params.examId, studentId: req.userId! },
    });
    if (attemptCount >= exam.maxAttempts) {
      return res.status(403).json({ success: false, message: 'Maximum attempts reached' });
    }

    const correctMap = new Map<string, string>();
    const questionScoreMap = new Map<string, number>();
    for (const q of exam.questions) {
      questionScoreMap.set(q.id, q.score);
      for (const opt of q.options) {
        if (opt.isCorrect) {
          correctMap.set(q.id, opt.id);
          break;
        }
      }
    }

    let score = 0;
    let totalScore = 0;
    const gradedAnswers: any[] = [];

    for (const q of exam.questions) {
      totalScore += q.score;
      const submitted = answers.find((a: any) => a.questionId === q.id);
      const selectedOptionId = submitted?.selectedOptionId || null;
      const correctOptionId = correctMap.get(q.id) || null;
      const isCorrect = selectedOptionId === correctOptionId;

      if (isCorrect) {
        score += q.score;
      }

      gradedAnswers.push({
        questionId: q.id,
        selectedOptionId,
        correctOptionId,
        isCorrect,
        score: q.score,
        earned: isCorrect ? q.score : 0,
      });
    }

    const percentage = totalScore > 0 ? Math.round((score / totalScore) * 100 * 100) / 100 : 0;
    const passed = percentage >= exam.passingScore;

    const result = await prisma.examResult.create({
      data: {
        score,
        totalScore,
        percentage,
        passed,
        startedAt: new Date(),
        completedAt: new Date(),
        attemptNumber: attemptCount + 1,
        answers: JSON.stringify(gradedAnswers),
        examId: req.params.examId,
        studentId: req.userId!,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: result.id,
        score: result.score,
        totalScore: result.totalScore,
        percentage: result.percentage,
        passed: result.passed,
        attemptNumber: result.attemptNumber,
        answers: gradedAnswers,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/results', authenticate, async (req: AuthRequest, res) => {
  try {
    const exam = await getExamWithCourse(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (exam.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const results = await prisma.examResult.findMany({
      where: { examId: req.params.examId },
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    });

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/exams/:examId/my-result', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await prisma.examResult.findFirst({
      where: { examId: req.params.examId, studentId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    if (!result) return res.status(404).json({ success: false, message: 'No result found' });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
