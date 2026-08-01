/**
 * End-to-end happy-path suite (HTTP level).
 *
 * Run:  node e2e/happy-path.mjs
 *
 * Notes:
 *  - Seeds test users + an APPROVED course directly through Prisma (dev only),
 *    because registration is gated by email OTP.
 *  - Uses the mock/automatic payment provider so the checkout finishes without
 *    a real Vodafone Cash wallet.
 *  - Requires the backend to be running (default http://localhost:5000/api/v1).
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dotenv = require(path.join(root, 'backend/node_modules/dotenv'));
dotenv.config({ path: path.join(root, 'backend/.env') });

const { PrismaClient } = require(path.join(root, 'backend/node_modules/@prisma/client'));
const jwt = require(path.join(root, 'backend/node_modules/jsonwebtoken'));
const bcrypt = require(path.join(root, 'backend/node_modules/bcryptjs'));

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'fallback-secret';
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5000/api/v1';

let passed = 0;
let failed = 0;
function ok(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  PASS  ${name}${extra ? ' — ' + extra : ''}`); }
  else { failed++; console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`); }
}

async function api(method, pathname, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

async function mkUser(email, role, referralCode) {
  const pwd = await bcrypt.hash('E2e@123456', 10);
  return prisma.user.upsert({
    where: { email },
    update: { isActive: true, isVerified: true },
    create: { fullName: email.split('@')[0], email, passwordHash: pwd, role, isActive: true, isVerified: true, referralCode },
  });
}
const token = (u) => jwt.sign({ userId: u.id, role: u.role }, SECRET, { expiresIn: '1h' });

async function main() {
  console.log('\n[e2e] seeding users + approved course...');
  const admin = await mkUser('e2e-admin@test.com', 'ADMIN', null);
  const instructor = await mkUser('e2e-instructor@test.com', 'INSTRUCTOR', null);
  const referrer = await mkUser('e2e-referrer@test.com', 'STUDENT', 'E2EREF');
  const buyer = await mkUser('e2e-buyer@test.com', 'STUDENT', null);

  const aTok = token(admin); const iTok = token(instructor); const bTok = token(buyer);

  await prisma.coupon.deleteMany({ where: { code: 'E2E10' } });
  await prisma.order.deleteMany({ where: { studentId: buyer.id } });
  await prisma.enrollment.deleteMany({ where: { studentId: buyer.id } });
  await prisma.user.update({ where: { id: referrer.id }, data: { walletBalance: 0 } });

  let course = await prisma.course.findFirst({ where: { status: 'APPROVED', title: 'E2E Course' }, include: { sections: { include: { lectures: true } } } });
  if (!course) {
    const cat = await prisma.category.findFirst({ where: { slug: 'other' } })
      || await prisma.category.create({ data: { name: 'Other', nameAr: 'أخرى', slug: 'other', icon: '➕', isActive: true } });
    course = await prisma.course.create({
      data: {
        title: 'E2E Course', slug: 'e2e-course', description: 'e2e', price: 100,
        status: 'APPROVED', isPublished: true, instructorId: instructor.id, categoryId: cat.id,
        sections: { create: [{ title: 'Sec 1', order: 0, lectures: { create: [{ title: 'Lec 1', order: 0, videoUrl: 'http://localhost:3000/api/v1/files/x/master.m3u8' }] } }] },
      },
      include: { sections: { include: { lectures: true } } },
    });
  }
  const lecture = course.sections[0].lectures[0];
  await prisma.lectureComment.deleteMany({ where: { lectureId: lecture.id } });

  console.log('[e2e] 1. Catalog');
  let r = await api('GET', '/courses?limit=5');
  ok('courses list', r.status === 200 && Array.isArray(r.json.data), `total=${r.json.total}`);
  r = await api('GET', '/courses?search=E2E');
  ok('search finds course', r.json.data.some((c) => c.id === course.id));
  r = await api('GET', `/courses/id/${course.id}`);
  ok('course detail', r.status === 200 && r.json.data.id === course.id);

  console.log('[e2e] 2. Coupons (admin)');
  r = await api('POST', '/coupons', { token: aTok, body: { code: 'E2E10', discountType: 'PERCENT', value: 10, maxUses: 5 } });
  ok('create coupon', r.status === 201 && r.json.data.code === 'E2E10');
  r = await api('POST', '/coupons', { token: aTok, body: { code: 'E2E10', discountType: 'PERCENT', value: 50 } });
  ok('duplicate coupon rejected', r.status === 409);
  r = await api('POST', '/coupons', { token: bTok, body: { code: 'NOPE', discountType: 'PERCENT', value: 10 } });
  ok('non-admin cannot create coupon', r.status === 403);
  r = await api('GET', `/coupons/apply?code=E2E10&courseId=${course.id}`, { token: bTok });
  ok('coupon apply', r.status === 200 && r.json.data.discount === 10, `discount=${r.json.data.discount}`);

  console.log('[e2e] 3. Checkout (coupon + referral, manual transfer awaiting seller confirmation)');
  r = await api('POST', '/orders/create', { token: bTok, body: { courseId: course.id, couponCode: 'E2E10', referralCode: 'E2EREF' } });
  ok('order create', r.status === 201, `total=${r.json.data.total}`);
  ok('coupon applied to order', r.json.data.discount === 10 && Math.abs(r.json.data.total - 102.6) < 0.01, `total=${r.json.data.total}`);
  const orderId = r.json.data.id;

  r = await api('POST', '/orders/initiate', { token: bTok, body: { orderId } });
  ok('order initiate (manual)', r.status === 200 && r.json.data?.mode === 'manual', `mode=${r.json.data?.mode}`);
  ok('wallet number returned to payer', r.json.data?.walletNumber === '01003677165', `wallet=${r.json.data?.walletNumber}`);

  r = await api('POST', '/orders/verify-payment', { token: bTok, body: { orderId, transactionId: '' } });
  ok('empty reference rejected', r.status === 400);

  r = await api('POST', '/orders/verify-payment', { token: bTok, body: { orderId, transactionId: 'E2E-123456', phoneNumber: 'not-a-phone' } });
  ok('invalid sender phone rejected', r.status === 400);

  r = await api('POST', '/orders/verify-payment', { token: bTok, body: { orderId, transactionId: 'E2E-123456', phoneNumber: '01012345678' } });
  ok('phone + reference recorded, awaiting seller confirmation', r.status === 200 && r.json.data?.status === 'AWAITING_CONFIRMATION', r.json.message);

  r = await api('GET', `/orders/${orderId}/status`, { token: bTok });
  ok('order still waiting (not auto-completed)', r.json.data.status === 'AWAITING_CONFIRMATION');

  r = await api('GET', `/enrolled/${course.id}`, { token: bTok });
  ok('course NOT active before seller confirms', r.json.data.enrolled === false);

  r = await api('GET', '/admin/payments/pending', { token: aTok });
  const pending = (r.json.data || []).find((p) => p.orderId === orderId);
  ok('seller sees sender wallet + reference', r.status === 200 && !!pending && pending.phoneNumber === '01012345678' && pending.transactionId === 'E2E-123456', pending ? `${pending.phoneNumber}/${pending.transactionId}` : '');

  r = await api('POST', '/admin/payments/confirm', { token: aTok, body: { orderId, action: 'confirm' } });
  ok('admin confirms manual payment', r.status === 200, r.json.message);

  r = await api('GET', `/orders/${orderId}/status`, { token: bTok });
  ok('order status COMPLETED after admin confirm', r.json.data.status === 'COMPLETED');

  r = await api('GET', `/enrolled/${course.id}`, { token: bTok });
  ok('student enrolled after confirmation', r.json.data.enrolled === true);

  const refAfter = await prisma.user.findUnique({ where: { id: referrer.id } });
  ok('referrer rewarded 9 EGP', refAfter.walletBalance === 9, `wallet=${refAfter.walletBalance}`);
  const couponAfter = await prisma.coupon.findUnique({ where: { code: 'E2E10' } });
  ok('coupon usedCount=1', couponAfter.usedCount === 1);

  console.log('[e2e] 4. Lecture Q&A');
  r = await api('POST', `/lectures/${lecture.id}/questions`, { token: bTok, body: { body: 'هل يوجد ملخص؟' } });
  ok('ask question', r.status === 201);
  const qId = r.json.data.id;
  r = await api('GET', `/lectures/${lecture.id}/questions`, { token: bTok });
  ok('list questions', r.status === 200 && r.json.total >= 1);
  r = await api('POST', `/questions/${qId}/reply`, { token: aTok, body: { body: 'نعم متاح.' } });
  ok('instructor replies', r.status === 201);
  r = await api('POST', `/lectures/${lecture.id}/questions`, { body: { body: 'no auth' } });
  ok('question without auth rejected', r.status === 401);
  r = await api('DELETE', `/comments/${qId}`, { token: bTok });
  ok('author deletes question', r.status === 200);

  console.log('[e2e] 5. Payments webhooks');
  r = await api('POST', '/payments/webhook/vodafone-cash', { body: { bad: true } });
  ok('vodafone webhook rejects bad signature', r.status === 401);
  r = await api('POST', '/payments/webhook/paymob', { body: {} });
  ok('paymob webhook rejects bad hmac', r.status === 401);

  console.log('[e2e] 6. Video jobs');
  r = await api('GET', '/video-jobs/my', { token: iTok });
  ok('video-jobs list', r.status === 200 && Array.isArray(r.json.data));

  console.log('[e2e] 7. Auth guard');
  r = await api('GET', '/orders/my');
  ok('orders/my requires auth', r.status === 401);
  r = await api('GET', '/admin/monitoring', { token: bTok });
  ok('admin route guarded', r.status === 403);

  await prisma.$disconnect();
  console.log(`\n[e2e] RESULT: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error('[e2e] FATAL: ' + e.message); await prisma.$disconnect(); process.exit(1); });
