'use client';
import { useState } from 'react';
import { 
  Box, Flex, HStack, IconButton, Tooltip, Text,
  Popover, PopoverTrigger, PopoverContent, PopoverBody, SimpleGrid, Button,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, useColorModeValue, Input, InputGroup, InputRightElement,
} from '@chakra-ui/react';
import { 
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, 
  FiMessageSquare, FiUsers, FiMonitor, FiSmile, FiInfo, FiCopy, FiCheck
} from 'react-icons/fi';

interface ControlBarProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeave: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onReaction: (emoji: string) => void;
  meetingCode: string;
  participantCount: number;
}

const REACTIONS = ['👍', '👎', '😂', '😮', '😢', '👏', '🎉', '❤️', '🔥', '💯'];

export default function ControlBar({
  audioEnabled, videoEnabled, isScreenSharing,
  onToggleAudio, onToggleVideo, onToggleScreenShare, onLeave,
  onToggleChat, onToggleParticipants, onReaction,
  meetingCode, participantCount,
}: ControlBarProps) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { isOpen: isInfoOpen, onOpen: onInfoOpen, onClose: onInfoClose } = useDisclosure();
  
  const bgPrimary = useColorModeValue('#ffffff', '#1a1a1a');
  const bgSecondary = useColorModeValue('#f7f7f7', '#252525');
  const bgCard = useColorModeValue('#ffffff', '#2d2d2d');
  const textPrimary = useColorModeValue('#000000', '#ffffff');
  const textSecondary = useColorModeValue('#666666', '#999999');
  const borderColor = useColorModeValue('#e5e5e5', '#404040');
  const accentColor = '#00c853';

  const meetingLink = typeof window !== 'undefined' ? `${window.location.origin}/room/${meetingCode}` : '';

  const copyCode = () => { navigator.clipboard.writeText(meetingCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); };
  const copyLink = () => { navigator.clipboard.writeText(meetingLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); };

  return (
    <>
      <Box position="fixed" bottom={0} left={0} right={0} bg={bgPrimary} py={3} px={4} borderTop="1px solid" borderColor={borderColor} zIndex={100}>
        <Flex justify="space-between" align="center" maxW="100%">
          {/* Left - Time & Code */}
          <HStack spacing={3} minW="180px" display={{ base: 'none', md: 'flex' }}>
            <Text color={textPrimary} fontSize="sm">{new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text color={textSecondary}>|</Text>
            <HStack spacing={1} cursor="pointer" onClick={copyCode} _hover={{ color: textPrimary }}>
              <Text color={textSecondary} fontSize="sm" fontFamily="mono">{meetingCode.slice(0, 8)}</Text>
              {codeCopied ? <FiCheck size={12} color="#22c55e" /> : <FiCopy size={12} color={textSecondary} />}
            </HStack>
          </HStack>

          {/* Center - Controls */}
          <HStack spacing={2} justify="center" flex={1}>
            <Tooltip label={audioEnabled ? 'Выкл. микрофон (Ctrl+D)' : 'Вкл. микрофон'}>
              <IconButton
                aria-label="Микрофон"
                icon={audioEnabled ? <FiMic size={18} /> : <FiMicOff size={18} />}
                bg={audioEnabled ? bgSecondary : 'red.500'}
                color={audioEnabled ? textPrimary : 'white'}
                borderRadius="full"
                w="44px" h="44px"
                onClick={onToggleAudio}
                _hover={{ bg: audioEnabled ? borderColor : 'red.600' }}
              />
            </Tooltip>

            <Tooltip label={videoEnabled ? 'Выкл. камеру (Ctrl+E)' : 'Вкл. камеру'}>
              <IconButton
                aria-label="Камера"
                icon={videoEnabled ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
                bg={videoEnabled ? bgSecondary : 'red.500'}
                color={videoEnabled ? textPrimary : 'white'}
                borderRadius="full"
                w="44px" h="44px"
                onClick={onToggleVideo}
                _hover={{ bg: videoEnabled ? borderColor : 'red.600' }}
              />
            </Tooltip>

            <Tooltip label={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}>
              <IconButton
                aria-label="Демонстрация"
                icon={<FiMonitor size={18} />}
                bg={isScreenSharing ? accentColor : bgSecondary}
                color={isScreenSharing ? 'black' : textPrimary}
                borderRadius="full"
                w="44px" h="44px"
                onClick={onToggleScreenShare}
                _hover={{ bg: isScreenSharing ? '#00a844' : borderColor }}
              />
            </Tooltip>

            <Popover placement="top">
              <PopoverTrigger>
                <IconButton aria-label="Реакции" icon={<FiSmile size={18} />} bg={bgSecondary} color={textPrimary} borderRadius="full" w="44px" h="44px" _hover={{ bg: borderColor }} />
              </PopoverTrigger>
              <PopoverContent bg={bgCard} borderColor={borderColor} w="240px" borderRadius="xl">
                <PopoverBody p={3}>
                  <SimpleGrid columns={5} spacing={1}>
                    {REACTIONS.map((e) => (
                      <Button key={e} variant="ghost" fontSize="lg" p={1} h="auto" onClick={() => onReaction(e)} _hover={{ bg: bgSecondary, transform: 'scale(1.2)' }}>{e}</Button>
                    ))}
                  </SimpleGrid>
                </PopoverBody>
              </PopoverContent>
            </Popover>

            <Tooltip label="Завершить">
              <IconButton
                aria-label="Завершить"
                icon={<FiPhoneOff size={18} />}
                bg="red.500"
                color="white"
                borderRadius="full"
                w="52px" h="44px"
                onClick={onLeave}
                _hover={{ bg: 'red.600' }}
              />
            </Tooltip>
          </HStack>

          {/* Right - Panels */}
          <HStack spacing={1} minW="180px" justify="flex-end" display={{ base: 'none', md: 'flex' }}>
            <Tooltip label="Информация">
              <IconButton aria-label="Инфо" icon={<FiInfo size={18} />} variant="ghost" color={textSecondary} borderRadius="full" w="40px" h="40px" onClick={onInfoOpen} _hover={{ bg: bgSecondary }} />
            </Tooltip>
            <Tooltip label={`Участники (${participantCount})`}>
              <Box position="relative">
                <IconButton aria-label="Участники" icon={<FiUsers size={18} />} variant="ghost" color={textSecondary} borderRadius="full" w="40px" h="40px" onClick={onToggleParticipants} _hover={{ bg: bgSecondary }} />
                <Box position="absolute" top="-2px" right="-2px" bg={accentColor} color="black" fontSize="10px" fontWeight="bold" borderRadius="full" minW="16px" h="16px" display="flex" alignItems="center" justifyContent="center">{participantCount}</Box>
              </Box>
            </Tooltip>
            <Tooltip label="Чат">
              <IconButton aria-label="Чат" icon={<FiMessageSquare size={18} />} variant="ghost" color={textSecondary} borderRadius="full" w="40px" h="40px" onClick={onToggleChat} _hover={{ bg: bgSecondary }} />
            </Tooltip>
          </HStack>
        </Flex>
      </Box>

      {/* Info Modal */}
      <Modal isOpen={isInfoOpen} onClose={onInfoClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4}>
          <ModalHeader color={textPrimary}>Информация о встрече</ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6}>
            <Box mb={4}>
              <Text color={textSecondary} fontSize="sm" mb={2}>Ссылка</Text>
              <InputGroup>
                <Input value={meetingLink} readOnly bg={bgSecondary} border="none" color={textPrimary} fontSize="sm" borderRadius="xl" pr="3rem" />
                <InputRightElement>
                  <IconButton aria-label="Копировать" icon={linkCopied ? <FiCheck /> : <FiCopy />} size="sm" variant="ghost" color={linkCopied ? 'green.400' : textSecondary} onClick={copyLink} />
                </InputRightElement>
              </InputGroup>
            </Box>
            <Box>
              <Text color={textSecondary} fontSize="sm" mb={2}>Код</Text>
              <InputGroup>
                <Input value={meetingCode} readOnly bg={bgSecondary} border="none" color={textPrimary} fontSize="sm" fontFamily="mono" borderRadius="xl" pr="3rem" />
                <InputRightElement>
                  <IconButton aria-label="Копировать" icon={codeCopied ? <FiCheck /> : <FiCopy />} size="sm" variant="ghost" color={codeCopied ? 'green.400' : textSecondary} onClick={copyCode} />
                </InputRightElement>
              </InputGroup>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
