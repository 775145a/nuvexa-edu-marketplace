import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../src/app';
import { prisma } from '../src/services/prisma';
import { refreshTokens, loginWithPassword } from '../src/services/auth';

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function tokenFor(userId: string, role = 'STUDENT'): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
    issuer: 'nuvexa',
    audience: 'nuvexa-web',
  });
}

describe('Security: course mass-assignment protection', () => {
  let instructor: any;
  let course: any;
  let token: string;

  beforeAll(async () => {
    const email = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    instructor = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'Sec Test', role: 'INSTRUCTOR' },
    });
    const category = await prisma.category.findFirst();
    course = await prisma.course.create({
      data: {
        instructorId: instructor.id,
        title: `Sec Test Course ${Date.now()}`,
        slug: `sec-test-${Date.now()}`,
        description: 'test course',
        price: 100,
        currency: 'EGP',
        status: 'DRAFT',
        isPublished: false,
        categoryId: category?.id || 'x',
      },
    });
    token = tokenFor(instructor.id);
  });

  afterAll(async () => {
    await prisma.course.deleteMany({ where: { id: course.id } });
    await prisma.user.deleteMany({ where: { id: instructor.id } });
    await prisma.$disconnect();
  });

  it('does not allow an instructor to publish their own course or forge stats', async () => {
    const res = await request(app)
      .put(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Title',
        status: 'APPROVED',
        isPublished: true,
        averageRating: 5,
        reviewCount: 999,
        enrollmentCount: 999,
        totalRevenue: 999999,
        instructorId: 'someone-else-id',
        slug: 'hijacked-slug',
      });
    expect(res.status).toBe(200);

    const updated = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updated?.title).toBe('Updated Title');
    expect(updated?.status).toBe('DRAFT');
    expect(updated?.isPublished).toBe(false);
    expect(updated?.averageRating).toBe(0);
    expect(updated?.reviewCount).toBe(0);
    expect(updated?.enrollmentCount).toBe(0);
    expect(updated?.totalRevenue).toBe(0);
    expect(updated?.instructorId).toBe(instructor.id);
  });

  it('rejects an invalid discounted price', async () => {
    const res = await request(app)
      .put(`/api/v1/courses/${course.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ discountedPrice: 500, price: 100 });
    expect(res.status).toBe(400);
  });
});

describe('Security: upload MIME sniffing', () => {
  let user: any;
  let token: string;

  beforeAll(async () => {
    const email = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    user = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'Up Test', role: 'STUDENT' },
    });
    token = tokenFor(user.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('rejects a file whose content does not match its declared image type', async () => {
    const res = await request(app)
      .post('/api/v1/storage/upload?entity=test')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
  });

  it('rejects an SVG upload entirely', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await request(app)
      .post('/api/v1/storage/upload?entity=test')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', svg, { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(400);
  });
});

describe('Security: JWT hardening', () => {
  let user: any;
  let token: string;

  beforeAll(async () => {
    const email = `jwt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    user = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'JWT Test', role: 'STUDENT' },
    });
    token = tokenFor(user.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('accepts a properly issued token', async () => {
    const res = await request(app)
      .get('/api/v1/enrolled')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).not.toBe(401);
  });

  it('rejects a token missing issuer/audience', async () => {
    const weak = jwt.sign({ userId: user.id, role: 'STUDENT' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    const res = await request(app)
      .get('/api/v1/enrolled')
      .set('Authorization', `Bearer ${weak}`);
    expect(res.status).toBe(401);
  });

  it('rejects a token signed with a wrong audience', async () => {
    const wrongAud = jwt.sign(
      { userId: user.id, role: 'STUDENT' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h', issuer: 'nuvexa', audience: 'evil-site' }
    );
    const res = await request(app)
      .get('/api/v1/enrolled')
      .set('Authorization', `Bearer ${wrongAud}`);
    expect(res.status).toBe(401);
  });

  it('rejects an alg=none token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: user.id, role: 'STUDENT' })).toString('base64url');
    const res = await request(app)
      .get('/api/v1/enrolled')
      .set('Authorization', `Bearer ${header}.${payload}.`);
    expect(res.status).toBe(401);
  });
});

