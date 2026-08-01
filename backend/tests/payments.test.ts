import request from 'supertest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/services/prisma';

function tokenFor(userId: string, role = 'STUDENT'): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

describe('Vodafone Cash payments', () => {
  let student: any;
  let course: any;
  let token: string;
  let orderId: string;

  beforeAll(async () => {
    const email = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    student = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'Pay Test', role: 'STUDENT' },
    });
    const category = await prisma.category.findFirst();
    course = await prisma.course.create({
      data: {
        instructorId: student.id,
        title: `Pay Test Course ${Date.now()}`,
        slug: `pay-test-${Date.now()}`,
        description: 'test course',
        price: 150,
        currency: 'EGP',
        status: 'APPROVED',
        categoryId: category?.id || 'x',
      },
    });
    token = tokenFor(student.id);
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.enrollment.deleteMany({ where: { studentId: student.id } });
    await prisma.course.deleteMany({ where: { id: course.id } });
    await prisma.user.deleteMany({ where: { id: student.id } });
    await prisma.$disconnect();
  });

  it('creates an order with a pending Vodafone Cash payment', async () => {
    const res = await request(app)
      .post('/api/v1/orders/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ courseId: course.id, paymentMethod: 'vodafone_cash' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentMethod).toBe('vodafone_cash');
    expect(res.body.data.subtotal).toBe(150);
    expect(res.body.data.taxAmount).toBe(21);
    expect(res.body.data.vatRate).toBe(14);
    expect(res.body.data.total).toBe(171);
    orderId = res.body.data.id;
  });

  it('initiates the payment with a wallet number', async () => {
    const res = await request(app)
      .post('/api/v1/orders/initiate')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, phoneNumber: '01012345678' });
    expect(res.status).toBe(200);
    expect(res.body.data.provider).toBe('vodafone_cash');
    expect(res.body.data.reference).toBeTruthy();
    expect(res.body.data.poll).toBe(true);
  });

  it('polls status and auto-completes the order + enrollment', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
    });
    expect(enrollment).toBeTruthy();

    const updatedCourse = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updatedCourse?.enrollmentCount).toBe(1);
    expect(updatedCourse?.totalRevenue).toBe(171);
  });

  it('is idempotent - second status call does not double count', async () => {
    await request(app).get(`/api/v1/orders/${orderId}/status`).set('Authorization', `Bearer ${token}`);
    await request(app)
      .post('/api/v1/orders/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, transactionId: 'VCT-ABC123' });
    const updatedCourse = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updatedCourse?.enrollmentCount).toBe(1);
    expect(updatedCourse?.totalRevenue).toBe(171);
  });
});

describe('Vodafone Cash webhook', () => {
  it('rejects a request with an invalid signature', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook/vodafone-cash')
      .set('Content-Type', 'application/json')
      .set('X-VF-Date', '2026-01-01T00:00:00.000Z')
      .set('X-VF-Request-Id', 'req-1')
      .set('X-VF-Signature', 'wrong-signature')
      .send({ requestId: 'req-1', status: 'SUCCESS' });
    expect(res.status).toBe(401);
  });

  it('accepts a valid signature', async () => {
    const body = { requestId: 'req-2', status: 'SUCCESS' };
    const raw = JSON.stringify(body);
    const date = '2026-01-01T00:00:00.000Z';
    const sig = crypto.createHmac('sha256', 'mock-secret').update(`${date}:req-2:${raw}`).digest('base64');
    const res = await request(app)
      .post('/api/v1/payments/webhook/vodafone-cash')
      .set('Content-Type', 'application/json')
      .set('X-VF-Date', date)
      .set('X-VF-Request-Id', 'req-2')
      .set('X-VF-Signature', sig)
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Paymob webhook', () => {
  const buildBody = (orderId: string) => {
    const obj = { id: 9001, success: true, is_voided: false, is_refunded: false, order: { id: orderId } };
    const hmac = crypto.createHmac('sha512', 'test-hmac-secret').update(JSON.stringify(obj)).digest('hex');
    return { type: 'transaction.response', obj, hmac };
  };

  it('rejects invalid HMAC', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook/paymob')
      .set('Content-Type', 'application/json')
      .send({ type: 'transaction.response', obj: { id: 1, success: true }, hmac: 'bad' });
    expect(res.status).toBe(401);
  });

  it('accepts valid HMAC and returns success', async () => {
    const res = await request(app)
      .post('/api/v1/payments/webhook/paymob')
      .set('Content-Type', 'application/json')
      .send(buildBody('paymob-order-1'));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
