'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Button, Flex, Heading, HStack, Icon, Input, Text, VStack, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure,
  useColorMode, useColorModeValue, FormControl, FormLabel, ButtonGroup, IconButton,
  InputGroup, InputLeftElement,
} from '@chakra-ui/react';
import { 
  FiVideo, FiLink, FiSettings, FiHelpCircle, FiCopy, FiCheck, 
  FiMoon, FiSun, FiClock, FiTrash2, FiPhone, FiUsers, FiMessageCircle
} from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { getSettings, saveSettings, clearCallHistory, type AppSettings, type CallHistoryItem } from '@/lib/settings';

export default function HomePage() {
  const [settings, setSettings] = useState<AppSettings>({ userName: '', videoQuality: '1080p', theme: 'dark', callHistory: [] });
  const [joinCode, setJoinCode] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const router = useRouter();
  const toast = useToast();
  const { colorMode, setColorMode } = useColorMode();
  const { isOpen: isJoinOpen, onOpen: onJoinOpen, onClose: onJoinClose } = useDisclosure();
  const { isOpen: isLinkOpen, onOpen: onLinkOpen, onClose: onLinkClose } = useDisclosure();
  const { isOpen: isScheduleOpen, onOpen: onScheduleOpen, onClose: onScheduleClose } = useDisclosure();
  const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();

  // Theme colors
  const bgPrimary = useColorModeValue('#ffffff', '#1a1a1a');
  const bgSecondary = useColorModeValue('#f7f7f7', '#252525');
  const bgCard = useColorModeValue('#ffffff', '#2d2d2d');
  const bgCardHover = useColorModeValue('#f5f5f5', '#363636');
  const textPrimary = useColorModeValue('#000000', '#ffffff');
  const textSecondary = useColorModeValue('#666666', '#999999');
  const borderColor = useColorModeValue('#e5e5e5', '#404040');
  const accentColor = '#00c853';

  useEffect(() => {
    const stored = getSettings();
    setSettings(stored);
    if (stored.theme !== colorMode) {
      setColorMode(stored.theme);
    }
    // Set default date/time for scheduler
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setScheduledDate(now.toISOString().split('T')[0]);
    setScheduledTime(now.toTimeString().slice(0, 5));
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const updated = saveSettings(updates);
    setSettings(updated);
    if (updates.theme) {
      setColorMode(updates.theme);
    }
  };

  const createMeeting = () => {
    const roomId = uuidv4().slice(0, 10);
    router.push(`/room/${roomId}`);
  };

  const scheduleMeeting = () => {
    const code = uuidv4().slice(0, 10);
    setGeneratedLink(`${window.location.origin}/room/${code}`);
    setCopied(false);
    onScheduleClose();
    onLinkOpen();
    toast({ 
      title: 'Встреча запланирована', 
      description: `${scheduledDate} в ${scheduledTime}`,
      status: 'success', 
      duration: 3000 
    });
  };

  const joinMeeting = () => {
    if (!joinCode.trim()) {
      toast({ title: 'Введите код или ссылку', status: 'warning', duration: 2000 });
      return;
    }
    const code = joinCode.includes('/room/') ? joinCode.split('/room/')[1] : joinCode;
    router.push(`/room/${code}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ title: 'Скопировано', status: 'success', duration: 1500 });
  };

  const currentDay = new Date().getDate();

  return (
    <Box minH="100vh" bg={bgPrimary}>
      {/* Sidebar */}
      <Box
        position="fixed"
        left={0}
        top={0}
        bottom={0}
        w="64px"
        bg={bgPrimary}
        borderRight="1px solid"
        borderColor={borderColor}
        display={{ base: 'none', md: 'flex' }}
        flexDirection="column"
        alignItems="center"
        py={4}
        zIndex={100}
      >
        <Box mb={8} cursor="pointer" onClick={() => router.push('/')}>
          <Box as="img" src="/Floz.png" alt="FlozMeet" h="32px" w="auto" />
        </Box>

        <VStack spacing={2} flex={1}>
          <IconButton
            aria-label="Встречи"
            icon={<FiVideo size={20} />}
            variant="ghost"
            color={textPrimary}
            bg={bgSecondary}
            borderRadius="xl"
            w="44px"
            h="44px"
          />
          <IconButton
            aria-label="История"
            icon={<FiClock size={20} />}
            variant="ghost"
            color={textSecondary}
            borderRadius="xl"
            w="44px"
            h="44px"
            onClick={onHistoryOpen}
            _hover={{ bg: bgSecondary }}
          />
        </VStack>

        <VStack spacing={2}>
          <IconButton
            aria-label="Справка"
            icon={<FiHelpCircle size={20} />}
            variant="ghost"
            color={textSecondary}
            borderRadius="xl"
            w="44px"
            h="44px"
            onClick={onHelpOpen}
            _hover={{ bg: bgSecondary }}
          />
          <IconButton
            aria-label="Настройки"
            icon={<FiSettings size={20} />}
            variant="ghost"
            color={textSecondary}
            borderRadius="xl"
            w="44px"
            h="44px"
            onClick={onSettingsOpen}
            _hover={{ bg: bgSecondary }}
          />
        </VStack>
      </Box>

      {/* Mobile header */}
      <Flex 
        display={{ base: 'flex', md: 'none' }} 
        justify="space-between" 
        align="center" 
        p={4}
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <Box as="img" src="/Floz.png" alt="FlozMeet" h="28px" w="auto" />
        <HStack spacing={2}>
          <IconButton
            aria-label="История"
            icon={<FiClock size={18} />}
            variant="ghost"
            color={textSecondary}
            size="sm"
            onClick={onHistoryOpen}
          />
          <IconButton
            aria-label="Настройки"
            icon={<FiSettings size={18} />}
            variant="ghost"
            color={textSecondary}
            size="sm"
            onClick={onSettingsOpen}
          />
        </HStack>
      </Flex>

      {/* Main content */}
      <Box ml={{ base: 0, md: '64px' }} minH={{ base: 'calc(100vh - 60px)', md: '100vh' }} display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={10} p={4}>
          <Heading size="lg" color={textPrimary} fontWeight="normal" textAlign="center">
            FlozMeet — видеовстречи по ссылке
          </Heading>

          <Flex gap={4} flexWrap="wrap" justify="center">
            {/* Create meeting */}
            <Box
              bg={bgCard}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="2xl"
              p={8}
              w={{ base: '100%', sm: '240px' }}
              maxW="240px"
              h="200px"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ bg: bgCardHover, borderColor: textSecondary }}
              onClick={createMeeting}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
            >
              <Box 
                w="64px" 
                h="64px" 
                borderRadius="full" 
                border="2px solid"
                borderColor={textSecondary}
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={6}
              >
                <FiMessageCircle size={28} color={textSecondary} />
              </Box>
              <Text color={textPrimary} fontSize="md" fontWeight="medium">
                Создать видеовстречу
              </Text>
            </Box>

            <VStack spacing={4}>
              {/* Join */}
              <Box
                bg={bgCard}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="2xl"
                p={5}
                w={{ base: '100%', sm: '180px' }}
                maxW="180px"
                h="92px"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ bg: bgCardHover, borderColor: textSecondary }}
                onClick={onJoinOpen}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                <HStack spacing={-2} mb={2}>
                  <Box w="20px" h="20px" borderRadius="full" border="1.5px solid" borderColor={textSecondary} />
                  <Box w="20px" h="20px" borderRadius="full" border="1.5px solid" borderColor={textSecondary} bg={bgCard} />
                </HStack>
                <Text color={textPrimary} fontSize="sm" fontWeight="medium">Подключиться</Text>
              </Box>

              {/* Schedule */}
              <Box
                bg={bgCard}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="2xl"
                p={5}
                w={{ base: '100%', sm: '180px' }}
                maxW="180px"
                h="92px"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ bg: bgCardHover, borderColor: textSecondary }}
                onClick={onScheduleOpen}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                <Box border="1.5px solid" borderColor={textSecondary} borderRadius="md" px={2} py={1} mb={2}>
                  <Text color={textSecondary} fontSize="sm" fontWeight="bold">{currentDay}</Text>
                </Box>
                <Text color={textPrimary} fontSize="sm" fontWeight="medium">Запланировать</Text>
              </Box>
            </VStack>
          </Flex>
        </VStack>
      </Box>

      {/* Join Modal */}
      <Modal isOpen={isJoinOpen} onClose={onJoinClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4}>
          <ModalHeader color={textPrimary}>Подключиться к встрече</ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <InputGroup>
                <InputLeftElement><FiLink color={textSecondary} /></InputLeftElement>
                <Input
                  placeholder="Введите код или ссылку"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && joinMeeting()}
                  bg={bgSecondary}
                  border="none"
                  color={textPrimary}
                  borderRadius="xl"
                  _placeholder={{ color: textSecondary }}
                />
              </InputGroup>
              <Button w="100%" bg={accentColor} color="black" borderRadius="xl" h="44px" fontWeight="medium" onClick={joinMeeting} _hover={{ bg: '#00a844' }}>
                Подключиться
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Schedule Modal */}
      <Modal isOpen={isScheduleOpen} onClose={onScheduleClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4}>
          <ModalHeader color={textPrimary}>Запланировать встречу</ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color={textSecondary} fontSize="sm">Дата</FormLabel>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  bg={bgSecondary}
                  border="none"
                  color={textPrimary}
                  borderRadius="xl"
                />
              </FormControl>
              <FormControl>
                <FormLabel color={textSecondary} fontSize="sm">Время</FormLabel>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  bg={bgSecondary}
                  border="none"
                  color={textPrimary}
                  borderRadius="xl"
                />
              </FormControl>
              <Button w="100%" bg={accentColor} color="black" borderRadius="xl" h="44px" fontWeight="medium" onClick={scheduleMeeting} _hover={{ bg: '#00a844' }}>
                Создать ссылку
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Link Modal */}
      <Modal isOpen={isLinkOpen} onClose={onLinkClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4}>
          <ModalHeader color={textPrimary}>Ссылка создана</ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <HStack w="100%" bg={bgSecondary} p={3} borderRadius="xl" cursor="pointer" onClick={copyLink} _hover={{ bg: bgCardHover }}>
                <Text fontSize="sm" color={textSecondary} isTruncated flex={1}>{generatedLink}</Text>
                <Icon as={copied ? FiCheck : FiCopy} color={copied ? 'green.400' : textSecondary} />
              </HStack>
              <HStack w="100%" spacing={3}>
                <Button flex={1} bg={accentColor} color="black" borderRadius="xl" h="44px" fontWeight="medium" onClick={() => { onLinkClose(); router.push(`/room/${generatedLink.split('/room/')[1]}`); }} _hover={{ bg: '#00a844' }}>
                  Начать сейчас
                </Button>
                <Button flex={1} variant="outline" borderColor={borderColor} color={textPrimary} borderRadius="xl" h="44px" onClick={copyLink} _hover={{ bg: bgSecondary }}>
                  {copied ? 'Скопировано!' : 'Копировать'}
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Help Modal */}
      <Modal isOpen={isHelpOpen} onClose={onHelpClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4}>
          <ModalHeader color={textPrimary}>Справка</ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6}>
            <VStack align="start" spacing={3}>
              <Box><Text fontWeight="medium" color={textPrimary}>Создать встречу</Text><Text color={textSecondary} fontSize="sm">Нажмите карточку и поделитесь ссылкой</Text></Box>
              <Box><Text fontWeight="medium" color={textPrimary}>Подключиться</Text><Text color={textSecondary} fontSize="sm">Введите код или вставьте ссылку</Text></Box>
              <Box><Text fontWeight="medium" color={textPrimary}>Горячие клавиши</Text><Text color={textSecondary} fontSize="sm">Ctrl+D — микрофон, Ctrl+E — камера</Text></Box>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4}>
          <ModalHeader color={textPrimary}>Настройки</ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={5}>
              <FormControl>
                <FormLabel color={textPrimary} fontWeight="medium">Ваше имя</FormLabel>
                <Input value={settings.userName} onChange={(e) => updateSettings({ userName: e.target.value })} bg={bgSecondary} border="none" color={textPrimary} borderRadius="xl" placeholder="Введите имя" _placeholder={{ color: textSecondary }} />
              </FormControl>
              <FormControl>
                <FormLabel color={textPrimary} fontWeight="medium">Качество видео</FormLabel>
                <ButtonGroup size="sm" isAttached w="100%">
                  <Button flex={1} bg={settings.videoQuality === '720p' ? accentColor : 'transparent'} color={settings.videoQuality === '720p' ? 'black' : textSecondary} borderColor={borderColor} variant={settings.videoQuality === '720p' ? 'solid' : 'outline'} onClick={() => updateSettings({ videoQuality: '720p' })} _hover={{ bg: settings.videoQuality === '720p' ? '#00a844' : bgSecondary }}>720p</Button>
                  <Button flex={1} bg={settings.videoQuality === '1080p' ? accentColor : 'transparent'} color={settings.videoQuality === '1080p' ? 'black' : textSecondary} borderColor={borderColor} variant={settings.videoQuality === '1080p' ? 'solid' : 'outline'} onClick={() => updateSettings({ videoQuality: '1080p' })} _hover={{ bg: settings.videoQuality === '1080p' ? '#00a844' : bgSecondary }}>1080p</Button>
                </ButtonGroup>
              </FormControl>
              <FormControl>
                <FormLabel color={textPrimary} fontWeight="medium">Тема</FormLabel>
                <ButtonGroup size="sm" isAttached w="100%">
                  <Button flex={1} leftIcon={<FiSun />} bg={settings.theme === 'light' ? accentColor : 'transparent'} color={settings.theme === 'light' ? 'black' : textSecondary} borderColor={borderColor} variant={settings.theme === 'light' ? 'solid' : 'outline'} onClick={() => updateSettings({ theme: 'light' })} _hover={{ bg: settings.theme === 'light' ? '#00a844' : bgSecondary }}>Светлая</Button>
                  <Button flex={1} leftIcon={<FiMoon />} bg={settings.theme === 'dark' ? accentColor : 'transparent'} color={settings.theme === 'dark' ? 'black' : textSecondary} borderColor={borderColor} variant={settings.theme === 'dark' ? 'solid' : 'outline'} onClick={() => updateSettings({ theme: 'dark' })} _hover={{ bg: settings.theme === 'dark' ? '#00a844' : bgSecondary }}>Тёмная</Button>
                </ButtonGroup>
              </FormControl>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} isCentered size="md">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgCard} borderRadius="2xl" mx={4} maxH="70vh">
          <ModalHeader color={textPrimary}>
            <Flex justify="space-between" align="center">
              <Text>История</Text>
              {settings.callHistory.length > 0 && (
                <Button size="xs" variant="ghost" color="red.400" leftIcon={<FiTrash2 />} onClick={() => { clearCallHistory(); setSettings({ ...settings, callHistory: [] }); }}>Очистить</Button>
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton color={textSecondary} />
          <ModalBody pb={6} overflowY="auto">
            {settings.callHistory.length === 0 ? (
              <VStack py={8}><Icon as={FiPhone} boxSize={10} color={textSecondary} /><Text color={textSecondary} fontSize="sm">История пуста</Text></VStack>
            ) : (
              <VStack align="stretch" spacing={2}>
                {settings.callHistory.map((call: CallHistoryItem) => {
                  const d = new Date(call.date);
                  const isToday = new Date().toDateString() === d.toDateString();
                  return (
                    <HStack key={call.id} p={3} bg={bgSecondary} borderRadius="xl" cursor="pointer" _hover={{ bg: bgCardHover }} onClick={() => { onHistoryClose(); router.push(`/room/${call.roomId}`); }}>
                      <Box bg={accentColor} p={2} borderRadius="full"><FiVideo color="black" size={14} /></Box>
                      <VStack align="start" spacing={0} flex={1}>
                        <Text color={textPrimary} fontSize="sm">{call.roomName || 'Встреча'}</Text>
                        <Text color={textSecondary} fontSize="xs">{isToday ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</Text>
                      </VStack>
                    </HStack>
                  );
                })}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
