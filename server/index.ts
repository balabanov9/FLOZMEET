import { Server, Socket } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

interface Room {
  participants: Map<string, { socketId: string; name: string }>;
}

const rooms = new Map<string, Room>();

io.on('connection', (socket: Socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, odId, userName }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { participants: new Map() });
    }
    
    const room = rooms.get(roomId)!;
    room.participants.set(odId, { socketId: socket.id, name: userName });
    
    // Notify others in room
    socket.to(roomId).emit('user-joined', { odId, userName, socketId: socket.id });
    
    // Send existing participants to new user
    const existingParticipants = Array.from(room.participants.entries())
      .filter(([id]) => id !== odId)
      .map(([id, data]) => ({ id, ...data }));
    
    socket.emit('existing-participants', existingParticipants);
    console.log(`${userName} joined room ${roomId}`);
  });

  socket.on('offer', ({ to, offer, from }) => {
    io.to(to).emit('offer', { offer, from });
  });

  socket.on('answer', ({ to, answer, from }) => {
    io.to(to).emit('answer', { answer, from });
  });

  socket.on('ice-candidate', ({ to, candidate, from }) => {
    io.to(to).emit('ice-candidate', { candidate, from });
  });

  socket.on('chat-message', ({ roomId, message, userName }) => {
    io.to(roomId).emit('chat-message', { message, userName, timestamp: Date.now() });
  });

  socket.on('toggle-audio', ({ roomId, odId, enabled }) => {
    socket.to(roomId).emit('user-toggle-audio', { odId, enabled });
  });

  socket.on('toggle-video', ({ roomId, odId, enabled }) => {
    socket.to(roomId).emit('user-toggle-video', { odId, enabled });
  });

  socket.on('reaction', ({ roomId, odId, userName, emoji }) => {
    socket.to(roomId).emit('reaction', { odId, userName, emoji });
  });

  socket.on('screen-share-started', ({ roomId, odId }) => {
    socket.to(roomId).emit('screen-share-started', { odId });
  });

  socket.on('screen-share-stopped', ({ roomId, odId }) => {
    socket.to(roomId).emit('screen-share-stopped', { odId });
  });

  socket.on('leave-room', ({ roomId, odId }) => {
    handleLeaveRoom(socket, roomId, odId);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      room.participants.forEach((data, odId) => {
        if (data.socketId === socket.id) {
          handleLeaveRoom(socket, roomId, odId);
        }
      });
    });
  });
});

function handleLeaveRoom(socket: Socket, roomId: string, odId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.participants.delete(odId);
    socket.to(roomId).emit('user-left', { odId });
    socket.leave(roomId);
    if (room.participants.size === 0) {
      rooms.delete(roomId);
    }
  }
}

const PORT = process.env.SIGNAL_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
