import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
}

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return socket;
  }
  socket = io(apiBase(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  return socket;
}

export function onNotification(cb: (data: any) => void): () => void {
  const s = getSocket();
  if (!s) return () => {};
  s.on('notification:new', cb);
  return () => {
    s.off('notification:new', cb);
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
