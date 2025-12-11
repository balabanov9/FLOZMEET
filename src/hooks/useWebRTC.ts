'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { getSettings, getVideoConstraints, getAudioConstraints } from '@/lib/settings';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:64.188.83.189:3478',
      username: 'flozmeet',
      credential: 'flozmeet123',
    },
    {
      urls: 'turn:64.188.83.189:3478?transport=tcp',
      username: 'flozmeet',
      credential: 'flozmeet123',
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(roomId: string, odId: string, userName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketIdMap = useRef<Map<string, string>>(new Map()); // odId -> socketId
  const socket = useRef(getSocket());

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  const createPeerConnection = useCallback((odIdParam: string, socketId: string) => {
    const existingPc = peerConnections.current.get(odIdParam);
    if (existingPc) {
      existingPc.close();
    }

    socketIdMap.current.set(odIdParam, socketId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(odIdParam, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', {
          to: socketId,
          candidate: event.candidate,
          from: socket.current.id,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Got remote track:', event.track.kind);
      setParticipants((prev) => {
        const updated = new Map(prev);
        const participant = updated.get(odIdParam);
        if (participant) {
          updated.set(odIdParam, { ...participant, stream: event.streams[0] });
        } else {
          updated.set(odIdParam, {
            id: odIdParam,
            name: 'Участник',
            stream: event.streams[0],
            audioEnabled: true,
            videoEnabled: true,
          });
        }
        return updated;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      }
      if (pc.connectionState === 'failed') {
        pc.restartIce();
      }
    };

    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log('Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });
    }

    return pc;
  }, []);

  const initializeMedia = useCallback(async () => {
    try {
      const settings = getSettings();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
        video: getVideoConstraints(settings.videoQuality),
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media:', error);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: false,
        });
        setLocalStream(audioStream);
        localStreamRef.current = audioStream;
        setVideoEnabled(false);
        return audioStream;
      } catch {
        return null;
      }
    }
  }, []);

  const joinRoom = useCallback(async (initialAudio = true, initialVideo = true) => {
    const stream = await initializeMedia();
    if (!stream) return;
    
    stream.getAudioTracks().forEach((t) => (t.enabled = initialAudio));
    stream.getVideoTracks().forEach((t) => (t.enabled = initialVideo));
    setAudioEnabled(initialAudio);
    setVideoEnabled(initialVideo);
    
    socket.current.emit('join-room', { roomId, odId, userName });
  }, [roomId, odId, userName, initializeMedia]);

  useEffect(() => {
    const s = socket.current;

    s.on('existing-participants', async (list: Array<{ id: string; name: string; socketId: string }>) => {
      console.log('Existing participants:', list);
      for (const p of list) {
        setParticipants((prev) => {
          const updated = new Map(prev);
          updated.set(p.id, { id: p.id, name: p.name, audioEnabled: true, videoEnabled: true });
          return updated;
        });

        const pc = createPeerConnection(p.id, p.socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        s.emit('offer', { to: p.socketId, offer, from: s.id });
      }
    });

    s.on('user-joined', async ({ odId: odIdParam, userName: name, socketId }: { odId: string; userName: string; socketId: string }) => {
      console.log('User joined:', name);
      setParticipants((prev) => {
        const updated = new Map(prev);
        updated.set(odIdParam, { id: odIdParam, name, audioEnabled: true, videoEnabled: true });
        return updated;
      });

      const pc = createPeerConnection(odIdParam, socketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit('offer', { to: socketId, offer, from: s.id });
    });

    s.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('Got offer from:', from);
      
      let pc: RTCPeerConnection | undefined;
      let foundOdId = '';
      
      socketIdMap.current.forEach((sid, odIdKey) => {
        if (sid === from) {
          pc = peerConnections.current.get(odIdKey);
          foundOdId = odIdKey;
        }
      });

      if (!pc) {
        foundOdId = `remote-${from}`;
        pc = createPeerConnection(foundOdId, from);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('answer', { to: from, answer, from: s.id });
    });

    s.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      console.log('Got answer');
      peerConnections.current.forEach(async (pc) => {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });
    });

    s.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      peerConnections.current.forEach(async (pc) => {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
      });
    });

    s.on('user-left', ({ odId: odIdParam }: { odId: string }) => {
      const pc = peerConnections.current.get(odIdParam);
      if (pc) {
        pc.close();
        peerConnections.current.delete(odIdParam);
      }
      socketIdMap.current.delete(odIdParam);
      setParticipants((prev) => {
        const updated = new Map(prev);
        updated.delete(odIdParam);
        return updated;
      });
    });

    s.on('user-toggle-audio', ({ odId: odIdParam, enabled }: { odId: string; enabled: boolean }) => {
      setParticipants((prev) => {
        const updated = new Map(prev);
        const p = updated.get(odIdParam);
        if (p) updated.set(odIdParam, { ...p, audioEnabled: enabled });
        return updated;
      });
    });

    s.on('user-toggle-video', ({ odId: odIdParam, enabled }: { odId: string; enabled: boolean }) => {
      setParticipants((prev) => {
        const updated = new Map(prev);
        const p = updated.get(odIdParam);
        if (p) updated.set(odIdParam, { ...p, videoEnabled: enabled });
        return updated;
      });
    });

    return () => {
      s.off('existing-participants');
      s.off('user-joined');
      s.off('offer');
      s.off('answer');
      s.off('ice-candidate');
      s.off('user-left');
      s.off('user-toggle-audio');
      s.off('user-toggle-video');
    };
  }, [createPeerConnection]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setAudioEnabled(track.enabled);
        socket.current.emit('toggle-audio', { roomId, odId, enabled: track.enabled });
      }
    }
  }, [localStream, roomId, odId]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setVideoEnabled(track.enabled);
        socket.current.emit('toggle-video', { roomId, odId, enabled: track.enabled });
      }
    }
  }, [localStream, roomId, odId]);

  const leaveRoom = useCallback(() => {
    socket.current.emit('leave-room', { roomId, odId });
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    socketIdMap.current.clear();
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setScreenStream(null);
    setParticipants(new Map());
    setIsConnected(false);
  }, [roomId, odId, localStream, screenStream]);

  const sendChatMessage = useCallback((message: string) => {
    socket.current.emit('chat-message', { roomId, message, userName });
  }, [roomId, userName]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
      const videoTrack = localStream?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          sender?.replaceTrack(videoTrack);
        });
      }
      socket.current.emit('screen-share-stopped', { roomId, odId });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: false,
        });
        
        setScreenStream(stream);
        setIsScreenSharing(true);
        
        const screenTrack = stream.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          sender?.replaceTrack(screenTrack);
        });
        
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
        socket.current.emit('screen-share-started', { roomId, odId });
      } catch (error) {
        console.error('Screen share error:', error);
      }
    }
  }, [isScreenSharing, screenStream, localStream, roomId, odId]);

  const sendReaction = useCallback((emoji: string) => {
    socket.current.emit('reaction', { roomId, odId, userName, emoji });
  }, [roomId, odId, userName]);

  return {
    localStream,
    screenStream,
    participants,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    isConnected,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
    sendReaction,
  };
}
