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
import { vodafoneCashProvider } from './vodafoneCash';
import { paymobProvider } from './paymob';

const mockProvider: PaymentProvider = {
  name: 'mock',
  mode: 'manual',
  isConfigured: true,
  async initiate(input: PaymentInitiateInput): Promise<PaymentIntent> {
    const storeName = config.platform.name;
    const walletNumber = config.vodafoneCash.storeWallet;
    return {
      provider: 'mock',
      mode: 'manual',
      status: 'PENDING',
      phoneNumber: input.phoneNumber,
      storeName,
      walletNumber,
      instructions: `حوّل ${input.amount} ${input.currency || 'EGP'} إلى محفظة ${storeName} (رقم ${walletNumber}) ثم أدخل رقم العملية للتأكيد.`,
      poll: false,
    };
  },
  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    return {
      success: true,
      transactionId: input.transactionId || `MOCK-${Date.now().toString(36).toUpperCase()}`,
      providerRef: input.reference || input.transactionId,
    };
  },
  async getStatus(_reference: string): Promise<{ status: string; transactionId?: string }> {
    return { status: 'COMPLETED' };
  },
};

export function getProvider(): PaymentProvider {
  const name = config.payment.provider;
  if (name === 'paymob') {
    if (!paymobProvider.isConfigured) {
      logger.warn('[payments] PAYMENT_PROVIDER=paymob but PAYMOB_API_KEY missing; using mock provider');
      return mockProvider;
    }
    return paymobProvider;
  }
  if (name === 'vodafone_cash') {
    return vodafoneCashProvider;
  }
  return mockProvider;
}

export function providerName(): string {
  return getProvider().name;
}

export function isMockMode(): boolean {
  const p = getProvider();
  return p.name === 'mock' || (p.name === 'vodafone_cash' && !vodafoneCashProvider.isConfigured);
}

export async function initiatePayment(input: PaymentInitiateInput): Promise<PaymentIntent> {
  const provider = getProvider();
  logger.info(`[payments] initiate via ${provider.name} for order ${input.orderId}`);
  return provider.initiate(input);
}

export async function verifyPayment(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
  return getProvider().verify(input);
}

export async function paymentStatus(reference: string): Promise<{ status: string; transactionId?: string }> {
  return getProvider().getStatus(reference);
}

export async function handleWebhook(
  provider: string,
  body: unknown,
  headers: Record<string, string | string[] | undefined>,
): Promise<WebhookResult> {
  if (provider === 'paymob' && paymobProvider.handleWebhook) return paymobProvider.handleWebhook(body, headers);
  if (provider === 'vodafone_cash' && vodafoneCashProvider.handleWebhook) return vodafoneCashProvider.handleWebhook(body, headers);
  return { handled: false, reason: 'unknown provider' };
}

export function verifyWebhookSignature(provider: string, rawBody: string, provided: string, extra: { date?: string; requestId?: string } = {}): boolean {
  if (provider === 'paymob') return paymobProvider.verifyWebhookHmac(rawBody, provided);
  if (provider === 'vodafone_cash') return vodafoneCashProvider.verifySignature(extra.date || '', extra.requestId || '', rawBody, provided);
  return false;
}

export type { PaymentProvider, PaymentIntent, PaymentVerifyResult, WebhookResult };
