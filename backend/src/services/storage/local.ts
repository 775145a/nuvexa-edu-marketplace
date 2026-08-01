import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { config } from '../../config';
import { StorageProvider, UploadInput, UploadStreamInput, SignedUrlOptions, UploadResult } from './types';

const pipelineAsync = promisify(pipeline);

function resolveRoot(): string {
  return path.isAbsolute(config.upload.path)
    ? config.upload.path
    : path.resolve(process.cwd(), config.upload.path);
}

function safeJoin(root: string, key: string): string {
  const full = path.resolve(root, key);
  if (!full.startsWith(path.resolve(root))) throw new Error('Invalid storage key');
  return full;
}

function sign(key: string, expiresAt: number): string {
  return crypto
    .createHmac('sha256', config.jwt.secret)
    .update(`${key}:${expiresAt}`)
    .digest('hex')
    .slice(0, 32);
}

export class LocalStorageProvider implements StorageProvider {
  private root: string;

  constructor() {
    this.root = resolveRoot();
    fs.mkdirSync(this.root, { recursive: true });
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const target = safeJoin(this.root, input.key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const data = input.data ?? Buffer.alloc(0);
    fs.writeFileSync(target, data);
    return {
      key: input.key,
      url: input.key,
      size: data.length,
      mimeType: input.mimeType,
      fileName: input.fileName,
    };
  }

  async uploadStream(input: UploadStreamInput): Promise<UploadResult> {
    const target = safeJoin(this.root, input.key);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await pipelineAsync(input.stream, fs.createWriteStream(target));
    return {
      key: input.key,
      url: input.key,
      size: input.size,
      mimeType: input.mimeType,
      fileName: input.fileName,
    };
  }

  async getSignedUrl(key: string, opts: SignedUrlOptions = {}): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + (opts.expirySeconds ?? 3600);
    const base = `${config.platform.url.replace(/\/$/, '')}${config.apiPrefix}/files/${encodeURIComponent(key)}`;
    const qs = new URLSearchParams({
      expires: String(expiresAt),
      sig: sign(key, expiresAt),
    });
    if (opts.downloadName) qs.set('name', opts.downloadName);
    return `${base}?${qs.toString()}`;
  }

  async deleteFile(key: string): Promise<void> {
    const target = safeJoin(this.root, key);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }

  async getFile(key: string) {
    const target = safeJoin(this.root, key);
    if (!fs.existsSync(target)) return null;
    const stat = fs.statSync(target);
    const ext = path.extname(key).slice(1);
    const mimeType = extToMime(ext);
    return { stream: fs.createReadStream(target) as unknown as NodeJS.ReadableStream, mimeType, size: stat.size };
  }

  verifySignature(key: string, expiresAt: number, sig: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (!sig || !expiresAt || expiresAt < now) return false;
    const expected = sign(key, expiresAt);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  }
}

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska', m4v: 'video/x-m4v',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed', mp3: 'audio/mpeg',
    wav: 'audio/wav', txt: 'text/plain', csv: 'text/csv', json: 'application/json', aac: 'audio/aac', mpeg: 'video/mpeg',
    avi: 'video/x-msvideo', flv: 'video/x-flv', wmv: 'video/x-ms-wmv', '3gp': 'video/3gpp', srt: 'text/plain',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}
