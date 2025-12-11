'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Box, Flex, IconButton, Input, Text, VStack, Heading, useColorModeValue,
} from '@chakra-ui/react';
import { FiX, FiSend } from 'react-icons/fi';

interface Message {
  userName: string;
  message: string;
  timestamp: number;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({ isOpen, onClose, messages, onSendMessage }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bgPrimary = useColorModeValue('#ffffff', '#1a1a1a');
  const bgSecondary = useColorModeValue('#f7f7f7', '#252525');
  const textPrimary = useColorModeValue('#000000', '#ffffff');
  const textSecondary = useColorModeValue('#666666', '#999999');
  const borderColor = useColorModeValue('#e5e5e5', '#404040');
  const accentColor = '#00c853';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  if (!isOpen) return null;

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
        <Heading size="md" color={textPrimary} fontWeight="medium">Чат</Heading>
        <IconButton aria-label="Закрыть" icon={<FiX />} variant="ghost" color={textSecondary} onClick={onClose} borderRadius="full" _hover={{ bg: bgSecondary }} />
      </Flex>

      <VStack flex={1} overflowY="auto" p={4} spacing={3} align="stretch">
        {messages.length === 0 ? (
          <Text color={textSecondary} fontSize="sm" textAlign="center" py={8}>Сообщений пока нет</Text>
        ) : (
          messages.map((msg, idx) => (
            <Box key={idx} bg={bgSecondary} p={3} borderRadius="xl">
              <Text color={accentColor} fontSize="sm" fontWeight="medium">{msg.userName}</Text>
              <Text color={textPrimary} fontSize="sm">{msg.message}</Text>
              <Text color={textSecondary} fontSize="xs">{new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </VStack>

      <Flex p={4} gap={2} borderTop="1px solid" borderColor={borderColor}>
        <Input
          placeholder="Сообщение..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          bg={bgSecondary}
          border="none"
          color={textPrimary}
          borderRadius="xl"
          _placeholder={{ color: textSecondary }}
        />
        <IconButton
          aria-label="Отправить"
          icon={<FiSend />}
          bg={accentColor}
          color="black"
          borderRadius="full"
          onClick={handleSend}
          isDisabled={!newMessage.trim()}
          _hover={{ bg: '#00a844' }}
          _disabled={{ opacity: 0.5 }}
        />
      </Flex>
    </Box>
  );
}
