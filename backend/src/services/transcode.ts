import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { config } from '../config';
import { getStorage } from './storage';
import { logger } from './logger';

export interface TranscodeResult {
  playlistKey: string;
  playlistUrl: string;
  segments: number;
  duration: number;
  posterUrl?: string;
}

function runFfmpeg(args: string[], binary: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, args, { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-600)}`));
    });
  });
}

export async function transcodeToHls(
  inputPath: string,
  entity: string,
  opts: { poster?: boolean } = {}
): Promise<TranscodeResult | null> {
  if (!config.transcode.enabled) return null;

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nuvexa-hls-'));
  const outDir = path.join(workDir, 'hls');
  fs.mkdirSync(outDir, { recursive: true });
  const playlistPath = path.join(outDir, 'master.m3u8');
  const uuid = crypto.randomUUID();
  const baseKey = `${entity}/hls/${uuid}`;
  const storage = getStorage();

  try {
    const posterPath = path.join(workDir, 'poster.jpg');
    if (opts.poster) {
      try {
        await runFfmpeg(
          ['-y', '-ss', '2', '-i', inputPath, '-frames:v', '1', '-q:v', '3', posterPath],
          config.transcode.ffmpegPath
        );
      } catch (err) {
        logger.warn(`Poster extraction failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    const maxHeight = config.transcode.maxHeight;
    await runFfmpeg(
      [
        '-y',
        '-i', inputPath,
        '-vf', `scale=-2:min(${maxHeight}\\,ih)`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-profile:v', 'main',
        '-level', '3.1',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-hls_time', String(config.transcode.segmentSeconds),
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', path.join(outDir, 'seg%05d.ts'),
        '-f', 'hls',
        playlistPath,
      ],
      config.transcode.ffmpegPath
    );

    const playlistRaw = fs.readFileSync(playlistPath, 'utf8');
    const segFiles = fs.readdirSync(outDir).filter((f) => f.endsWith('.ts')).sort();
    if (segFiles.length === 0) {
      throw new Error('HLS produced no segments');
    }

    const segmentTtl = config.transcode.segmentTtlSeconds;
    const rewritten: string[] = [];
    for (const line of playlistRaw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const segKey = `${baseKey}/${trimmed}`;
        await storage.uploadStream({
          key: segKey,
          mimeType: 'video/mp2t',
          fileName: trimmed,
          stream: fs.createReadStream(path.join(outDir, trimmed)) as unknown as NodeJS.ReadableStream,
          size: fs.statSync(path.join(outDir, trimmed)).size,
        });
        rewritten.push(await storage.getSignedUrl(segKey, { expirySeconds: segmentTtl }));
      } else {
        rewritten.push(line);
      }
    }

    const playlistKey = `${baseKey}/master.m3u8`;
    await storage.upload({
      key: playlistKey,
      mimeType: 'application/vnd.apple.mpegurl',
      fileName: 'master.m3u8',
      data: Buffer.from(rewritten.join('\n'), 'utf8'),
    });
    const playlistUrl = await storage.getSignedUrl(playlistKey, { expirySeconds: segmentTtl });

    let posterUrl: string | undefined;
    if (opts.poster && fs.existsSync(posterPath)) {
      const posterKey = `${baseKey}/poster.jpg`;
      await storage.upload({
        key: posterKey,
        mimeType: 'image/jpeg',
        fileName: 'poster.jpg',
        data: fs.readFileSync(posterPath),
      });
      posterUrl = await storage.getSignedUrl(posterKey, { expirySeconds: segmentTtl });
    }

    const duration = segFiles.length * config.transcode.segmentSeconds;
    return { playlistKey, playlistUrl, segments: segFiles.length, duration, posterUrl };
  } catch (err) {
    logger.error(`HLS transcode failed: ${err instanceof Error ? err.message : err}`);
    return null;
  } finally {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}
