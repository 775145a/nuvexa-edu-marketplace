import zlib from 'zlib';
import { Prisma } from '../../generated/client';
import { prisma } from './prisma';
import { getStorage } from './storage';

const BACKUP_PREFIX = 'backups/';
const KEEP = 14;

function modelNames(): string[] {
  return Prisma.dmmf.datamodel.models.map((m) => m.dbName || m.name);
}

async function dumpAll(): Promise<Record<string, unknown[]>> {
  const dump: Record<string, unknown[]> = {};
  for (const name of modelNames()) {
    const delegate = (prisma as any)[name];
    if (!delegate || typeof delegate.findMany !== 'function') continue;
    dump[name] = await delegate.findMany();
  }
  return dump;
}

async function pruneOld(): Promise<number> {
  const storage = getStorage();
  const keys = (await storage.listFiles(BACKUP_PREFIX)).sort();
  const excess = keys.slice(0, Math.max(0, keys.length - KEEP));
  for (const key of excess) {
    try {
      await storage.deleteFile(key);
    } catch {
      // ignore individual deletion failures during rotation
    }
  }
  return excess.length;
}

export async function runBackup() {
  const started = Date.now();
  const dump = await dumpAll();
  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[:.]/g, '-');
  const payload = JSON.stringify({ createdAt, data: dump });
  const gz = zlib.gzipSync(payload, { level: 9 });
  const key = `${BACKUP_PREFIX}${stamp}.json.gz`;

  const storage = getStorage();
  await storage.upload({ key, mimeType: 'application/gzip', fileName: `${stamp}.json.gz`, data: gz });
  const removed = await pruneOld();

  return {
    key,
    size: gz.length,
    bytes: payload.length,
    tables: Object.keys(dump).length,
    rows: Object.values(dump).reduce((s, rows) => s + rows.length, 0),
    removed,
    kept: KEEP,
    durationMs: Date.now() - started,
    createdAt,
  };
}
