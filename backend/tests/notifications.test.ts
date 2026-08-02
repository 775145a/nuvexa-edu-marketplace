import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { prisma } from '../src/services/prisma';

function tokenFor(userId: string, role = 'STUDENT'): string {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
    issuer: 'nuvexa',
    audience: 'nuvexa-web',
  });
}

describe('Notifications', () => {
  let user: any;
  let token: string;

  beforeAll(async () => {
    const email = `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    user = await prisma.user.create({
      data: { email, passwordHash: 'x', fullName: 'Ntf Test', role: 'STUDENT' },
    });
    token = tokenFor(user.id);
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'TEST', title: 'Unread one', message: 'First', isRead: false },
        { userId: user.id, type: 'TEST', title: 'Read one', message: 'Second', isRead: true },
      ],
    });
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('lists the user notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it('marks all notifications as read', async () => {
    const res = await request(app)
      .put('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const unread = await prisma.notification.count({ where: { userId: user.id, isRead: false } });
    expect(unread).toBe(0);
  });
});
