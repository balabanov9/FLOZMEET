'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Flex, Grid, useToast, Text, Badge, useColorModeValue, Button } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { v4 as uuidv4 } from 'uuid';
import { useWebRTC } from '@/hooks/useWebRTC';
import VideoTile from '@/components/VideoTile';
import ControlBar from '@/components/ControlBar';
import ChatPanel from '@/components/ChatPanel';
import PreJoinScreen from '@/components/PreJoinScreen';
import ParticipantsPanel from '@/components/ParticipantsPanel';
import { getSocket } from '@/lib/socket';
import { getSettings, saveSettings, addCallToHistory, updateCallDuration } from '@/lib/settings';

interface ChatMessage {
  userName: string;
  message: string;
  timestamp: number;
}

interface Reaction {
  id: string;
  emoji: string;
  userName: string;
}

const floatUp = keyframes`
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-100px) scale(1.5); }
`;

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const roomId = params.roomId as string;

  const [userName, setUserName] = useState('');
  const [odId] = useState(() => uuidv4());
  const [hasJoined, setHasJoined] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [audioCodec, setAudioCodec] = useState<string>('');
  const callIdRef = useRef<string | null>(null);
  const joinTimeRef = useRef<number>(0);

  const {
    localStream,
    screenStream,
    participants,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage,
    sendReaction,
  } = useWebRTC(roomId, odId, userName);

  // Загружаем имя из настроек
  useEffect(() => {
    const settings = getSettings();
    if (settings.userName) {
      setUserName(settings.userName);
    }
  }, []);

  // Проверяем используемый кодек
  useEffect(() => {
    if (!hasJoined) return;
    
    const checkCodec = async () => {
      try {
        const stats = await getConnectionStats();
        // Проверяем кодек в статистике
        Object.values(stats).forEach((stat: unknown) => {
          const s = stat as Record<string, unknown>;
          if (s && s.mimeType && typeof s.mimeType === 'string') {
            if (s.mimeType.includes('opus')) {
              setAudioCodec('Opus');
            }
          }
        });
      } catch (e) {
        // Если нет соединений, просто показываем Opus (он используется по умолчанию в WebRTC)
        setAudioCodec('Opus');
      }
    };
    
    // Проверяем через 3 секунды после подключения
    const timer = setTimeout(checkCodec, 3000);
    return () => clearTimeout(timer);
  }, [hasJoined, getConnectionStats]);

  useEffect(() => {
    if (!hasJoined) return;

    const socket = getSocket();
    
    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev: ChatMessage[]) => [...prev, msg]);
    });

    socket.on('reaction', ({ odId: odId, userName: name, emoji }: { odId: string; userName: string; emoji: string }) => {
      const reactionId = `${odId}-${Date.now()}`;
      setReactions((prev) => [...prev, { id: reactionId, emoji, userName: name }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reactionId));
      }, 3000);
    });

    return () => {
      socket.off('chat-message');
      socket.off('reaction');
    };
  }, [hasJoined]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleAudio();
      }
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        toggleVideo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAudio, toggleVideo]);

  const handleJoin = async (audioOn: boolean, videoOn: boolean) => {
    if (!userName.trim()) {
      toast({ title: 'Введите ваше имя', status: 'warning' });
      return;
    }
    
    // Сохраняем имя и добавляем в историю
    saveSettings({ userName });
    const call = addCallToHistory(roomId);
    callIdRef.current = call.id;
    joinTimeRef.current = Date.now();
    
    setHasJoined(true);
    await joinRoom(audioOn, videoOn);
  };

  const handleLeave = () => {
    // Сохраняем длительность звонка
    if (callIdRef.current && joinTimeRef.current) {
      const duration = Math.floor((Date.now() - joinTimeRef.current) / 1000);
      const participantNames = Array.from(participants.values()).map((p) => p.name);
      updateCallDuration(callIdRef.current, duration, participantNames);
    }
    leaveRoom();
    router.push('/');
  };

  const handleReaction = useCallback((emoji: string) => {
    sendReaction(emoji);
    const reactionId = `local-${Date.now()}`;
    setReactions((prev) => [...prev, { id: reactionId, emoji, userName }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== reactionId));
    }, 3000);
  }, [sendReaction, userName]);

  if (!hasJoined) {
    return (
      <PreJoinScreen
        userName={userName}
        onUserNameChange={setUserName}
        onJoin={handleJoin}
        roomId={roomId}
      />
    );
  }

  const participantArray = Array.from(participants.values()) as Array<{
    id: string;
    name: string;
    stream?: MediaStream;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }>;
  const totalParticipants = participantArray.length + 1;
  const sidebarWidth = chatOpen || participantsOpen ? '360px' : '0px';

  const bgPrimary = useColorModeValue('#f7f7f7', '#1a1a1a');
  const accentColor = '#00c853';
  const bgSecondary = useColorModeValue('#f7f7f7', '#252525');
  const textPrimary = useColorModeValue('#000000', '#ffffff');
  const textSecondary = useColorModeValue('#666666', '#999999');

  return (
    <Box minH="100vh" bg={bgPrimary} overflow="hidden">
      {/* Codec indicator */}
      {audioCodec && (
        <Badge
          position="fixed"
          top={4}
          left={4}
          bg={accentColor}
          color="black"
          px={3}
          py={1}
          borderRadius="full"
          fontSize="xs"
          fontWeight="medium"
          zIndex={100}
        >
          🎵 {audioCodec} 48kHz
        </Badge>
      )}

      {/* Reactions overlay */}
      <Box position="fixed" bottom="100px" left="50%" transform="translateX(-50%)" zIndex={200} pointerEvents="none">
        {reactions.map((reaction) => (
          <Text
            key={reaction.id}
            fontSize="4xl"
            position="absolute"
            animation={`${floatUp} 3s ease-out forwards`}
            left={`${Math.random() * 100 - 50}px`}
          >
            {reaction.emoji}
          </Text>
        ))}
      </Box>

      {/* Main content area */}
      <Box 
        h="calc(100vh - 88px)" 
        p={{ base: 2, md: 4 }}
        mr={{ base: 0, md: sidebarWidth }}
        transition="margin-right 0.3s ease"
        position="relative"
      >
        {isScreenSharing ? (
          /* Screen sharing layout */
          <Box h="100%" position="relative">
            {/* Screen share - main view */}
            <Box h="100%" w="100%">
              <VideoTile
                stream={screenStream}
                name={`${userName} - Демонстрация`}
                isLocal
                audioEnabled={audioEnabled}
                videoEnabled={true}
                isLarge
                isScreenShare
              />
            </Box>
            
            {/* Camera PiP - top left */}
            <Box
              position="absolute"
              top={4}
              left={4}
              w={{ base: '120px', md: '180px', lg: '220px' }}
              borderRadius="xl"
              overflow="hidden"
              boxShadow="0 4px 20px rgba(0,0,0,0.3)"
              zIndex={10}
            >
              <VideoTile
                stream={localStream}
                name={userName}
                isLocal
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
              />
            </Box>

            {/* Stop button */}
            <Button
              position="absolute"
              bottom={4}
              left="50%"
              transform="translateX(-50%)"
              leftIcon={<Box w="12px" h="12px" bg={accentColor} borderRadius="sm" />}
              bg={bgSecondary}
              color={textPrimary}
              borderRadius="xl"
              px={6}
              h="44px"
              onClick={toggleScreenShare}
              _hover={{ bg: bgPrimary }}
              zIndex={10}
            >
              Остановить демонстрацию
            </Button>
          </Box>
        ) : totalParticipants === 1 ? (
          /* Solo view */
          <Flex h="100%" align="center" justify="center" p={{ base: 2, md: 8 }}>
            <Box 
              w="100%" 
              maxW="1000px" 
              h="100%"
              maxH={{ base: '400px', md: '600px', lg: '700px' }}
            >
              <VideoTile
                stream={localStream}
                name={userName}
                isLocal
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                isLarge
              />
            </Box>
          </Flex>
        ) : (
          /* Multi-participant grid */
          <Grid
            templateColumns={{
              base: '1fr',
              md: totalParticipants === 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              lg: totalParticipants <= 2 ? 'repeat(2, 1fr)' : totalParticipants <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            }}
            templateRows={{
              base: `repeat(${totalParticipants}, 1fr)`,
              md: totalParticipants <= 2 ? '1fr' : 'repeat(2, 1fr)',
            }}
            gap={{ base: 2, md: 3 }}
            h="100%"
            maxW="1400px"
            mx="auto"
          >
            {participantArray.map((participant) => (
              <Box key={participant.id} role="group">
                <VideoTile
                  stream={participant.stream}
                  name={participant.name}
                  audioEnabled={participant.audioEnabled}
                  videoEnabled={participant.videoEnabled}
                  isLarge={totalParticipants === 2}
                />
              </Box>
            ))}
            
            <Box role="group">
              <VideoTile
                stream={localStream}
                name={userName}
                isLocal
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                isLarge={totalParticipants === 2}
              />
            </Box>
          </Grid>
        )}
      </Box>

      {/* Chat panel */}
      <ChatPanel
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSendMessage={sendChatMessage}
      />

      {/* Participants panel */}
      <ParticipantsPanel
        isOpen={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        participants={[
          { id: odId, name: userName, audioEnabled, videoEnabled, isLocal: true },
          ...participantArray.map((p) => ({ ...p, isLocal: false })),
        ]}
      />

      {/* Control bar */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeave={handleLeave}
        onToggleChat={() => {
          setChatOpen(!chatOpen);
          if (participantsOpen) setParticipantsOpen(false);
        }}
        onToggleParticipants={() => {
          setParticipantsOpen(!participantsOpen);
          if (chatOpen) setChatOpen(false);
        }}
        onReaction={handleReaction}
        meetingCode={roomId}
        participantCount={totalParticipants}
      />
    </Box>
  );
}
