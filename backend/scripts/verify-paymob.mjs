/**
 * Verifies Paymob credentials for the Vodafone Cash-only wallet flow.
 * No money is charged: only an auth-token call + a 1 EGP payment_key is created.
 *
 * Usage: node scripts/verify-paymob.mjs
 * Reads PAYMOB_* from backend/.env (or process env).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://accept.paymob.com/api';

function loadEnv() {
  const file = path.join(here, '..', '.env');
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = { ...process.env, ...loadEnv() };
const API_KEY = env.PAYMOB_API_KEY || '';
const WALLET_INT_ID = env.PAYMOB_WALLET_INTEGRATION_ID || '';
const CURRENCY = env.PAYMOB_CURRENCY || 'EGP';

function ok(label) { console.log(`  [OK] ${label}`); }
function fail(label, detail) { console.error(`  [FAIL] ${label}: ${detail}`); process.exitCode = 1; }

async function main() {
  console.log('== Paymob / Vodafone Cash credential check ==\n');
  if (!API_KEY || API_KEY.includes('your-')) return fail('PAYMOB_API_KEY', 'missing or placeholder in backend/.env');
  if (!WALLET_INT_ID || WALLET_INT_ID.includes('your-')) return fail('PAYMOB_WALLET_INTEGRATION_ID', 'missing or placeholder — required for Vodafone Cash');

  console.log('1) Fetching Paymob auth token...');
  const authRes = await fetch(`${BASE}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY }),
  });
  const auth = await authRes.json();
  if (!auth.token) {
    return fail('API key', `HTTP ${authRes.status}: ${auth.message || auth.error_messages?.join(', ') || 'no token returned'}`);
  }
  ok(`auth token obtained (${auth.token.slice(0, 12)}...)`);

  console.log('\n2) Creating a 1 EGP Paymob order (no charge)...');
  const orderRes = await fetch(`${BASE}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: auth.token,
      delivery_needed: false,
      amount_cents: 100,
      currency: CURRENCY,
      items: [],
    }),
  });
  const order = await orderRes.json();
  if (!order.id) {
    return fail('order creation', `HTTP ${orderRes.status}: ${order.message || order.error_messages?.join(', ') || 'no order id'}`);
  }
  ok(`order created (id=${order.id})`);

  console.log('\n3) Requesting a payment key with the Vodafone Cash wallet integration...');
  const pkRes = await fetch(`${BASE}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: auth.token,
      amount_cents: 100,
      expiration: 3600,
      order_id: order.id,
      billing_data: {
        apartment: 'N/A', email: 'customer@nuvexa.com', floor: 'N/A',
        first_name: 'Nuvexa', street: 'N/A', building: 'N/A',
        phone_number: '01000000000', shipping_method: 'PKG', postal_code: 'N/A',
        city: 'N/A', country: 'EG', last_name: 'Customer', state: 'N/A',
      },
      currency: CURRENCY,
      integration_id: WALLET_INT_ID,
    }),
  });
  const pk = await pkRes.json();
  if (!pk.token) {
    const err = pk.message || pk.error_messages?.join(', ') || 'no payment key';
    const hint = /integration/i.test(err) || pkRes.status >= 400
      ? ' — likely wrong integration ID or the Mobile Wallet integration is not yet activated by Paymob/Vodafone.'
      : '';
    return fail(`wallet integration id "${WALLET_INT_ID}"`, `HTTP ${pkRes.status}: ${err}${hint}`);
  }
  ok(`payment key obtained — wallet integration "${WALLET_INT_ID}" is valid and active for ${CURRENCY}`);

  console.log('\n4) Result: credentials are valid.');
  console.log('   Next: set PAYMENT_PROVIDER=paymob in backend/.env and restart the server.');
  console.log('   Real wallet charge requires the customer to confirm the OTP in the Vodafone Cash app.');
}

main().catch((e) => { console.error(e); process.exit(1); });
