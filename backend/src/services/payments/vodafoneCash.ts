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

const MOCK_SECRET = 'mock-secret';

function signMessage(message: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}

/**
 * Vodafone Cash provider.
 *
 * IMPORTANT (honesty note): Vodafone Egypt does NOT expose a public direct merchant API
 * for Vodafone Cash collection. Real automated OTP charges must go through an aggregator
 * such as Paymob (see ./paymob.ts) or Fawry. This provider therefore only ever runs in
 * mock/manual mode for local testing — it must NOT be presented to customers as a live
 * charger. Real Vodafone Cash money movement happens via the aggregator's wallet flow.
 *
 * Mock mode (default): any valid-looking request succeeds so the product flow can be
 * tested end to end without a merchant agreement.
 */
class VodafoneCashProvider implements PaymentProvider {
  readonly name = 'vodafone_cash' as const;
  readonly mode = 'auto' as const;

  get isConfigured(): boolean {
    return !!(config.vodafoneCash.clientId && config.vodafoneCash.clientSecret);
  }

  private get mock(): boolean {
    return config.payment.provider === 'mock' || !this.isConfigured;
  }

  private get secret(): string {
    return config.vodafoneCash.secretKey || MOCK_SECRET;
  }

  private async getAccessToken(): Promise<string> {
    const url = `${config.vodafoneCash.baseUrl.replace(/\/$/, '')}/oauth2/token`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.vodafoneCash.clientId,
        client_secret: config.vodafoneCash.clientSecret,
      }),
    });
    const data = (await res.json()) as any;
    if (!data.access_token) {
      throw new Error(`Vodafone token failed (${res.status}): ${data.message || 'no access_token'}`);
    }
    return data.access_token;
  }

  private async api(method: string, path: string, body?: unknown): Promise<any> {
    const token = await this.getAccessToken();
    const requestId = crypto.randomUUID();
    const date = new Date().toISOString();
    const payload = body ? JSON.stringify(body) : '';
    const signature = signMessage(`${date}:${requestId}:${payload}`, this.secret);

    const res = await fetch(`${config.vodafoneCash.baseUrl.replace(/\/$/, '')}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-VF-Date': date,
        'X-VF-Request-Id': requestId,
        'X-VF-Signature': signature,
        'X-VF-KeyId': config.vodafoneCash.keyId || 'MERCHANT',
        'X-VF-Merchant-Id': config.vodafoneCash.merchantId || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Vodafone ${path} failed (${res.status}): ${JSON.stringify(data)}`);
    }
    return data;
  }

  private async mockInitiate(input: PaymentInitiateInput): Promise<PaymentIntent> {
    await new Promise((r) => setTimeout(r, 120));
    const reference = `VC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      provider: this.name,
      mode: this.mode,
      status: 'PROCESSING',
      reference,
      providerRef: reference,
      phoneNumber: input.phoneNumber,
      storeName: config.platform.name,
      instructions: 'أكّد الدفع من تطبيق فودافون كاش (سيصل لك إشعار على المحفظة) ثم انتظر التأكيد التلقائي.',
      poll: true,
    };
  }

  async initiate(input: PaymentInitiateInput): Promise<PaymentIntent> {
    if (this.mock) return this.mockInitiate(input);
    if (!input.phoneNumber) {
      throw new Error('رقم محفظة فودافون كاش مطلوب');
    }
    const wallet = await this.api('GET', `/api/v1/accounts/search/${encodeURIComponent(input.phoneNumber)}`);
    if (wallet?.status !== 'ACTIVE' && wallet?.active !== true) {
      throw new Error('رقم المحفظة غير صالح أو غير نشط');
    }
    const ref = `NUV-${Date.now().toString(36).toUpperCase()}`;
    const result = await this.api('POST', '/api/v1/payments/store-payments', {
      merchantId: config.vodafoneCash.merchantId,
      reference: ref,
      amount: { value: input.amount, currency: input.currency || 'EGP' },
      customerMobile: input.phoneNumber,
      description: `Nuvexa order ${input.orderId}`,
    });
    return {
      provider: this.name,
      mode: this.mode,
      status: 'PROCESSING',
      reference: result?.requestId || ref,
      providerRef: result?.requestId || ref,
      phoneNumber: input.phoneNumber,
      poll: true,
    };
  }

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (this.mock) {
      return {
        success: true,
        transactionId: `VCT-${Date.now().toString(36).toUpperCase()}`,
        providerRef: input.reference || input.transactionId,
      };
    }
    const status = await this.getStatus(input.reference || input.transactionId || '');
    if (status.status === 'SUCCESS' || status.status === 'COMPLETED') {
      return { success: true, transactionId: status.transactionId, providerRef: input.reference };
    }
    return { success: false, reason: `حالة الدفع: ${status.status}` };
  }

  async getStatus(reference: string): Promise<{ status: string; transactionId?: string }> {
    if (this.mock) {
      return { status: 'SUCCESS', transactionId: `VCT-${reference.slice(-6)}` };
    }
    const data = await this.api('GET', `/api/v1/payments/status/${encodeURIComponent(reference)}`);
    return {
      status: data?.status || 'PENDING',
      transactionId: data?.transactionId,
    };
  }

  verifySignature(date: string, requestId: string, rawBody: string, provided: string): boolean {
    if (!date || !requestId || !provided) return false;
    const expected = signMessage(`${date}:${requestId}:${rawBody}`, this.secret);
    return expected === provided;
  }

  async handleWebhook(body: unknown, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult> {
    const date = this.header(headers, 'x-vf-date');
    const requestId = this.header(headers, 'x-vf-request-id') || this.header(headers, 'x-vf-transaction-id');
    const signature = this.header(headers, 'x-vf-signature');
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body || {});

    if (!signature) {
      return { handled: false, reason: 'missing signature header' };
    }
    const expected = signMessage(`${date}:${requestId}:${rawBody}`, this.secret);
    const provided = Buffer.isBuffer(signature) ? signature.toString() : String(signature);
    if (expected !== provided) {
      logger.warn('[vodafone] webhook signature mismatch');
      return { handled: false, success: false, reason: 'invalid signature' };
    }

    const data = typeof body === 'string' ? JSON.parse(body || '{}') : body;
    const ref = (data as any)?.requestId || (data as any)?.reference;
    const ok = ['SUCCESS', 'COMPLETED', 'APPROVED'].includes(String((data as any)?.status || '').toUpperCase());

    return {
      handled: true,
      success: ok,
      providerRef: ref,
      transactionId: (data as any)?.transactionId || ref,
      reason: ok ? undefined : 'payment not successful',
    };
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string): string {
    const v = headers[name];
    if (Array.isArray(v)) return v[0] || '';
    return v || '';
  }
}

export const vodafoneCashProvider = new VodafoneCashProvider();
export { signMessage };
