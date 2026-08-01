import type { NextApiRequest, NextApiResponse } from 'next';
import app from '../../src/app';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

function readRaw(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  (req as any)._body = true;
  if (ct.includes('application/json')) {
    const raw = await readRaw(req);
    if (raw.length) {
      try {
        (req as any).body = JSON.parse(raw.toString('utf8'));
      } catch {
        (req as any).body = undefined;
      }
    } else if (req.body === undefined) {
      (req as any).body = {};
    }
  }
  return app(req as never, res as never);
}
