import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Checkout flow load test (mock vodafone_cash provider).
// Each VU: create order -> initiate -> verify-payment -> poll status.
// Requires a real APPROVED course. Pass its id via K6_COURSE_ID.
// Auth: pass a valid bearer token via K6_TOKEN (created e.g. by e2e/happy-path.mjs).

const BASE = __ENV.K6_BASE_URL || 'http://localhost:5000/api/v1';
const COURSE_ID = __ENV.K6_COURSE_ID;
const TOKEN = __ENV.K6_TOKEN;

export const options = {
  scenarios: {
    checkout: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 2,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  if (!COURSE_ID || !TOKEN) {
    throw new Error('K6_COURSE_ID and K6_TOKEN env vars are required');
  }
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };

  let res = http.post(`${BASE}/orders/create`, JSON.stringify({ courseId: COURSE_ID }), { headers });
  const created = res.status === 201 || res.status === 409;
  check(res, { 'order create ok': (r) => created });
  if (res.status === 409) return;

  const orderId = res.json().data.id;
  const phone = `01${['0', '1', '2', '5'][Math.floor(Math.random() * 4)]}` + String(Math.floor(10000000 + Math.random() * 89999999));

  res = http.post(`${BASE}/orders/initiate`, JSON.stringify({ orderId, phoneNumber: phone }), { headers });
  check(res, { 'initiate ok': (r) => r.status === 200 });

  res = http.post(`${BASE}/orders/verify-payment`, JSON.stringify({ orderId, transactionId: 'K6-' + Date.now() }), { headers });
  check(res, { 'verify ok': (r) => r.status === 200 });

  res = http.get(`${BASE}/orders/${orderId}/status`, { headers });
  check(res, { 'status ok': (r) => r.status === 200 });

  sleep(1);
}
