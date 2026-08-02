import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { config } from '../../config';
import { prisma } from '../../services/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';
import { getStorage, isLocalStorage, LocalStorageProvider } from '../../services/storage';
import { logger } from '../../services/logger';
import { canAccessCourse } from '../../services/access';

const router = Router();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/x-m4v', 'video/x-msvideo', 'video/x-flv', 'video/x-ms-wmv', 'video/3gpp', 'video/mpeg', 'video/ogg'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
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

const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.length >= 8 && b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG',
  'image/webp': (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  'image/gif': (b) => b.length >= 4 && b.toString('ascii', 0, 4) === 'GIF8',
  'application/pdf': (b) => b.length >= 4 && b.toString('ascii', 0, 4) === '%PDF',
  'application/zip': (b) => b.length >= 2 && b[0] === 0x50 && b[1] === 0x4b,
  'application/vnd.rar': (b) => b.length >= 7 && b.toString('ascii', 0, 7) === 'Rar!\x1a\x07',
  'application/x-7z-compressed': (b) => b.length >= 6 && b.toString('ascii', 0, 6) === '7z\xbc\xaf\x27\x1c',
  'text/plain': () => true,
  'text/csv': () => true,
};

function sniffMime(declared: string, firstBytes: Buffer): boolean {
  const check = MAGIC[declared];
  if (!check) return true;
  return check(firstBytes);
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
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
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
    const SKIP_IMAGE = ['image/gif'];

    try {
      const firstBytes = await new Promise<Buffer>((resolve, reject) => {
        fs.open(tmpPath, 'r', (err, fd) => {
          if (err) return reject(err);
          const buf = Buffer.alloc(16);
          fs.read(fd, buf, 0, 16, 0, (readErr, _n, data) => {
            fs.close(fd, () => {});
            if (readErr) return reject(readErr);
            resolve(data);
          });
        });
      });
      if (!sniffMime(req.file.mimetype, firstBytes)) {
        fs.unlink(tmpPath, () => {});
        return res.status(400).json({ success: false, message: 'File content does not match its declared type' });
      }

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

router.post('/storage/sign', uploadLimiter, authenticate, authorize('ADMIN', 'INSTRUCTOR'), async (req: any, res) => {
  try {
    const { key, downloadName } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'Key is required' });
    if (!/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,511}$/.test(key)) {
      return res.status(400).json({ success: false, message: 'Invalid key' });
    }
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

router.post('/storage/sign-lecture', uploadLimiter, authenticate, async (req: AuthRequest, res) => {
  try {
    const { lectureId, downloadName } = req.body;
    if (!lectureId) return res.status(400).json({ success: false, message: 'lectureId is required' });

    const lecture = await prisma.courseLecture.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        videoStorageKey: true,
        isFree: true,
        isPreview: true,
        section: { select: { courseId: true } },
      },
    });
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    const allowed =
      lecture.isFree ||
      lecture.isPreview ||
      (await canAccessCourse(lecture.section.courseId, req.userId, req.userRole));
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'Enrollment required to play this lecture' });
    }
    if (!lecture.videoStorageKey) {
      return res.status(404).json({ success: false, message: 'No stored video for this lecture' });
    }

    const storage = getStorage();
    const url = await storage.getSignedUrl(lecture.videoStorageKey, {
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
