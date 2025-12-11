'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Icon, Text, HStack, Spinner, useColorModeValue } from '@chakra-ui/react';
import { FiMicOff, FiUser, FiMonitor } from 'react-icons/fi';

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isLarge?: boolean;
  isScreenShare?: boolean;
}

export default function VideoTile({
  stream,
  name,
  isLocal = false,
  audioEnabled = true,
  videoEnabled = true,
  isLarge = false,
  isScreenShare = false,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (videoRef.current) {
      if (stream) {
        setIsLoading(true);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.srcObject = null;
        setIsLoading(false);
      }
    }
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream && videoEnabled) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoEnabled, stream]);

  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#ea4335', '#00c853', '#34a853', '#4285f4', '#9334e6', '#e91e63'];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const avatarColor = colors[colorIndex];

  const bgTile = useColorModeValue('#e5e5e5', '#252525');
  const bgAvatar = useColorModeValue('#d0d0d0', '#3c4043');
  const showVideo = stream && (videoEnabled || isScreenShare);

  return (
    <Box
      position="relative"
      bg={bgTile}
      borderRadius="2xl"
      overflow="hidden"
      w="100%"
      h="100%"
      minH={isLarge ? { base: '300px', md: '400px', lg: '500px' } : { base: '180px', md: '200px' }}
    >
      {/* Loading spinner for screen share */}
      {isScreenShare && isLoading && stream && (
        <Flex
          position="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          align="center"
          justify="center"
          bg="#000"
          zIndex={2}
        >
          <Spinner size="xl" color="#00c853" thickness="4px" />
        </Flex>
      )}

      {/* Always render video to keep stream attached */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        onLoadedData={handleVideoLoaded}
        style={{
          width: '100%',
          height: '100%',
          objectFit: isScreenShare ? 'contain' : 'cover',
          transform: isLocal && !isScreenShare ? 'scaleX(-1)' : 'none',
          backgroundColor: isScreenShare ? '#000' : '#202124',
          display: showVideo ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      
      {/* Avatar when video is off */}
      {!showVideo && (
        <Flex w="100%" h="100%" align="center" justify="center" bg={bgAvatar}>
          <Flex
            borderRadius="full"
            bg={avatarColor}
            w={isLarge ? { base: '120px', md: '160px' } : { base: '80px', md: '100px' }}
            h={isLarge ? { base: '120px', md: '160px' } : { base: '80px', md: '100px' }}
            align="center"
            justify="center"
          >
            {initials ? (
              <Text fontSize={isLarge ? { base: '3xl', md: '5xl' } : { base: '2xl', md: '3xl' }} color="white" fontWeight="medium">
                {initials}
              </Text>
            ) : (
              <Icon as={FiUser} boxSize={isLarge ? 16 : 10} color="white" />
            )}
          </Flex>
        </Flex>
      )}

      {isScreenShare && (
        <HStack position="absolute" top={3} left={3} bg="#00c853" px={3} py={1} borderRadius="full" spacing={2}>
          <FiMonitor size={14} color="black" />
          <Text fontSize="xs" color="black" fontWeight="medium">Демонстрация</Text>
        </HStack>
      )}

      <HStack position="absolute" bottom={3} left={3} bg="blackAlpha.700" px={3} py={1.5} borderRadius="full" spacing={2}>
        {!audioEnabled && <Icon as={FiMicOff} boxSize={4} color="red.400" />}
        <Text fontSize="sm" color="white" fontWeight="medium">{name} {isLocal && '(Вы)'}</Text>
      </HStack>
    </Box>
  );
}
