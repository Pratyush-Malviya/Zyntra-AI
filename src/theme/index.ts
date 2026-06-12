import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#eef2ff',
      100: '#dbe4ff',
      200: '#bac8ff',
      300: '#91a7ff',
      400: '#748ffc',
      500: '#2563eb',
      600: '#1d4ed8',
      700: '#1e40af',
      800: '#1e3a8a',
      900: '#172554',
    },
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#059669',
      600: '#047857',
      700: '#065f46',
      800: '#064e3b',
      900: '#022c22',
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, system-ui, sans-serif`,
    body: `'Inter', -apple-system, system-ui, sans-serif`,
  },
  styles: {
    global: {
      '::-webkit-scrollbar': {
        width: '6px',
      },
      '::-webkit-scrollbar-track': {
        bg: 'transparent',
      },
      '::-webkit-scrollbar-thumb': {
        bg: 'whiteAlpha.300',
        borderRadius: '3px',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

export default theme;
