import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#e3f2fd',
      100: '#bbdefb',
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#1a73e8',
      600: '#1565c0',
      700: '#0d47a1',
      800: '#0a3d91',
      900: '#072f70',
    },
  },
  semanticTokens: {
    colors: {
      'bg.primary': {
        default: '#ffffff',
        _dark: '#202124',
      },
      'bg.secondary': {
        default: '#f8f9fa',
        _dark: '#3c4043',
      },
      'bg.tertiary': {
        default: '#e8eaed',
        _dark: '#5f6368',
      },
      'text.primary': {
        default: '#202124',
        _dark: '#ffffff',
      },
      'text.secondary': {
        default: '#5f6368',
        _dark: '#9aa0a6',
      },
      'border.primary': {
        default: '#dadce0',
        _dark: 'whiteAlpha.200',
      },
    },
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? '#202124' : '#ffffff',
        color: props.colorMode === 'dark' ? 'white' : '#202124',
      },
    }),
  },
  components: {
    Button: {
      variants: {
        control: (props: { colorMode: string }) => ({
          borderRadius: 'full',
          w: '48px',
          h: '48px',
          bg: props.colorMode === 'dark' ? '#3c4043' : '#e8eaed',
          color: props.colorMode === 'dark' ? 'white' : '#202124',
          _hover: { 
            bg: props.colorMode === 'dark' ? '#5f6368' : '#dadce0',
          },
        }),
        controlActive: {
          borderRadius: 'full',
          w: '48px',
          h: '48px',
          bg: 'red.500',
          color: 'white',
          _hover: { bg: 'red.600' },
        },
        primary: {
          bg: 'brand.500',
          color: 'white',
          _hover: { bg: 'brand.600' },
        },
      },
    },
    Input: {
      variants: {
        filled: (props: { colorMode: string }) => ({
          field: {
            bg: props.colorMode === 'dark' ? '#3c4043' : '#f1f3f4',
            border: '1px solid',
            borderColor: props.colorMode === 'dark' ? 'transparent' : '#dadce0',
            _hover: {
              bg: props.colorMode === 'dark' ? '#3c4043' : '#e8eaed',
            },
            _focus: {
              bg: props.colorMode === 'dark' ? '#3c4043' : '#ffffff',
              borderColor: 'brand.500',
            },
          },
        }),
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Modal: {
      baseStyle: (props: { colorMode: string }) => ({
        dialog: {
          bg: props.colorMode === 'dark' ? '#3c4043' : '#ffffff',
        },
      }),
    },
    Menu: {
      baseStyle: (props: { colorMode: string }) => ({
        list: {
          bg: props.colorMode === 'dark' ? '#3c4043' : '#ffffff',
          borderColor: props.colorMode === 'dark' ? 'whiteAlpha.200' : '#dadce0',
        },
        item: {
          bg: props.colorMode === 'dark' ? '#3c4043' : '#ffffff',
          _hover: {
            bg: props.colorMode === 'dark' ? '#5f6368' : '#f1f3f4',
          },
        },
      }),
    },
  },
});

export default theme;
