'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box, Button, Flex, Heading, HStack, IconButton, Input, Text, VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiUser } from 'react-icons/fi';
import { getSettings, saveSettings, getVideoConstraints, getAudioConstraints } from '@/lib/settings';

interface PreJoinScreenProps {
  userName: string;
  onUserNameChange: (name: string) => void;
  onJoin: (audioEnabled: boolean, videoEnabled: boolean) => void;
  roomId: string;
}

export default function PreJoinScreen({ userName, onUserNameChange, onJoin, roomId }: PreJoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [cameraError, setCameraError] = useState(false);

  const bgPrimary = useColorModeValue('#ffffff', '#1a1a1a');
  const bgSecondary = useColorModeValue('#f7f7f7', '#252525');
  const bgCard = useColorModeValue('#ffffff', '#2d2d2d');
  const textPrimary = useColorModeValue('#000000', '#ffffff');
  const textSecondary = useColorModeValue('#666666', '#999999');
  const borderColor = useColorModeValue('#e5e5e5', '#404040');
  const accentColor = '#00c853';

  useEffect(() => {
    const settings = getSettings();
    if (settings.userName && !userName) {
      onUserNameChange(settings.userName);
    }
  }, []);

  const handleNameChange = (name: string) => {
    onUserNameChange(name);
    saveSettings({ userName: name });
  };

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setHasStream(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const initPreview = async () => {
      try {
        const settings = getSettings();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: getVideoConstraints(settings.videoQuality),
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        setHasStream(true);
        setCameraError(false);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setCameraError(true);
        setVideoEnabled(false);
      }
    };
    initPreview();
    return () => { mounted = false; stopStream(); };
  }, [stopStream]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [hasStream]);

  const toggleAudio = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
      setVideoEnabled(!videoEnabled);
    }
  };

  const handleJoin = () => { stopStream(); onJoin(audioEnabled, videoEnabled); };

  return (
    <Box minH="100vh" bg={bgPrimary} display="flex" alignItems="center" justifyContent="center" p={4}>
      <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="center" maxW="1000px" w="100%">
        {/* Video Preview */}
        <Box flex={1} maxW="600px" w="100%">
          <Box position="relative" bg={bgSecondary} borderRadius="2xl" overflow="hidden" pb="56.25%">
            <Box position="absolute" inset={0}>
              {videoEnabled && hasStream && !cameraError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
              ) : (
                <Flex w="100%" h="100%" align="center" justify="center" bg={bgSecondary}>
                  <Box borderRadius="full" bg={borderColor} p={8}>
                    <FiUser size={48} color={textSecondary} />
                  </Box>
                </Flex>
              )}
            </Box>
            <Box position="absolute" bottom={4} left={4} bg="blackAlpha.700" px={3} py={1} borderRadius="lg">
              <Text color="white" fontSize="sm">{userName || 'Гость'}</Text>
            </Box>
          </Box>

          {/* Controls */}
          <HStack justify="center" mt={4} spacing={3}>
            <IconButton
              aria-label="Микрофон"
              icon={audioEnabled ? <FiMic size={20} /> : <FiMicOff size={20} />}
              bg={audioEnabled ? bgCard : 'red.500'}
              color={audioEnabled ? textPrimary : 'white'}
              border="1px solid"
              borderColor={audioEnabled ? borderColor : 'red.500'}
              onClick={toggleAudio}
              borderRadius="full"
              w="52px"
              h="52px"
              _hover={{ bg: audioEnabled ? bgSecondary : 'red.600' }}
            />
            <IconButton
              aria-label="Камера"
              icon={videoEnabled ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
              bg={videoEnabled ? bgCard : 'red.500'}
              color={videoEnabled ? textPrimary : 'white'}
              border="1px solid"
              borderColor={videoEnabled ? borderColor : 'red.500'}
              onClick={toggleVideo}
              borderRadius="full"
              w="52px"
              h="52px"
              isDisabled={cameraError}
              _hover={{ bg: videoEnabled ? bgSecondary : 'red.600' }}
            />
          </HStack>
        </Box>

        {/* Join Panel */}
        <VStack spacing={5} maxW="320px" w="100%" align="stretch">
          <Box textAlign="center" mb={2}>
            <Box as="img" src="/Floz.png" alt="FlozMeet" h="32px" mx="auto" mb={4} />
            <Heading size="lg" color={textPrimary} fontWeight="normal">Готовы?</Heading>
          </Box>

          <Text color={textSecondary} textAlign="center" fontSize="sm">
            Код: {roomId}
          </Text>

          <Input
            placeholder="Ваше имя"
            value={userName}
            onChange={(e) => handleNameChange(e.target.value)}
            bg={bgSecondary}
            border="none"
            color={textPrimary}
            size="lg"
            textAlign="center"
            borderRadius="xl"
            _placeholder={{ color: textSecondary }}
          />

          <Button
            bg={accentColor}
            color="black"
            size="lg"
            onClick={handleJoin}
            isDisabled={!userName.trim()}
            borderRadius="xl"
            h="48px"
            fontWeight="medium"
            _hover={{ bg: '#00a844' }}
            _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
          >
            Присоединиться
          </Button>
        </VStack>
      </Flex>
    </Box>
  );
}
