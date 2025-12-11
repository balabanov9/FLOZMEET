'use client';
import {
  Box, Flex, IconButton, Text, VStack, Heading, HStack, Icon, Avatar, useColorModeValue,
} from '@chakra-ui/react';
import { FiX, FiMic, FiMicOff, FiVideo, FiVideoOff } from 'react-icons/fi';

interface Participant {
  id: string;
  name: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal?: boolean;
}

interface ParticipantsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
}

export default function ParticipantsPanel({ isOpen, onClose, participants }: ParticipantsPanelProps) {
  const bgPrimary = useColorModeValue('#ffffff', '#1a1a1a');
  const bgSecondary = useColorModeValue('#f7f7f7', '#252525');
  const textPrimary = useColorModeValue('#000000', '#ffffff');
  const textSecondary = useColorModeValue('#666666', '#999999');
  const borderColor = useColorModeValue('#e5e5e5', '#404040');

  if (!isOpen) return null;

  const getAvatarColor = (name: string) => {
    const colors = ['#ea4335', '#00c853', '#34a853', '#4285f4', '#9334e6', '#e91e63'];
    return colors[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];
  };

  return (
    <Box
      position="fixed"
      right={0}
      top={0}
      bottom="72px"
      w={{ base: '100%', md: '360px' }}
      bg={bgPrimary}
      borderLeft="1px solid"
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      zIndex={10}
    >
      <Flex justify="space-between" align="center" p={4} borderBottom="1px solid" borderColor={borderColor}>
        <Heading size="md" color={textPrimary} fontWeight="medium">Участники ({participants.length})</Heading>
        <IconButton aria-label="Закрыть" icon={<FiX />} variant="ghost" color={textSecondary} onClick={onClose} borderRadius="full" _hover={{ bg: bgSecondary }} />
      </Flex>

      <VStack flex={1} overflowY="auto" p={4} spacing={2} align="stretch">
        {participants.map((p) => (
          <HStack key={p.id} p={3} bg={bgSecondary} borderRadius="xl" justify="space-between">
            <HStack spacing={3}>
              <Avatar size="sm" name={p.name} bg={getAvatarColor(p.name)} color="white" />
              <Text color={textPrimary} fontSize="sm">
                {p.name}{p.isLocal && <Text as="span" color={textSecondary}> (Вы)</Text>}
              </Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={p.audioEnabled ? FiMic : FiMicOff} color={p.audioEnabled ? textSecondary : 'red.400'} boxSize={4} />
              <Icon as={p.videoEnabled ? FiVideo : FiVideoOff} color={p.videoEnabled ? textSecondary : 'red.400'} boxSize={4} />
            </HStack>
          </HStack>
        ))}
      </VStack>

      <Box p={4} borderTop="1px solid" borderColor={borderColor}>
        <Text color={textSecondary} fontSize="xs" textAlign="center">Поделитесь кодом встречи</Text>
      </Box>
    </Box>
  );
}
