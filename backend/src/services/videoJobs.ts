import fs from 'fs';
import { prisma } from './prisma';
import { logger } from './logger';
import { notifyUser } from './notification';
import { enqueueMail } from './queue';

const queue: string[] = [];
let processing = false;

export function resumePendingJobs(): void {
  void (async () => {
    try {
      const pending = await prisma.videoJob.findMany({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      });
      for (const job of pending) {
        await prisma.videoJob.update({ where: { id: job.id }, data: { status: 'PENDING' } });
        queue.push(job.id);
      }
      if (pending.length > 0) {
        logger.info(`[videoJobs] resumed ${pending.length} pending job(s)`);
        void pump();
      }
    } catch (err) {
      logger.error(`[videoJobs] resume failed: ${err instanceof Error ? err.message : err}`);
    }
  })();
}

export async function enqueueVideoJob(id: string): Promise<void> {
  queue.push(id);
  void pump();
}

async function pump(): Promise<void> {
  if (processing) return;
  processing = true;
  while (queue.length > 0) {
    const id = queue.shift()!;
    try {
      await processJob(id);
    } catch (err) {
      logger.error(`[videoJobs] job ${id} failed: ${err instanceof Error ? err.message : err}`);
      await prisma.videoJob
        .update({ where: { id }, data: { status: 'FAILED', error: err instanceof Error ? err.message : String(err) } })
        .catch(() => {});
    }
  }
  processing = false;
}

async function processJob(id: string): Promise<void> {
  const job = await prisma.videoJob.findUnique({ where: { id } });
  if (!job) return;

  await prisma.videoJob.update({ where: { id }, data: { status: 'PROCESSING', progress: 10, error: null } });

  try {
    const { transcodeToHls } = await import('./transcode');
    const result = await transcodeToHls(job.sourcePath, job.entity, { poster: true });
    if (!result) throw new Error('Transcoding returned no result');

    await prisma.videoJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        resultKey: result.playlistKey,
        resultUrl: result.playlistUrl,
        posterUrl: result.posterUrl,
        duration: result.duration,
        segments: result.segments,
      },
    });

    const owner = await prisma.user.findUnique({
      where: { id: job.ownerId },
      select: { id: true, email: true },
    });

    await notifyUser(job.ownerId, {
      type: 'VIDEO_READY',
      title: 'الفيديو جاهز',
      message: 'تمت معالجة الفيديو (HLS) بنجاح ويمكن استخدامه الآن.',
    });

    if (owner?.email) {
      await enqueueMail({
        to: owner.email,
        subject: 'الفيديو الخاص بك جاهز | Your video is ready',
        html: '<p>تمت معالجة الفيديو (HLS) بنجاح. يمكنك ربطه بمحاضراتك الآن.</p>',
      });
    }

    logger.info(`[videoJobs] job ${id} completed in ${result.segments} segment(s)`);
  } finally {
    try {
      fs.unlinkSync(job.sourcePath);
    } catch { /* already removed */ }
  }
}
