import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {SaasProvider} from '@saas-ui/react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SaasProvider>
      <App />
    </SaasProvider>
  </StrictMode>,
);
