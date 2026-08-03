const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PrismaClient } = require('../generated/client');

const prisma = new PrismaClient();

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupRoot = path.resolve(process.cwd(), 'backups');
const KEEP = 14;

async function modelNames() {
  const { Prisma } = require('../generated/client');
  return Object.values(Prisma.ModelName || {});
}

async function run() {
  const names = await modelNames();
  const dump = {};
  for (const name of names) {
    const delegate = prisma[name.charAt(0).toLowerCase() + name.slice(1)];
    if (!delegate || typeof delegate.findMany !== 'function') continue;
    dump[name] = await delegate.findMany();
  }

  fs.mkdirSync(backupRoot, { recursive: true });
  const dest = path.join(backupRoot, `${stamp}.json.gz`);
  const payload = JSON.stringify({ createdAt: new Date().toISOString(), data: dump });
  fs.writeFileSync(dest, zlib.gzipSync(payload, { level: 9 }));

  const rows = Object.values(dump).reduce((s, r) => s + r.length, 0);
  const oldBackups = fs
    .readdirSync(backupRoot)
    .filter((f) => f.endsWith('.json.gz'))
    .sort();
  for (const f of oldBackups.slice(0, Math.max(0, oldBackups.length - KEEP))) {
    fs.rmSync(path.join(backupRoot, f), { force: true });
  }

  console.log(`Backup complete -> ${dest} (${names.length} tables, ${rows} rows, ${payload.length} bytes). Keeping last ${KEEP} backups.`);
}

run()
  .catch((err) => {
    console.error('Backup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