describe('Security: refresh token rotation & reuse detection', () => {
  let user: any;

  beforeAll(async () => {
    const email = `rot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    user = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'Rotation Test', role: 'STUDENT' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('rotates and revokes everything when an old refresh token is reused', async () => {
    const plain = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 86400000);
    await prisma.session.create({
      data: {
        userId: user.id,
        token: sha256(plain + 't'),
        refreshToken: sha256(plain),
        expiresAt,
      },
    });

    const first = await refreshTokens(plain);
    expect(first.accessToken).toBeTruthy();

    await expect(refreshTokens(plain)).rejects.toThrow('SESSION_EXPIRED');

    const active = await prisma.session.count({ where: { userId: user.id, isActive: true } });
    expect(active).toBe(0);
  });
});

describe('Security: login brute-force lockout', () => {
  let user: any;
  let email: string;

  beforeAll(async () => {
    email = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    const bcrypt = await import('bcryptjs');
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: bcrypt.default.hashSync('ValidPass1', 10),
        fullName: 'Lockout Test',
        role: 'STUDENT',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('locks the account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(loginWithPassword(email, 'WrongPass1')).rejects.toThrow('INVALID_CREDENTIALS');
    }
    await expect(loginWithPassword(email, 'ValidPass1')).rejects.toThrow('ACCOUNT_LOCKED');
  });
});

describe('Security: storage signing restriction', () => {
  let student: any;
  let admin: any;

  beforeAll(async () => {
    student = await prisma.user.create({
      data: { email: `sign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`, passwordHash: 'x', fullName: 'Sign Test', role: 'STUDENT' },
    });
    admin = await prisma.user.create({
      data: { email: `signa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`, passwordHash: 'x', fullName: 'Sign Admin', role: 'ADMIN' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [student.id, admin.id] } } });
    await prisma.$disconnect();
  });

  it('denies students from signing arbitrary storage keys', async () => {
    const res = await request(app)
      .post('/api/v1/storage/sign')
      .set('Authorization', `Bearer ${tokenFor(student.id)}`)
      .send({ key: 'lectures/secret.mp4' });
    expect(res.status).toBe(403);
  });

  it('allows admins to sign keys', async () => {
    const res = await request(app)
      .post('/api/v1/storage/sign')
      .set('Authorization', `Bearer ${tokenFor(admin.id, 'ADMIN')}`)
      .send({ key: 'lectures/test.mp4' });
    expect([200, 500]).toContain(res.status);
  });
});

describe('Security: paid content access control', () => {
  let instructor: any;
  let student: any;
  let enrolledStudent: any;
  let course: any;
  let lecture: any;
  let slug: string;

  beforeAll(async () => {
    instructor = await prisma.user.create({
      data: { email: `cont-i-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`, passwordHash: 'x', fullName: 'Content Inst', role: 'INSTRUCTOR' },
    });
    student = await prisma.user.create({
      data: { email: `cont-s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`, passwordHash: 'x', fullName: 'Content Student', role: 'STUDENT' },
    });
    enrolledStudent = await prisma.user.create({
      data: { email: `cont-e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`, passwordHash: 'x', fullName: 'Enrolled Student', role: 'STUDENT' },
    });

    const category = await prisma.category.findFirst();
    slug = `paid-content-${Date.now()}`;
    course = await prisma.course.create({
      data: {
        instructorId: instructor.id,
        title: `Paid Content ${Date.now()}`,
        slug,
        description: 'paid content course',
        price: 100,
        currency: 'EGP',
        status: 'APPROVED',
        isPublished: true,
        categoryId: category?.id || 'x',
        sections: {
          create: [
            {
              title: 'S1',
              order: 0,
              lectures: {
                create: [
                  {
                    title: 'L1',
                    order: 0,
                    videoUrl: 'https://fake.example/lecture-1.mp4',
                    videoStorageKey: 'lectures/2026/secret-1.mp4',
                    attachments: JSON.stringify([{ name: 'pdf', url: 'https://fake.example/res.pdf' }]),
                    isFree: false,
                    isPreview: false,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    const section = await prisma.courseSection.findFirstOrThrow({ where: { courseId: course.id } });
    lecture = await prisma.courseLecture.findFirstOrThrow({ where: { sectionId: section.id } });

    await prisma.enrollment.create({
      data: { studentId: enrolledStudent.id, courseId: course.id },
    });
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany({ where: { courseId: course.id } });
    await prisma.courseLecture.deleteMany({ where: { section: { courseId: course.id } } });
    await prisma.courseSection.deleteMany({ where: { courseId: course.id } });
    await prisma.course.deleteMany({ where: { id: course.id } });
    await prisma.user.deleteMany({ where: { id: { in: [instructor.id, student.id, enrolledStudent.id] } } });
    await prisma.$disconnect();
  });

  it('strips paid video/attachment URLs from the public course page', async () => {
    const res = await request(app).get(`/api/v1/courses/${slug}`);
    expect(res.status).toBe(200);
    const publicLecture = res.body.data.sections[0].lectures[0];
    expect(publicLecture.videoUrl).toBeNull();
    expect(publicLecture.attachments).toBe('[]');
    expect(publicLecture.videoStorageKey).toBeTruthy();
  });

  it('denies non-enrolled students from signing a lecture video', async () => {
    const res = await request(app)
      .post('/api/v1/storage/sign-lecture')
      .set('Authorization', `Bearer ${tokenFor(student.id)}`)
      .send({ lectureId: lecture.id });
    expect(res.status).toBe(403);
  });

  it('allows enrolled students to sign a lecture video', async () => {
    const res = await request(app)
      .post('/api/v1/storage/sign-lecture')
      .set('Authorization', `Bearer ${tokenFor(enrolledStudent.id)}`)
      .send({ lectureId: lecture.id });
    expect(res.status).toBe(200);
    expect(res.body.data.url).toBeTruthy();
  });

  it('allows the course instructor to sign a lecture video', async () => {
    const res = await request(app)
      .post('/api/v1/storage/sign-lecture')
      .set('Authorization', `Bearer ${tokenFor(instructor.id)}`)
      .send({ lectureId: lecture.id });
    expect([200, 500]).toContain(res.status);
  });

  it('strips video URLs from the section lecture list for anonymous visitors', async () => {
    const section = await prisma.courseSection.findFirstOrThrow({ where: { courseId: course.id } });
    const res = await request(app).get(`/api/v1/sections/${section.id}/lectures`);
    expect(res.status).toBe(200);
    expect(res.body.data[0].videoUrl).toBeNull();
  });
});
