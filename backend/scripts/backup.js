const fs = require('fs');
const path = require('path');

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupRoot = path.resolve(process.cwd(), 'backups');
const dest = path.join(backupRoot, stamp);

fs.mkdirSync(dest, { recursive: true });

const filesToCopy = [
  path.resolve(process.cwd(), 'prisma/dev.db'),
  path.resolve(process.cwd(), 'uploads'),
];

let copied = 0;
for (const src of filesToCopy) {
  if (!fs.existsSync(src)) continue;
  const target = path.join(dest, path.basename(src));
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, target, { recursive: true });
  } else {
    fs.copyFileSync(src, target);
  }
  copied++;
}

const oldBackups = fs
  .readdirSync(backupRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .sort()
  .reverse();
const KEEP = 14;
for (const dir of oldBackups.slice(KEEP)) {
  fs.rmSync(path.join(backupRoot, dir.name), { recursive: true, force: true });
}

console.log(`Backup complete -> ${dest} (${copied} item(s)). Keeping last ${KEEP} backups.`);
