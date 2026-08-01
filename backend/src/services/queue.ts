import { config } from '../config';
import { logger } from './logger';
import { sendMailDirect } from './mailTransport';

export interface MailJob {
  to: string;
  subject: string;
  html: string;
}

let queueInstance: any = null;
let workerStarted = false;

function redisConnection() {
  return { url: config.redis.url };
}

async function getQueue(): Promise<any | null> {
  if (config.queue.provider !== 'redis') return null;
  if (!queueInstance) {
    const { Queue } = await import('bullmq');
    queueInstance = new Queue('mail', { connection: redisConnection() });
  }
  return queueInstance;
}

async function ensureWorker(): Promise<void> {
  if (workerStarted || config.queue.provider !== 'redis') return;
  try {
    const { Worker } = await import('bullmq');
    const { default: IORedis } = await import('ioredis');
    const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });
    const worker = new Worker(
      'mail',
      async (job: { data: MailJob }) => {
        await sendMailDirect(job.data.to, job.data.subject, job.data.html);
      },
      { connection }
    );
    worker.on('failed', (job: any, err: Error) => {
      logger.error(`Mail job ${job?.id} failed: ${err.message}`);
    });
    workerStarted = true;
    logger.info('Mail queue worker started (Redis)');
  } catch (err) {
    logger.warn(`Mail worker failed to start: ${err instanceof Error ? err.message : err}`);
  }
}

export async function enqueueMail(job: MailJob): Promise<void> {
  const q = await getQueue();
  if (q) {
    await ensureWorker();
    await q.add('send', job, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    return;
  }
  await sendMailDirect(job.to, job.subject, job.html);
}
