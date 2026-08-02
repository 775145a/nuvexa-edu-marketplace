import { Request } from 'express';
import { prisma } from './prisma';
import { verifyAccessToken } from './auth';

export function getRequestUser(req: Request): { userId?: string; role?: string } {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(header.split(' ')[1]);
      return { userId: decoded.userId, role: decoded.role };
    } catch {
      return {};
    }
  }
  return {};
}

export async function canAccessCourse(
  courseId: string,
  userId?: string,
  role?: string
): Promise<boolean> {
  if (!userId) return false;
  if (role === 'ADMIN') return true;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (course?.instructorId === userId) return true;
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: userId, courseId } },
  });
  return !!enrollment;
}

const SENSITIVE_LECTURE_FIELDS = ['videoUrl', 'attachments', 'externalLinks'];

export function sanitizeLectureForViewer(lecture: any, hasAccess: boolean): any {
  if (hasAccess) return lecture;
  const copy = { ...lecture };
  if (lecture.isFree || lecture.isPreview) return copy;
  for (const field of SENSITIVE_LECTURE_FIELDS) {
    if (copy[field] === undefined) continue;
    if (field === 'videoUrl') copy[field] = null;
    else copy[field] = '[]';
  }
  if (Array.isArray(copy.resources)) {
    copy.resources = copy.resources.map((r: any) => ({ ...r, fileUrl: null, storageKey: null }));
  }
  return copy;
}

export function sanitizeLectures(lectures: any[], hasAccess: boolean): any[] {
  return lectures.map((l) => sanitizeLectureForViewer(l, hasAccess));
}
