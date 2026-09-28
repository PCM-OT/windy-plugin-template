import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import { App } from './App';
import { AppDataProvider } from './data/AppData';
import { repo } from './data/instance';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider repo={repo}>
      <App />
    </AppDataProvider>
  </StrictMode>,
);
