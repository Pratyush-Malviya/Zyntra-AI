import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {SaasProvider} from '@saas-ui/react';
import {ChakraProvider, ColorModeScript} from '@chakra-ui/react';
import theme from './theme';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <SaasProvider>
        <App />
      </SaasProvider>
    </ChakraProvider>
  </StrictMode>,
);
