import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../logger';
import {
  PaymentProvider,
  PaymentInitiateInput,
  PaymentIntent,
  PaymentVerifyInput,
  PaymentVerifyResult,
  WebhookResult,
} from './types';

const PAYMOB_BASE = 'https://accept.paymob.com/api';

function paymobErrorMessage(status: number, raw: any): string {
  const msg = String(raw?.message || raw?.detail || raw?.error_messages?.[0] || '').toLowerCase();
  logger.info(`[paymob] error detail: HTTP ${status} ${JSON.stringify(raw).slice(0, 300)}`);
  if (status === 404 || /not found|invalid.*wallet|wallet.*not|mobile.*invalid/.test(msg)) {
    return 'رقم المحفظة غير صحيح أو غير مسجل في فودافون كاش';
  }
  if (status === 402 || /insufficient|balance|funds/.test(msg)) {
    return 'رصيد المحفظة غير كافٍ لإتمام عملية الدفع';
  }
  if (status === 401) {
    return 'بيانات بوابة الدفع غير صحيحة (تحقق من إعدادات باي موب)';
  }
  if (status === 400) {
    return 'تعذر بدء الدفع لهذه المحفظة، تأكد من الرقم وحاول مجددًا';
  }
  return 'تعذر إتمام الدفع، حاول مرة أخرى أو تواصل مع الدعم';
}

async function getPaymobToken(): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: config.paymob.apiKey }),
  });
  const data = (await res.json()) as any;
  if (!data.token) {
    throw new Error(paymobErrorMessage(res.status, data));
  }
  return data.token;
}

/**
 * Paymob provider — Vodafone Cash ONLY.
 * Mobile Wallet (Vodafone Cash) charge: customer confirms the OTP in the
 * Vodafone Cash app. Requires PAYMOB_WALLET_INTEGRATION_ID; a phoneNumber is
 * mandatory for every initiation. Card/iframe flows are intentionally removed.
 * Active only when PAYMOB_API_KEY is set; otherwise requests fall back to the
 * selected provider (mock by default).
 */
class PaymobProvider implements PaymentProvider {
  readonly name = 'paymob' as const;
  readonly mode = 'auto' as const;

  get isConfigured(): boolean {
    return !!config.paymob.apiKey;
  }

  private active(): boolean {
    return this.isConfigured && config.payment.provider === 'paymob';
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentIntent> {
    if (!config.paymob.walletIntegrationId) {
      throw new Error('PAYMOB_WALLET_INTEGRATION_ID is not configured. Vodafone Cash payments via Paymob require the Mobile Wallet (Vodafone Cash) integration ID.');
    }
    if (!input.phoneNumber) {
      throw new Error('Vodafone Cash wallet number is required to start payment');
    }
    const token = await getPaymobToken();

    const orderRes = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: Math.round(input.amount * 100),
        currency: input.currency || 'EGP',
        items: [],
      }),
    });
    const paymobOrder = (await orderRes.json()) as any;
    if (!paymobOrder?.id) {
      throw new Error(paymobErrorMessage(orderRes.status, paymobOrder));
    }

    const billingData = {
      apartment: 'N/A',
      email: 'customer@nuvexa.com',
      floor: 'N/A',
      first_name: 'Nuvexa',
      street: 'N/A',
      building: 'N/A',
      phone_number: input.phoneNumber || '01000000000',
      shipping_method: 'PKG',
      postal_code: 'N/A',
      city: 'N/A',
      country: 'EG',
      last_name: 'Customer',
      state: 'N/A',
    };

    const pkRes = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: Math.round(input.amount * 100),
        expiration: 3600,
        order_id: paymobOrder.id,
        billing_data: billingData,
        currency: input.currency || 'EGP',
        integration_id: config.paymob.walletIntegrationId,
      }),
    });
    const pkData = (await pkRes.json()) as any;
    const paymentKey = pkData.token;
    if (!paymentKey) throw new Error(paymobErrorMessage(pkRes.status, pkData));

    const wcRes = await fetch(`${PAYMOB_BASE}/acceptance/wallet/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: token,
        payment_key_token: paymentKey,
        phone_number: input.phoneNumber,
        billing_data: billingData,
      }),
    });
    const walletCharge = (await wcRes.json()) as any;
    if (!wcRes.ok) {
      throw new Error(paymobErrorMessage(wcRes.status, walletCharge));
    }
    logger.info(`[paymob] wallet charge initiated: ${JSON.stringify(walletCharge).slice(0, 200)}`);

    return {
      provider: this.name,
      mode: this.mode,
      status: 'PROCESSING',
      reference: String(paymobOrder.id),
      providerRef: String(paymobOrder.id),
      phoneNumber: input.phoneNumber,
      poll: true,
      instructions: 'أكّد الدفع عبر محفظة فودافون كاش (ستصلك رسالة تأكيد على هاتفك).',
    };
  }

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (!input.transactionId) return { success: false, reason: 'transactionId required' };
    const token = await getPaymobToken();
    const txRes = await fetch(`${PAYMOB_BASE}/acceptance/transactions/${input.transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const txData = (await txRes.json()) as any;
    const ok = txData.success === true && txData.is_voided !== true && txData.is_refunded !== true;
    return ok
      ? { success: true, transactionId: input.transactionId, providerRef: String(txData.id || input.transactionId) }
      : { success: false, reason: 'Payment was not successful' };
  }

  async getStatus(reference: string): Promise<{ status: string; transactionId?: string }> {
    const token = await getPaymobToken();
    const txRes = await fetch(`${PAYMOB_BASE}/acceptance/transactions/${reference}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const txData = (await txRes.json()) as any;
    const success = txData.success === true && txData.is_voided !== true && txData.is_refunded !== true;
    return { status: success ? 'COMPLETED' : 'PENDING', transactionId: reference };
  }

  /**
   * Verifies the Paymob `transaction.response` webhook HMAC.
   * hmac = hex(HMAC-SHA512(obj, hmacSecret)) where obj is the exact JSON body
   * of the transaction object (substring extraction keeps Paymob's key order).
   */
  verifyWebhookHmac(rawBody: string, provided: string): boolean {
    if (!config.paymob.hmacSecret || !provided) return false;
    const start = rawBody.indexOf('"obj":');
    if (start === -1) return false;
    const brace = rawBody.indexOf('{', start);
    let depth = 0;
    let end = -1;
    for (let i = brace; i < rawBody.length; i++) {
      const ch = rawBody[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end === -1) return false;
    const obj = rawBody.slice(brace, end);
    const expected = crypto.createHmac('sha512', config.paymob.hmacSecret).update(obj).digest('hex');
    return expected === provided.trim();
  }

  async handleWebhook(body: unknown, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult> {
    const data = typeof body === 'string' ? JSON.parse(body || '{}') : body;
    if (data?.type !== 'transaction.response') {
      return { handled: false, reason: 'unexpected event type' };
    }
    const obj = data?.obj as any;
    const success = obj?.success === true && obj?.is_voided !== true && obj?.is_refunded !== true;
    return {
      handled: true,
      success,
      orderId: obj?.order?.id ? String(obj.order.id) : undefined,
      transactionId: obj?.id ? String(obj.id) : undefined,
      providerRef: obj?.order?.id ? String(obj.order.id) : undefined,
      reason: success ? undefined : 'transaction not successful',
    };
  }
}

export const paymobProvider = new PaymobProvider();
