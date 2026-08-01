export type PaymentProviderName = 'mock' | 'vodafone_cash' | 'paymob';

export interface PaymentInitiateInput {
  orderId: string;
  userId: string;
  phoneNumber?: string;
  amount: number;
  currency: string;
}

export interface PaymentIntent {
  provider: PaymentProviderName;
  mode: 'auto' | 'manual';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reference?: string;
  providerRef?: string;
  phoneNumber?: string;
  storeName?: string;
  walletNumber?: string;
  instructions?: string;
  poll?: boolean;
  payUrl?: string;
}

export interface PaymentVerifyInput {
  orderId: string;
  transactionId?: string;
  phoneNumber?: string;
  reference?: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  transactionId?: string;
  providerRef?: string;
  reason?: string;
}

export interface WebhookResult {
  handled: boolean;
  success?: boolean;
  orderId?: string;
  transactionId?: string;
  providerRef?: string;
  reason?: string;
}

export interface PaymentProvider {
  name: PaymentProviderName;
  mode: 'auto' | 'manual';
  isConfigured: boolean;
  initiate(input: PaymentInitiateInput): Promise<PaymentIntent>;
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
  getStatus(reference: string): Promise<{ status: string; transactionId?: string }>;
  handleWebhook?(body: unknown, headers: Record<string, string | string[] | undefined>): Promise<WebhookResult>;
}
