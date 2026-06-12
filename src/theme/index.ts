import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#e0f2ff',
      100: '#b3dbff',
      200: '#80c4ff',
      300: '#4dadff',
      400: '#1a96ff',
      500: '#0077e6',
      600: '#005cb3',
      700: '#004280',
      800: '#00284d',
      900: '#000e1a',
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, system-ui, sans-serif`,
    body: `'Inter', -apple-system, system-ui, sans-serif`,
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
