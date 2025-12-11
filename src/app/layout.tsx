'use client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import theme from '@/theme';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <title>FlozMeet - Видеозвонки</title>
        <meta name="description" content="FlozMeet - качественные видеозвонки с Opus кодеком" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <ChakraProvider theme={theme}>{children}</ChakraProvider>
      </body>
    </html>
  );
}
