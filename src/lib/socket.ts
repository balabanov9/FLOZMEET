import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    // В продакшене используем тот же хост (через Nginx proxy)
    // Локально — отдельный порт 3001
    const serverUrl = process.env.NEXT_PUBLIC_SIGNAL_SERVER || 
      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
        ? window.location.origin 
        : 'http://localhost:3001');
    
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
