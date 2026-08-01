import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { initRealtime, emitToUser } from '../src/services/realtime';

describe('Realtime notifications', () => {
  let server: Server;
  let client: Socket;
  let url: string;
  let token: string;

  beforeAll(async () => {
    server = createServer();
    await initRealtime(server);
    await new Promise<void>((res) => server.listen(0, res));
    const port = (server.address() as AddressInfo).port;
    url = `http://localhost:${port}`;
    token = jwt.sign({ userId: 'u1', role: 'STUDENT' }, process.env.JWT_SECRET!, { expiresIn: '1h' });
    client = Client(url, { auth: { token }, transports: ['websocket'], timeout: 5000 });
    await new Promise<void>((res, rej) => {
      client.on('connect', () => res());
      client.on('connect_error', (e: Error) => rej(e));
    });
  });

  afterAll(() => {
    client.disconnect();
    server.close();
  });

  it('rejects sockets with an invalid token', async () => {
    const bad = Client(url, { auth: { token: 'garbage' }, transports: ['websocket'], timeout: 5000 });
    await new Promise<void>((res) => bad.on('connect_error', () => { bad.disconnect(); res(); }));
  });

  it('delivers notification:new to the target user room', async () => {
    const payload = { title: 'مرحبا', body: 'test push' };
    const received = new Promise<any>((res) => client.once('notification:new', res));
    emitToUser('u1', 'notification:new', payload);
    await expect(received).resolves.toMatchObject(payload);
  });
});
