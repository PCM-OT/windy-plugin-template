import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import { App } from './App';
import { AppDataProvider } from './data/AppData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { db, repo } from './data/instance';
import { ensurePersistence } from './pwa/storage';
import { registerServiceWorker } from './pwa/register';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary repo={repo} db={db}>
      <AppDataProvider repo={repo}>
        <App />
      </AppDataProvider>
    </ErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();

// Primeiro uso: pede armazenamento persistente e guarda o resultado (visível em Ajustes).
ensurePersistence(repo).catch((e: unknown) =>
  console.error('Armazenamento persistente:', e instanceof Error ? e.message : e),
);
