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

// Расширенная конфигурация ICE серверов для лучшего NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Свой TURN сервер
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
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceTransportPolicy: 'all',
};

// SDP модификация для приоритета Opus codec с высоким битрейтом
function preferOpusCodec(sdp: string): string {
  // Добавляем параметры Opus для максимального качества
  // maxaveragebitrate в битах (128kbps = 128000)
  return sdp.replace(
    /a=fmtp:111 /g,
    'a=fmtp:111 maxaveragebitrate=128000;stereo=1;sprop-stereo=1;'
  );
}

export function useWebRTC(roomId: string, odId: string, userName: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socket = useRef(getSocket());
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null);

  // Применяем оптимальные настройки к peer connection
  const optimizePeerConnection = useCallback((pc: RTCPeerConnection) => {
    // Настраиваем приоритет для аудио (голос важнее видео)
    pc.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'audio') {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 510000; // 510kbps для Opus
          params.encodings[0].priority = 'high';
          params.encodings[0].networkPriority = 'high';
          sender.setParameters(params).catch(console.error);
        }
      }
      if (sender.track?.kind === 'video') {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 2500000; // 2.5Mbps для видео
          params.encodings[0].maxFramerate = 60;
          sender.setParameters(params).catch(console.error);
        }
      }
    });
  }, []);

  const createPeerConnection = useCallback((participantId: string, participantSocketId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit('ice-candidate', {
          to: participantSocketId,
          candidate: event.candidate,
          from: socket.current.id,
        });
      }
    };

    pc.ontrack = (event) => {
      setParticipants((prev: Map<string, Participant>) => {
        const updated = new Map(prev);
        const participant = updated.get(participantId);
        if (participant) {
          updated.set(participantId, { ...participant, stream: event.streams[0] });
        }
        return updated;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        // Оптимизируем после установки соединения
        optimizePeerConnection(pc);
      }
      if (pc.connectionState === 'failed') {
        // Пытаемся переподключиться
        pc.restartIce();
      }
    };

    // Мониторинг качества соединения
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        // Даём 3 секунды на восстановление
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            pc.restartIce();
          }
        }, 3000);
      }
    };

    if (localStream) {
      localStream.getTracks().forEach((track: MediaStreamTrack) => {
        const sender = pc.addTrack(track, localStream);
        
        // Настраиваем параметры отправки
        if (track.kind === 'audio') {
          const params = sender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = 510000;
          params.encodings[0].priority = 'high';
          sender.setParameters(params).catch(console.error);
        }
      });
    }

    peerConnections.current.set(participantId, pc);
    return pc;
  }, [localStream, optimizePeerConnection]);

  const initializeMedia = useCallback(async () => {
    try {
      // Получаем настройки качества из localStorage
      const settings = getSettings();
      const videoConstraints = getVideoConstraints(settings.videoQuality);
      const audioConstraints = getAudioConstraints();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });
      
      // Применяем дополнительные настройки к аудио треку
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        await audioTrack.applyConstraints({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }).catch(console.error);
      }
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: false,
        });
        setLocalStream(audioStream);
        setVideoEnabled(false);
        return audioStream;
      } catch (audioError) {
        console.error('Error accessing audio:', audioError);
        return null;
      }
    }
  }, []);

  const joinRoom = useCallback(async (initialAudio = true, initialVideo = true) => {
    const stream = await initializeMedia();
    if (!stream) return;
    
    // Применяем начальное состояние камеры/микрофона
    stream.getAudioTracks().forEach((track) => {
      track.enabled = initialAudio;
    });
    stream.getVideoTracks().forEach((track) => {
      track.enabled = initialVideo;
    });
    setAudioEnabled(initialAudio);
    setVideoEnabled(initialVideo);
    
    socket.current.emit('join-room', { roomId, odId, userName });
  }, [roomId, odId, userName, initializeMedia]);

  useEffect(() => {
    const s = socket.current;

    s.on('existing-participants', async (existingParticipants: Array<{ id: string; name: string; socketId: string }>) => {
      for (const participant of existingParticipants) {
        setParticipants((prev: Map<string, Participant>) => {
          const updated = new Map(prev);
          updated.set(participant.id, {
            id: participant.id,
            name: participant.name,
            audioEnabled: true,
            videoEnabled: true,
          });
          return updated;
        });

        const pc = createPeerConnection(participant.id, participant.socketId);
        
        // Создаём offer с оптимальными настройками
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        
        // Модифицируем SDP для лучшего качества аудио
        if (offer.sdp) {
          offer.sdp = preferOpusCodec(offer.sdp);
        }
        
        await pc.setLocalDescription(offer);
        s.emit('offer', { to: participant.socketId, offer, from: s.id });
      }
    });

    s.on('user-joined', async ({ odId: odId, userName: name, socketId }: { odId: string; userName: string; socketId: string }) => {
      setParticipants((prev: Map<string, Participant>) => {
        const updated = new Map(prev);
        updated.set(odId, { id: odId, name, audioEnabled: true, videoEnabled: true });
        return updated;
      });
      
      // Создаём peer connection и отправляем offer новому участнику
      const pc = createPeerConnection(odId, socketId);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      if (offer.sdp) {
        offer.sdp = preferOpusCodec(offer.sdp);
      }
      
      await pc.setLocalDescription(offer);
      s.emit('offer', { to: socketId, offer, from: s.id });
    });

    s.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      const entries = Array.from(participants.entries()) as Array<[string, Participant]>;
      const participantEntry = entries.find(([_, p]) => peerConnections.current.has(p.id));

      let pc: RTCPeerConnection;
      if (!participantEntry) {
        const tempId = `temp-${from}`;
        pc = createPeerConnection(tempId, from);
      } else {
        pc = peerConnections.current.get(participantEntry[0])!;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      
      // Модифицируем SDP ответа
      if (answer.sdp) {
        answer.sdp = preferOpusCodec(answer.sdp);
      }
      
      await pc.setLocalDescription(answer);
      s.emit('answer', { to: from, answer, from: s.id });
    });

    s.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      peerConnections.current.forEach(async (pc: RTCPeerConnection) => {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });
    });

    s.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      peerConnections.current.forEach(async (pc: RTCPeerConnection) => {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    });

    s.on('user-left', ({ odId }: { odId: string }) => {
      const pc = peerConnections.current.get(odId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(odId);
      }
      setParticipants((prev: Map<string, Participant>) => {
        const updated = new Map(prev);
        updated.delete(odId);
        return updated;
      });
    });

    s.on('user-toggle-audio', ({ odId, enabled }: { odId: string; enabled: boolean }) => {
      setParticipants((prev: Map<string, Participant>) => {
        const updated = new Map(prev);
        const p = updated.get(odId);
        if (p) updated.set(odId, { ...p, audioEnabled: enabled });
        return updated;
      });
    });

    s.on('user-toggle-video', ({ odId, enabled }: { odId: string; enabled: boolean }) => {
      setParticipants((prev: Map<string, Participant>) => {
        const updated = new Map(prev);
        const p = updated.get(odId);
        if (p) updated.set(odId, { ...p, videoEnabled: enabled });
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
  }, [createPeerConnection, participants]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
        socket.current.emit('toggle-audio', { roomId, odId, enabled: audioTrack.enabled });
      }
    }
  }, [localStream, roomId, odId]);

  const toggleVideo = useCallback(async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    
    if (videoEnabled && videoTrack) {
      // Выключаем камеру - полностью останавливаем трек (LED погаснет)
      videoTrack.stop();
      localStream.removeTrack(videoTrack);
      setVideoEnabled(false);
      socket.current.emit('toggle-video', { roomId, odId, enabled: false });
      
      // Отправляем null трек всем peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || !s.track);
        if (sender) {
          sender.replaceTrack(null).catch(console.error);
        }
      });
    } else {
      // Включаем камеру - получаем новый трек
      try {
        const settings = getSettings();
        const videoConstraints = getVideoConstraints(settings.videoQuality);
        const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        localStream.addTrack(newVideoTrack);
        setVideoEnabled(true);
        socket.current.emit('toggle-video', { roomId, odId, enabled: true });
        
        // Отправляем новый трек всем peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video' || !s.track);
          if (sender) {
            sender.replaceTrack(newVideoTrack).catch(console.error);
          }
        });
      } catch (error) {
        console.error('Error enabling video:', error);
      }
    }
  }, [localStream, videoEnabled, roomId, odId]);

  const leaveRoom = useCallback(() => {
    socket.current.emit('leave-room', { roomId, odId });
    peerConnections.current.forEach((pc: RTCPeerConnection) => pc.close());
    peerConnections.current.clear();
    if (localStream) {
      localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    setLocalStream(null);
    setScreenStream(null);
    setParticipants(new Map());
    setIsConnected(false);
  }, [roomId, odId, localStream, screenStream]);

  const sendChatMessage = useCallback((message: string) => {
    socket.current.emit('chat-message', { roomId, message, userName });
  }, [roomId, userName]);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 60, max: 60 },
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      setScreenStream(stream);
      setIsScreenSharing(true);

      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          originalVideoTrack.current = videoTrack;
        }
      }

      const screenTrack = stream.getVideoTracks()[0];
      
      // Настраиваем высокий битрейт для screen share
      peerConnections.current.forEach((pc: RTCPeerConnection) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
          // Увеличиваем битрейт для screen share
          const params = sender.getParameters();
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = 8000000; // 8Mbps для screen share
            params.encodings[0].maxFramerate = 60;
            sender.setParameters(params).catch(console.error);
          }
        }
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };

      socket.current.emit('screen-share-started', { roomId, odId });
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }, [localStream, roomId, odId]);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setScreenStream(null);
    }
    
    setIsScreenSharing(false);

    if (originalVideoTrack.current) {
      peerConnections.current.forEach((pc: RTCPeerConnection) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && originalVideoTrack.current) {
          sender.replaceTrack(originalVideoTrack.current);
          // Возвращаем обычный битрейт
          const params = sender.getParameters();
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = 2500000;
            sender.setParameters(params).catch(console.error);
          }
        }
      });
    }

    socket.current.emit('screen-share-stopped', { roomId, odId });
  }, [screenStream, roomId, odId]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const sendReaction = useCallback((emoji: string) => {
    socket.current.emit('reaction', { roomId, odId, userName, emoji });
  }, [roomId, odId, userName]);

  // Функция для получения статистики соединения (для отладки)
  const getConnectionStats = useCallback(async () => {
    const stats: Record<string, unknown> = {};
    const entries = Array.from(peerConnections.current.entries());
    for (const [id, pc] of entries) {
      const report = await pc.getStats();
      report.forEach((stat) => {
        if (stat.type === 'inbound-rtp' || stat.type === 'outbound-rtp') {
          stats[id] = stat;
        }
      });
    }
    return stats;
  }, []);

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
    getConnectionStats,
  };
}
