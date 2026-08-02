import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/services/prisma';

function tokenFor(userId: string, role = 'STUDENT'): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
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
