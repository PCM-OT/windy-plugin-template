import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import { Root } from './Root';
import { registerServiceWorker } from './pwa/register';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

registerServiceWorker();
