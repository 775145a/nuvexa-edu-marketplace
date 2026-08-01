import { Router } from 'express';
import { prisma } from '../../services/prisma';
import { handleWebhook, verifyWebhookSignature } from '../../services/payments';
import { completeOrderAndEnroll } from '../../services/payments/completeOrder';
import { logger } from '../../services/logger';

const router = Router();

async function completeFromProvider(orderId: string | undefined, opts: { transactionId?: string; providerRef?: string }) {
  if (!orderId) return;
  const payment = await prisma.payment.findFirst({
    where: { providerRef: opts.providerRef || orderId, status: 'PENDING' },
  });
  if (!payment) {
    logger.warn(`[webhook] no pending payment matched orderId=${orderId} ref=${opts.providerRef}`);
    return;
  }
  await completeOrderAndEnroll(payment.orderId, {
    transactionId: opts.transactionId,
    providerRef: opts.providerRef,
  });
}

router.post('/webhook/paymob', async (req, res) => {
  try {
    const raw = JSON.stringify(req.body || {});
    const provided = (req.body as any)?.hmac || '';
    if (!verifyWebhookSignature('paymob', raw, provided)) {
      logger.warn('[webhook] paymob HMAC verification failed');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const result = await handleWebhook('paymob', req.body, {});
    if (result.handled && result.success) {
      await completeFromProvider(result.orderId, {
        transactionId: result.transactionId,
        providerRef: result.providerRef,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error(`[webhook] paymob error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/webhook/vodafone-cash', async (req, res) => {
  try {
    const raw = JSON.stringify(req.body || {});
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const provided = (Array.isArray(headers['x-vf-signature']) ? headers['x-vf-signature'][0] : headers['x-vf-signature']) || '';
    const date = (Array.isArray(headers['x-vf-date']) ? headers['x-vf-date'][0] : headers['x-vf-date']) || '';
    const requestId = (Array.isArray(headers['x-vf-request-id']) ? headers['x-vf-request-id'][0] : headers['x-vf-request-id']) || '';

    if (!verifyWebhookSignature('vodafone_cash', raw, provided, { date, requestId })) {
      logger.warn('[webhook] vodafone signature verification failed');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const result = await handleWebhook('vodafone_cash', req.body, headers);
    if (result.handled && result.success) {
      await completeFromProvider(result.providerRef, {
        transactionId: result.transactionId,
        providerRef: result.providerRef,
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error(`[webhook] vodafone error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
