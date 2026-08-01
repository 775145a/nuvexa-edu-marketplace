import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Catalog browsing load test.
// Run: k6 run load-tests/k6.catalog.js
// Env: K6_BASE_URL (default http://localhost:3000/api/v1)

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000/api/v1';

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const queries = [
  '/courses?page=1&limit=12&sort=newest',
  '/courses?page=1&limit=12&sort=popular',
  '/courses?page=1&limit=12&sort=rating',
  '/courses?search=react',
  '/courses?search=%D9%85%D9%88%D8%A7%D9%82%D8%B9',
  '/categories',
  '/health',
];

export default function () {
  const url = BASE + queries[Math.floor(Math.random() * queries.length)];
  const res = http.get(url);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(Math.random() * 0.3 + 0.1);
}
