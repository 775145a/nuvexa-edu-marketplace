import request from 'supertest';
import app from '../src/app';

describe('Nuvexa API smoke tests', () => {
  it('GET /health returns OK with db status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.db.status).toBe('up');
  });

  it('unknown route returns unified JSON 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Route not found');
  });

  it('register rejects invalid payload with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bad-email', password: 'x', fullName: '', role: 'HACKER' });
    expect(res.status).toBe(400);
  });

  it('register rejects invalid role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'ok@ok.com', password: 'StrongPass1', fullName: 'Test User', role: 'HACKER' });
    expect(res.status).toBe(400);
  });

  it('GET /courses returns paginated list', async () => {
    const res = await request(app).get('/api/v1/courses?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeDefined();
  });

  it('GET /categories returns cached list', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('auth routes are rate limited to 15/min', async () => {
    const attempts: number[] = [];
    for (let i = 0; i < 16; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'no@no.com', password: 'wrongpass1' });
      attempts.push(res.status);
    }
    expect(attempts).toContain(429);
  });
});
