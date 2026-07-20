import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;
  
  socket = io('/', {
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[Socket.io] Connected:', socket?.id);
    socket?.emit('join_room', 'dashboard');
  });

  socket.on('disconnect', () => {
    console.log('[Socket.io] Disconnected');
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
