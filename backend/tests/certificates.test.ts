import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/services/prisma';

function tokenFor(userId: string, role = 'STUDENT'): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Certificates', () => {
  let student: any;
  let instructor: any;
  let course: any;
  let cert: any;
  let token: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    instructor = await prisma.user.create({
      data: { email: `inst-${suffix}@test.com`, passwordHash: 'x', fullName: 'Instructor Test', role: 'INSTRUCTOR' },
    });
    student = await prisma.user.create({
      data: { email: `stu-${suffix}@test.com`, passwordHash: 'x', fullName: 'Student Test', role: 'STUDENT' },
    });
    const category = await prisma.category.findFirst();
    course = await prisma.course.create({
      data: {
        instructorId: instructor.id,
        title: `Cert Test Course ${suffix}`,
        slug: `cert-test-${suffix}`,
        description: 'test course',
        price: 100,
        currency: 'EGP',
        status: 'APPROVED',
        categoryId: category?.id || 'x',
      },
    });
    cert = await prisma.certificate.create({
      data: {
        certificateNumber: `NVX-TEST-${suffix.toUpperCase()}`,
        studentId: student.id,
        courseId: course.id,
      },
    });
    token = tokenFor(student.id);
  });

  afterAll(async () => {
    await prisma.certificate.deleteMany({ where: { id: cert.id } });
    await prisma.course.deleteMany({ where: { id: course.id } });
    await prisma.user.deleteMany({ where: { id: student.id } });
    await prisma.user.deleteMany({ where: { id: instructor.id } });
    await prisma.$disconnect();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/certificates');
    expect(res.status).toBe(401);
  });

  it('returns my certificates with course + student info', async () => {
    const res = await request(app)
      .get('/api/v1/certificates')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].certificateNumber).toBe(cert.certificateNumber);
    expect(res.body.data[0].student.fullName).toBe('Student Test');
  });

  it('verifies a valid certificate number', async () => {
    const res = await request(app).get(`/api/v1/certificates/verify/${cert.certificateNumber}`);
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.studentName).toBe('Student Test');
  });

  it('reports an unknown certificate number as invalid', async () => {
    const res = await request(app).get('/api/v1/certificates/verify/NVX-NOPE-9999');
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
  });
});
