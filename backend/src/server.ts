import http from 'http';
import app from './app';
import { config } from './config';
import { initRealtime } from './services/realtime';
import { resumePendingJobs } from './services/videoJobs';
import { logger } from './services/logger';

const server = http.createServer(app);

initRealtime(server).then(() => {
  server.listen(config.port, () => {
    logger.info(`Nuvexa API started on port ${config.port}`);
    logger.info(`Environment: ${config.env}`);
    logger.info(`API Prefix: ${config.apiPrefix}`);
    logger.info(`Storage: ${config.storage.provider} | Cache: ${config.cache.provider} | Queue: ${config.queue.provider} | Transcode: ${config.transcode.enabled ? 'on' : 'off'}`);
  });
  resumePendingJobs();
});

export default server;
