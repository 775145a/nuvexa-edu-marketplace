import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notifyUser } from '../../services/notification';
import { enqueueMail } from '../../services/queue';
import { logger } from '../../services/logger';

const router = Router();

async function getLectureWithCourse(lectureId: string) {
  return prisma.courseLecture.findUnique({
    where: { id: lectureId },
    include: {
      section: {
        include: { course: { select: { id: true, instructorId: true } } },
      },
    },
  });
}

function canEdit(lecture: any, userId?: string, role?: string): boolean {
  if (role === 'ADMIN') return true;
  if (lecture.section.course.instructorId !== userId) return false;
  return true;
}

router.put('/lectures/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const lecture = await getLectureWithCourse(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    if (!canEdit(lecture, req.userId, req.userRole)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const {
      title, titleAr, description, descriptionAr,
      videoUrl, videoStorageKey, duration, thumbnailUrl, thumbnailStorageKey,
      fileName, fileSize, mimeType, isFree, isPreview, order,
    } = req.body;

    const updated = await prisma.courseLecture.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleAr !== undefined && { titleAr }),
        ...(description !== undefined && { description }),
        ...(descriptionAr !== undefined && { descriptionAr }),
        ...(videoUrl !== undefined && { videoUrl }),
        ...(videoStorageKey !== undefined && { videoStorageKey }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(thumbnailStorageKey !== undefined && { thumbnailStorageKey }),
        ...(fileName !== undefined && { fileName }),
        ...(fileSize !== undefined && { fileSize: parseInt(fileSize) }),
        ...(mimeType !== undefined && { mimeType }),
        ...(isFree !== undefined && { isFree }),
        ...(isPreview !== undefined && { isPreview }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/lectures/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const lecture = await prisma.courseLecture.findUnique({
      where: { id: req.params.id },
      select: { section: { select: { courseId: true } } },
    });
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: req.userId!, courseId: lecture.section.courseId } },
    });
    if (!enrollment && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You must enroll in the course first' });
    }

    const { position = 0, duration = 0, completed = false } = req.body;
    const p = parseFloat(position);
    const d = parseFloat(duration);
    const isComplete = completed || (d > 0 && p >= d - 10);

    const progress = await prisma.lectureProgress.upsert({
      where: { studentId_lectureId: { studentId: req.userId!, lectureId: req.params.id } },
      update: { position: p, duration: d, completed: isComplete, updatedAt: new Date() },
      create: { studentId: req.userId!, lectureId: req.params.id, position: p, duration: d, completed: isComplete },
    });

    if (enrollment) {
      const lectureIds = await prisma.courseLecture.findMany({
        where: { section: { courseId: lecture.section.courseId } },
        select: { id: true },
      });
      const completedCount = await prisma.lectureProgress.count({
        where: { studentId: req.userId!, lectureId: { in: lectureIds.map((l) => l.id) }, completed: true },
      });
      const percent = lectureIds.length === 0 ? 0 : Math.round((completedCount / lectureIds.length) * 100);
      const wasCompleted = !!enrollment.completedAt;
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress: percent, lastAccessedAt: new Date(), completedAt: percent === 100 ? new Date() : enrollment.completedAt },
      });

      if (percent === 100 && !wasCompleted) {
        const [course, student] = await Promise.all([
          prisma.course.findUnique({
            where: { id: lecture.section.courseId },
            select: { id: true, title: true, titleAr: true, instructorId: true },
          }),
          prisma.user.findUnique({
            where: { id: req.userId! },
            select: { id: true, fullName: true, email: true },
          }),
        ]);

        if (course) {
          const certificateNumber = `NVX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
          const certificate = await prisma.certificate.upsert({
            where: { studentId_courseId: { studentId: req.userId!, courseId: course.id } },
            update: {},
            create: {
              certificateNumber,
              studentId: req.userId!,
              courseId: course.id,
              completionDate: new Date(),
            },
          });
          const courseTitle = course.titleAr || course.title;
          const studentName = student?.fullName || 'there';

          await notifyUser(req.userId!, {
            type: 'CERTIFICATE',
            title: '🎓 استلمت شهادتك!',
            message: `مبروك! أكملت كورس «${courseTitle}» وحصلت على شهادة إتمام.`,
            link: '/student/certificates',
          });

          if (student?.email) {
            await enqueueMail({
              to: student.email,
              subject: `شهادة إتمام من ${process.env.PLATFORM_NAME || 'Nuvexa'} - ${courseTitle}`,
              html: `
                <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <h2 style="color:#0f172a; margin:0 0 8px;">مبروك، ${studentName}! 🎓</h2>
                  <p style="color:#475569; line-height:1.7;">أكملت بنجاح كورس <strong>«${courseTitle}»</strong>.</p>
                  <p style="color:#475569; line-height:1.7;">رقم شهادتك: <code style="background:#f1f5f9; padding:2px 8px; border-radius:6px; direction:ltr; display:inline-block;">${certificate.certificateNumber}</code></p>
                  <p style="color:#475569; line-height:1.7;">يمكنك تحميل الشهادة من لوحة الطالب.</p>
                  <a href="${process.env.FRONTEND_URL || 'https://nuvexa-edu.vercel.app'}/student/certificates" style="display:inline-block; margin-top:12px; background:#4f46e5; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none;">عرض شهادتي</a>
                </div>
              `,
            }).catch((err) => logger.warn(`[certificate] email failed: ${err instanceof Error ? err.message : err}`));
          }
        }
      }
    }

    res.json({ success: true, data: progress });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/lectures/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const lecture = await getLectureWithCourse(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    if (lecture.section.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await prisma.courseLecture.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Lecture deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/lectures/:lectureId/resources', authenticate, async (req: AuthRequest, res) => {
  try {
    const lecture = await prisma.courseLecture.findUnique({
      where: { id: req.params.lectureId },
      include: { section: { include: { course: { select: { id: true, instructorId: true } } } } },
    });
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });
    if (lecture.section.course.instructorId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { title, titleAr, description, descriptionAr, fileUrl, storageKey, fileType, fileSize, isFree } = req.body;
    if (!title || !fileType) return res.status(400).json({ success: false, message: 'Title and fileType are required' });

    const maxOrder = (await prisma.courseResource.aggregate({
      where: { lectureId: req.params.lectureId },
      _max: { order: true },
    }))._max.order ?? -1;

    const resource = await prisma.courseResource.create({
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        fileUrl,
        storageKey,
        fileType,
        fileSize: fileSize ? parseInt(fileSize) : undefined,
        isFree: isFree ?? false,
        order: maxOrder + 1,
        courseId: lecture.section.course.id,
        lectureId: req.params.lectureId,
      },
    });

    res.status(201).json({ success: true, data: resource });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
