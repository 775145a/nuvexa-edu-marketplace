import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { config } from '../../config';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';
import { getStorage, isLocalStorage, LocalStorageProvider } from '../../services/storage';
import { logger } from '../../services/logger';

const router = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/x-m4v', 'video/x-msvideo', 'video/x-flv', 'video/x-ms-wmv', 'video/3gpp', 'video/mpeg', 'video/ogg'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_DOC = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'text/plain',
  'text/csv',
];

const ALLOWED = [...ALLOWED_VIDEO, ...ALLOWED_IMAGE, ...ALLOWED_DOC];

function isAllowed(mime: string): boolean {
  return ALLOWED.includes(mime);
}

const tmpDir = path.resolve(process.cwd(), config.upload.path, '.tmp');
fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, tmpDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (isAllowed(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`) as any);
  },
});

function extFor(mime: string): string {
  const map: Record<string, string> = {
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/x-matroska': 'mkv', 'video/x-m4v': 'm4v',
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip', 'application/vnd.rar': 'rar', 'application/x-7z-compressed': '7z',
    'text/plain': 'txt', 'text/csv': 'csv',
  };
  return map[mime] || 'bin';
}

function generateKey(entity: string, mime: string): string {
  const now = new Date();
  const ym = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `${entity}/${ym}/${crypto.randomUUID()}.${extFor(mime)}`;
}

router.post('/storage/upload', uploadLimiter, authenticate, (req: any, res) => {
  const entity = (req.query.entity as string) || 'general';
  const safeEntity = /^[a-z0-9-]{1,40}$/.test(entity) ? entity : 'general';
  const wantTranscode = req.query.transcode === 'true';

  upload.single('file')(req as any, res, async (err: any) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const storage = getStorage();
    const tmpPath = req.file.path;
    const isImage = req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype.startsWith('video/');
    const SKIP_IMAGE = ['image/gif', 'image/svg+xml'];

    try {
      if (isImage && !SKIP_IMAGE.includes(req.file.mimetype) && config.image.optimize) {
        const sharp = (await import('sharp')).default;
        const optimized = await sharp(tmpPath)
          .rotate()
          .resize({ width: config.image.maxWidth, withoutEnlargement: true })
          .webp({ quality: config.image.quality })
          .toBuffer();
        const key = generateKey(safeEntity, 'image/webp');
        const result = await storage.upload({
          key,
          mimeType: 'image/webp',
          fileName: req.file.originalname,
          data: optimized,
        });
        fs.unlink(tmpPath, () => {});
        const url = await storage.getSignedUrl(key, { expirySeconds: config.storage.signedUrlTtl });
        return res.status(201).json({
          success: true,
          data: {
            key: result.key,
            url,
            size: result.size,
            mimeType: 'image/webp',
            fileName: req.file.originalname,
            optimized: true,
          },
        });
      }

      if (isVideo && config.transcode.enabled && wantTranscode) {
        const key = generateKey(safeEntity, req.file.mimetype);
        const stream = fs.createReadStream(tmpPath) as unknown as NodeJS.ReadableStream;
        const result = await storage.uploadStream({
          key,
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
          stream,
          size: req.file.size,
        });
        const url = await storage.getSignedUrl(key, { expirySeconds: config.storage.signedUrlTtl });

        const { prisma } = await import('../../services/prisma');
        const { enqueueVideoJob } = await import('../../services/videoJobs');
        const job = await prisma.videoJob.create({
          data: {
            sourceKey: key,
            sourcePath: tmpPath,
            entity: safeEntity,
            ownerId: (req as any).userId!,
          },
        });
        await enqueueVideoJob(job.id);

        return res.status(202).json({
          success: true,
          processing: true,
          data: {
            key,
            url,
            size: result.size,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            hls: null,
            videoJob: { id: job.id, status: 'PENDING' },
          },
        });
      }

      const key = generateKey(safeEntity, req.file.mimetype);
      const stream = fs.createReadStream(tmpPath) as unknown as NodeJS.ReadableStream;
      const result = await storage.uploadStream({
        key,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        stream,
        size: req.file.size,
      });
      fs.unlink(tmpPath, () => {});
      const url = await storage.getSignedUrl(key, { expirySeconds: config.storage.signedUrlTtl });
      res.status(201).json({
        success: true,
        data: {
          key: result.key,
          url,
          size: result.size,
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
        },
      });
    } catch (uploadErr: any) {
      fs.unlink(tmpPath, () => {});
      res.status(500).json({ success: false, message: uploadErr.message });
    }
  });
});

router.post('/storage/sign', uploadLimiter, authenticate, async (req: any, res) => {
  try {
    const { key, downloadName } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'Key is required' });
    const storage = getStorage();
    const url = await storage.getSignedUrl(key, {
      expirySeconds: config.storage.signedUrlTtl,
      downloadName,
    });
    res.json({ success: true, data: { url } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/files/:key(*)', async (req, res) => {
  try {
    const key = req.params.key;
    const { expires, sig } = req.query;

    if (!isLocalStorage()) {
      return res.status(400).json({ success: false, message: 'Not available on this provider' });
    }

    const local = getStorage() as unknown as LocalStorageProvider;
    if (!local.verifySignature(key, parseInt(expires as string, 10), sig as string)) {
      return res.status(403).json({ success: false, message: 'Link expired or invalid' });
    }

    const file = await local.getFile(key);
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    const download = req.query.name as string | undefined;
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=31536000');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Length', String(file.size));
    res.setHeader('Accept-Ranges', 'bytes');
    if (download) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(download)}"`);
    }
    (file.stream as any).pipe(res);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
